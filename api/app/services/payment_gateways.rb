module PaymentGateways
  # Raised when a payment is attempted with a method that has no gateway.
  class UnknownGatewayError < StandardError; end

  # Maps the client-supplied `method` string to a gateway implementation.
  # Swapping a mock for a real provider later is a one-line change here —
  # controllers, serializers and the UI never branch on the provider.
  REGISTRY = {
    "stripe" => "PaymentGateways::StripeGateway",
    "payid" => "PaymentGateways::PayIdGateway",
    "bank_transfer" => "PaymentGateways::BankTransferGateway"
  }.freeze

  def self.for(method)
    class_name = REGISTRY[method.to_s]
    raise UnknownGatewayError, method.to_s if class_name.nil?

    class_name.constantize.new
  end

  def self.supported_methods
    REGISTRY.keys
  end
end
