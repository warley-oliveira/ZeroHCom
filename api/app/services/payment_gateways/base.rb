module PaymentGateways
  # Interface every payment gateway implements. Subclasses set METHOD (the
  # canonical method string persisted on Payment#method) and return a
  # ChargeResult from #charge!.
  class Base
    METHOD = nil

    # invoice:      the Invoice being paid
    # amount_cents: server-derived amount (never taken from the client)
    # reference:    human-readable payment reference shown to the payer
    def charge!(invoice:, amount_cents:, reference:)
      raise NotImplementedError, "#{self.class} must implement #charge!"
    end

    def method_name
      self.class::METHOD
    end
  end
end
