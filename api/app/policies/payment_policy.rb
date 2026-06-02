# Inherits the base same-organization rules from ApplicationPolicy.
# Payment#organization_id is delegated to its invoice, so #same_org? works.
class PaymentPolicy < ApplicationPolicy
  # Reviewing a customer's pending claim is a same-org write, like update.
  def confirm? = same_org?
  def reject? = same_org?
end
