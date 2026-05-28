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
end
