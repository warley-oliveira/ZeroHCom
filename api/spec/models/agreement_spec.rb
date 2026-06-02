require 'rails_helper'

RSpec.describe Agreement, type: :model do
  it { is_expected.to belong_to(:organization) }
  it { is_expected.to belong_to(:customer) }
  it { is_expected.to belong_to(:asset).optional }
  it { is_expected.to have_many(:invoices) }
  it { is_expected.to validate_presence_of(:currency) }

  it 'defines the expected status enum values' do
    expect(described_class.statuses.keys).to match_array(%w[active cancelled paused])
  end

  describe 'cross-tenant validations' do
    let(:org_a) { create(:organization) }
    let(:org_b) { create(:organization) }

    it 'is invalid when the customer belongs to a different organization' do
      foreign_customer = create(:customer, organization: org_b)
      agreement = build(:agreement, organization: org_a, customer: foreign_customer)

      expect(agreement).not_to be_valid
      expect(agreement.errors[:customer]).to include('must belong to the same organization')
    end

    it 'is invalid when the asset belongs to a different organization' do
      foreign_asset = create(:asset, organization: org_b)
      agreement = build(:agreement, organization: org_a, asset: foreign_asset)

      expect(agreement).not_to be_valid
      expect(agreement.errors[:asset]).to include('must belong to the same organization')
    end
  end

  describe 'monetize' do
    it 'exposes amount as a Money object backed by the currency column' do
      agreement = create(:agreement, amount_cents: 50_000, currency: 'AUD')
      expect(agreement.amount).to be_a(Money)
      expect(agreement.amount.cents).to eq(50_000)
      expect(agreement.amount.currency.iso_code).to eq('AUD')
    end

    it 'exposes bond_amount as a Money object in the agreement currency' do
      agreement = create(:agreement, :with_bond, bond_amount_cents: 100_000, currency: 'AUD')
      expect(agreement.bond_amount).to be_a(Money)
      expect(agreement.bond_amount.cents).to eq(100_000)
    end
  end

  describe 'bond helpers' do
    it 'is not bond_required when bond_amount_cents is zero' do
      expect(build(:agreement, bond_amount_cents: 0).bond_required?).to be(false)
    end

    it 'is bond_required when bond_amount_cents is positive' do
      expect(build(:agreement, :with_bond).bond_required?).to be(true)
    end

    it 'is not bond_paid while the bond invoice is open' do
      agreement = create(:agreement, :with_bond)
      create(:invoice, :bond, organization: agreement.organization,
                              customer: agreement.customer, agreement: agreement, status: 'open')
      expect(agreement.bond_paid?).to be(false)
    end

    it 'is bond_paid once the bond invoice is paid' do
      agreement = create(:agreement, :with_bond)
      create(:invoice, :bond, organization: agreement.organization,
                              customer: agreement.customer, agreement: agreement, status: 'paid')
      expect(agreement.bond_paid?).to be(true)
    end
  end
end
