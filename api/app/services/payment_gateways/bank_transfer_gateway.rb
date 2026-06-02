module PaymentGateways
  # MOCK bank transfer gateway. Surfaces the destination account details and a
  # reference. Like PayID it's a push method, so "Já paguei" produces a
  # "pending" claim the organization confirms once the transfer is received.
  class BankTransferGateway < Base
    METHOD = "bank_transfer"

    def charge!(invoice:, amount_cents:, reference:)
      ChargeResult.new(
        status: "pending",
        external_id: "mock_bank_#{SecureRandom.hex(8)}",
        method: METHOD,
        amount_cents: amount_cents,
        currency: invoice.currency,
        instructions: {
          type: "bank_transfer",
          account_name: ENV.fetch("MOCK_BANK_ACCOUNT_NAME", "ZeroHCom Pty Ltd"),
          bsb: ENV.fetch("MOCK_BANK_BSB", "000-000"),
          account_number: ENV.fetch("MOCK_BANK_ACCOUNT_NUMBER", "12345678"),
          reference: reference,
          amount_cents: amount_cents,
          currency: invoice.currency
        }
      )
    end
  end
end
