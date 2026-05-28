require 'rails_helper'

RSpec.describe Payment, type: :model do
  it { is_expected.to belong_to(:invoice) }
  it { is_expected.to validate_presence_of(:payment_date) }
  it { is_expected.to validate_presence_of(:method) }

  it 'delegates organization to its invoice' do
    org = create(:organization)
    invoice = create(:invoice, organization: org)
    payment = create(:payment, invoice: invoice)

    expect(payment.organization).to eq(org)
    expect(payment.organization_id).to eq(org.id)
  end
end
