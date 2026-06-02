module Payments
  # Records a CONFIRMED payment against an invoice and feeds the financial
  # ledger. Used for immediate settlement: the org recording a payment by hand,
  # and the real-time card (Stripe) path on the public portal.
  #
  # Wrapped in a single DB transaction so the payment, the invoice status
  # change and the ledger entry are all-or-nothing.
  #
  #   Payments::ProcessPaymentService.call(
  #     invoice: invoice,
  #     payment_attributes: { amount_cents: 15_000, method: 'credit_card', payment_date: Time.current }
  #   )
  #
  # For the pending "Já paguei" (PayID/bank) flow, see how the public
  # PaymentsController creates a pending payment and Payments::ConfirmPaymentService.
  class ProcessPaymentService
    Result = Struct.new(:payment, :transaction, :invoice, keyword_init: true)

    def self.call(**kwargs)
      new(**kwargs).call
    end

    def initialize(invoice:, payment_attributes:, category: nil)
      @invoice = invoice
      @payment_attributes = payment_attributes
      @category = category
    end

    def call
      ActiveRecord::Base.transaction do
        payment = create_payment!
        Settlement.settle_invoice_if_fully_paid!(@invoice)
        ledger_entry = Settlement.record_income!(@invoice, payment, @category)

        Result.new(payment: payment, transaction: ledger_entry, invoice: @invoice)
      end
    end

    private

    def create_payment!
      payment = @invoice.payments.new(@payment_attributes)
      payment.status = "confirmed"
      payment.save!
      payment
    end
  end
end
