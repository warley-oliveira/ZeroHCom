require 'rails_helper'

RSpec.describe Billing::EnsureBondInvoiceService do
  let(:organization) { create(:organization) }

  it 'returns nil when the agreement requires no bond' do
    agreement = create(:agreement, organization: organization, bond_amount_cents: 0)

    expect {
      expect(described_class.call(agreement: agreement)).to be_nil
    }.not_to change(Invoice, :count)
  end

  it 'creates exactly one open bond invoice for the bond amount' do
    agreement = create(:agreement, :with_bond, organization: organization, bond_amount_cents: 100_000)

    invoice = nil
    expect { invoice = described_class.call(agreement: agreement) }.to change(Invoice, :count).by(1)

    expect(invoice.kind).to eq('bond')
    expect(invoice.status).to eq('open')
    expect(invoice.amount_cents).to eq(100_000)
    expect(invoice.customer).to eq(agreement.customer)
  end

  it 'is idempotent — a second call does not create another bond invoice' do
    agreement = create(:agreement, :with_bond, organization: organization)
    described_class.call(agreement: agreement)

    expect { described_class.call(agreement: agreement) }.not_to change(Invoice, :count)
  end

  it 'syncs an open bond invoice when the bond amount changes' do
    agreement = create(:agreement, :with_bond, organization: organization, bond_amount_cents: 100_000)
    described_class.call(agreement: agreement)

    agreement.update!(bond_amount_cents: 150_000)
    invoice = described_class.call(agreement: agreement)

    expect(invoice.amount_cents).to eq(150_000)
  end

  it 'never mutates a bond invoice that has already been paid' do
    agreement = create(:agreement, :with_bond, organization: organization, bond_amount_cents: 100_000)
    invoice = described_class.call(agreement: agreement)
    invoice.update!(status: 'paid')

    agreement.update!(bond_amount_cents: 150_000)
    described_class.call(agreement: agreement)

    expect(invoice.reload.amount_cents).to eq(100_000)
    expect(invoice.status).to eq('paid')
  end
end
