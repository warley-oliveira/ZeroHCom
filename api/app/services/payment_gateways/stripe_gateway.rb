module PaymentGateways
  # MOCK Stripe card gateway. Settles immediately with a fake charge id.
  # Replace #charge! with a real Stripe::PaymentIntent call later — the
  # ChargeResult contract stays the same.
  class StripeGateway < Base
    METHOD = "stripe"

    def charge!(invoice:, amount_cents:, reference:)
      ChargeResult.new(
        status: "succeeded",
        external_id: "mock_ch_#{SecureRandom.hex(10)}",
        method: METHOD,
        amount_cents: amount_cents,
        currency: invoice.currency,
        instructions: nil
      )
    end
  end
end
