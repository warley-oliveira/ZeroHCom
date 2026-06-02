module Api
  module V1
    class PaymentsController < BaseController
      # POST /api/v1/invoices/:invoice_id/payments
      def create
        # Authorize a standalone instance (not pushed into invoice.payments, which
        # would get autosaved on the invoice update inside the service).
        authorize Payment.new(invoice: invoice)

        result = Payments::ProcessPaymentService.call(invoice: invoice, payment_attributes: payment_params)
        render json: PaymentSerializer.render(result.payment), status: :created
      rescue ActiveRecord::RecordInvalid => e
        render json: { errors: e.record.errors }, status: :unprocessable_entity
      end

      # POST /api/v1/invoices/:invoice_id/payments/:id/confirm
      # Approves a pending customer claim (PayID/bank): settles + posts to the ledger.
      def confirm
        authorize payment
        Payments::ConfirmPaymentService.call(payment: payment, category: invoice.bond? ? "bond" : nil)
        render json: PaymentSerializer.render(payment.reload)
      rescue ArgumentError
        render json: { error: "payment_not_pending" }, status: :unprocessable_entity
      end

      # POST /api/v1/invoices/:invoice_id/payments/:id/reject
      # Dismisses a pending claim; the invoice stays payable.
      def reject
        authorize payment
        return render json: { error: "payment_not_pending" }, status: :unprocessable_entity unless payment.pending?

        payment.update!(status: "rejected")
        render json: PaymentSerializer.render(payment)
      end

      private

      # Scoped through the current organization, so a payment can never be
      # attached to another tenant's invoice (404 instead of leaking data).
      def invoice
        @invoice ||= Current.organization.invoices.find(params[:invoice_id])
      end

      def payment
        @payment ||= invoice.payments.find(params[:id])
      end

      def payment_params
        params.require(:payment).permit(:method, :payment_date, :amount_cents, :currency, :external_id)
      end
    end
  end
end
