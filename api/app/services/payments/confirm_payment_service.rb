module Payments
  # Confirms a pending payment claim (PayID/bank "Já paguei") after the org has
  # verified the money actually arrived: marks it confirmed, settles the invoice
  # if it's now fully covered, and posts the income ledger entry.
  #
  #   Payments::ConfirmPaymentService.call(payment: payment, category: "bond")
  class ConfirmPaymentService
    Result = Struct.new(:payment, :transaction, :invoice, keyword_init: true)

    def self.call(**kwargs)
      new(**kwargs).call
    end

    def initialize(payment:, category: nil)
      @payment = payment
      @category = category
    end

    def call
      raise ArgumentError, "payment is not pending" unless @payment.pending?

      invoice = @payment.invoice
      ActiveRecord::Base.transaction do
        @payment.update!(status: "confirmed")
        Settlement.settle_invoice_if_fully_paid!(invoice)
        ledger_entry = Settlement.record_income!(invoice, @payment, @category)

        Result.new(payment: @payment, transaction: ledger_entry, invoice: invoice)
      end
    end
  end
end
