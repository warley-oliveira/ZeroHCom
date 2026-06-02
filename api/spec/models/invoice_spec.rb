require 'rails_helper'

RSpec.describe Invoice, type: :model do
  it { is_expected.to belong_to(:organization) }
  it { is_expected.to belong_to(:customer) }
  it { is_expected.to have_many(:payments) }
  it { is_expected.to validate_presence_of(:currency) }
  it { is_expected.to validate_presence_of(:issue_date) }
  it { is_expected.to validate_presence_of(:due_date) }

  it 'defines the expected status enum values' do
    expect(described_class.statuses.keys).to match_array(%w[draft open paid overdue cancelled])
  end

  it 'defines the expected kind enum values' do
    expect(described_class.kinds.keys).to match_array(%w[rent bond])
  end

  it 'defaults to the rent kind' do
    expect(create(:invoice).kind).to eq('rent')
  end

  describe '#payment_reference' do
    it 'derives a stable uppercase reference from the id' do
      invoice = create(:invoice)
      expect(invoice.payment_reference).to eq("INV-#{invoice.id.delete('-').first(8).upcase}")
    end
  end

  describe 'cross-tenant customer validation' do
    it 'is invalid when customer belongs to a different organization' do
      org_a = create(:organization)
      org_b = create(:organization)
      foreign_customer = create(:customer, organization: org_b)

      invoice = build(:invoice, organization: org_a, customer: foreign_customer)

      expect(invoice).not_to be_valid
      expect(invoice.errors[:customer]).to include('must belong to the same organization')
    end
  end

  describe 'monetize' do
    it 'exposes amount as a Money object backed by the currency column' do
      invoice = create(:invoice, amount_cents: 25_000, currency: 'AUD')
      expect(invoice.amount).to be_a(Money)
      expect(invoice.amount.cents).to eq(25_000)
      expect(invoice.amount.currency.iso_code).to eq('AUD')
    end
  end
end
