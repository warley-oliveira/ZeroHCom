require 'rails_helper'

RSpec.describe PaymentPolicy, type: :policy do
  subject { described_class.new(user, payment) }

  let(:org_a) { create(:organization) }
  let(:org_b) { create(:organization) }
  let(:user)  { create(:user, organization: org_a) }

  context 'when the payment belongs to the same organization' do
    # Payment#organization_id is delegated from its invoice.
    let(:payment) { create(:payment, invoice: create(:invoice, organization: org_a)) }

    it { is_expected.to permit_create_actions }
  end

  context 'when the payment belongs to another organization' do
    let(:payment) { create(:payment, invoice: create(:invoice, organization: org_b)) }

    it { is_expected.to forbid_create_actions }
  end

  # Lightweight matchers — avoid a dependency on pundit-matchers.
  matcher :permit_create_actions do
    match { |policy| policy.create? && policy.show? && policy.update? && policy.destroy? }
  end

  matcher :forbid_create_actions do
    match { |policy| !policy.create? && !policy.show? && !policy.update? && !policy.destroy? }
  end
end
