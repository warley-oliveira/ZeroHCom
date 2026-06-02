module PaymentGateways
  # Uniform return type for every gateway, so the controller never needs to
  # know which provider ran.
  #
  #   status: "succeeded" (settled now) | "pending" (push method awaiting
  #           out-of-band confirmation) | "failed"
  #
  # For the MVP every mock returns "succeeded" so the portal loop completes
  # (bond flips to paid, invoice moves to history). The "pending" path is the
  # extension point for real async providers (PayID / bank webhooks).
  ChargeResult = Struct.new(
    :status, :external_id, :method, :amount_cents, :currency, :instructions,
    keyword_init: true
  ) do
    def succeeded?
      status == "succeeded"
    end

    def requires_action?
      status == "pending"
    end

    def failed?
      status == "failed"
    end
  end
end
