module Api
  module Public
    class PaymentsController < BaseController
      # POST /api/public/portal/:token/invoices/:invoice_id/payments
      def create
        return render_not_payable unless invoice.open? || invoice.overdue?
        return render_pending_exists if invoice.payments.pending.exists?

        gateway = PaymentGateways.for(payment_method)
        charge = gateway.charge!(
          invoice: invoice,
          amount_cents: invoice.amount_cents,
          reference: invoice.payment_reference
        )

        payment = charge.succeeded? ? settle_now(charge) : record_pending_claim(charge)
        status = charge.succeeded? ? :created : :accepted
        render json: ReceiptSerializer.render(payment, invoice), status: status
      rescue PaymentGateways::UnknownGatewayError
        render json: { error: "unsupported_payment_method" }, status: :unprocessable_entity
      rescue ActiveRecord::RecordInvalid => e
        render json: { errors: e.record.errors }, status: :unprocessable_entity
      end

      private

      # Real-time gateway (card): record a confirmed payment and settle now.
      def settle_now(charge)
        Payments::ProcessPaymentService.call(
          invoice: invoice,
          payment_attributes: payment_attributes(charge),
          category: invoice.bond? ? "bond" : nil
        ).payment
      end

      # Push method (PayID/bank): record a pending claim for the org to review.
      # No settlement and no ledger entry until confirmed.
      def record_pending_claim(charge)
        invoice.payments.create!(payment_attributes(charge).merge(status: "pending"))
      end

      def payment_attributes(charge)
        {
          method: charge.method,
          external_id: charge.external_id,
          # Amount/currency are server-derived from the invoice (anti-tampering).
          amount_cents: invoice.amount_cents,
          currency: invoice.currency,
          payment_date: Time.current
        }
      end

      # Scoped to THIS customer: a token for customer A can never pay customer
      # B's invoice (→ 404 instead of leaking data).
      def invoice
        @invoice ||= current_customer.invoices.find(params[:invoice_id])
      end

      def payment_method
        params.require(:payment).fetch(:method)
      end

      def render_not_payable
        render json: { error: "invoice_not_payable" }, status: :unprocessable_entity
      end

      def render_pending_exists
        render json: { error: "payment_pending" }, status: :unprocessable_entity
      end
    end
  end
end
