module PaymentGateways
  # MOCK PayID (Australia) gateway. PayID is a bank-push method: the payer
  # transfers from their banking app, so the money cannot be confirmed at the
  # moment they tap "Já paguei". We return "pending" — the payment is recorded
  # as a claim and the organization confirms it once the funds land.
  class PayIdGateway < Base
    METHOD = "payid"

    def charge!(invoice:, amount_cents:, reference:)
      identifier = ENV.fetch("MOCK_PAYID_IDENTIFIER", "payments@example.com.au")

      ChargeResult.new(
        status: "pending",
        external_id: "mock_payid_#{SecureRandom.hex(8)}",
        method: METHOD,
        amount_cents: amount_cents,
        currency: invoice.currency,
        instructions: {
          type: "payid",
          payid: identifier,
          reference: reference,
          qr: "payid://#{identifier}?amount=#{format('%.2f', amount_cents / 100.0)}&reference=#{reference}",
          amount_cents: amount_cents,
          currency: invoice.currency
        }
      )
    end
  end
end
