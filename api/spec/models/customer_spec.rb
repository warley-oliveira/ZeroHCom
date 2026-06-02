require 'rails_helper'

RSpec.describe Customer, type: :model do
  it { is_expected.to belong_to(:organization) }
  it { is_expected.to have_many(:invoices) }
  it { is_expected.to validate_presence_of(:name) }

  describe 'email format' do
    it 'allows blank email' do
      customer = build(:customer, email: '')
      expect(customer).to be_valid
    end

    it 'rejects malformed email' do
      customer = build(:customer, email: 'not-an-email')
      expect(customer).not_to be_valid
      expect(customer.errors[:email]).to be_present
    end
  end

  describe 'portal token' do
    it 'auto-generates a portal_token on create' do
      customer = create(:customer)
      expect(customer.portal_token).to be_present
    end

    it 'generates a unique token per customer' do
      a = create(:customer)
      b = create(:customer)
      expect(a.portal_token).not_to eq(b.portal_token)
    end

    it 'rotates the token via #regenerate_portal_token' do
      customer = create(:customer)
      old = customer.portal_token

      customer.regenerate_portal_token

      expect(customer.portal_token).to be_present
      expect(customer.portal_token).not_to eq(old)
      expect(customer.reload.portal_token).not_to eq(old)
    end

    it 'exposes a portal_url built from the token' do
      customer = create(:customer)
      expect(customer.portal_url).to eq("/portal/#{customer.portal_token}")
    end
  end
end
