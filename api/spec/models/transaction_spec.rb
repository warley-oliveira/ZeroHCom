require 'rails_helper'

RSpec.describe Transaction, type: :model do
  it { is_expected.to belong_to(:organization) }
  it { is_expected.to belong_to(:source).optional }
  it { is_expected.to validate_presence_of(:currency) }
  it { is_expected.to validate_presence_of(:category) }
  it { is_expected.to validate_presence_of(:date) }

  it 'defines the expected direction enum values' do
    expect(described_class.directions.keys).to match_array(%w[income expense])
  end

  it 'supports a polymorphic source' do
    asset = create(:asset)
    transaction = create(:transaction, organization: asset.organization, source: asset)
    expect(transaction.reload.source).to eq(asset)
  end

  describe 'monetize' do
    it 'exposes amount as a Money object backed by the currency column' do
      transaction = create(:transaction, amount_cents: 12_500, currency: 'AUD')
      expect(transaction.amount).to be_a(Money)
      expect(transaction.amount.cents).to eq(12_500)
    end
  end
end
