require 'rails_helper'

RSpec.describe Payments::ConfirmPaymentService do
  let(:organization) { create(:organization) }
  let(:customer)     { create(:customer, organization: organization) }
  let(:invoice) do
    create(:invoice, organization: organization, customer: customer, amount_cents: 15_000, currency: 'AUD', status: 'open')
  end
  let(:payment) do
    create(:payment, :pending, invoice: invoice, amount_cents: 15_000, currency: 'AUD')
  end

  it 'confirms the payment, settles the invoice and posts the ledger entry' do
    expect {
      described_class.call(payment: payment)
    }.to change(Transaction, :count).by(1)

    expect(payment.reload.status).to eq('confirmed')
    expect(invoice.reload.status).to eq('paid')
    expect(Transaction.last.direction).to eq('income')
  end

  it 'passes a custom category through to the ledger' do
    described_class.call(payment: payment, category: 'bond')
    expect(Transaction.last.category).to eq('bond')
  end

  it 'raises when the payment is not pending' do
    confirmed = create(:payment, invoice: invoice)
    expect { described_class.call(payment: confirmed) }.to raise_error(ArgumentError)
  end

  it 'leaves the invoice open when the confirmed amount is still partial' do
    partial = create(:payment, :pending, invoice: invoice, amount_cents: 5_000)
    described_class.call(payment: partial)
    expect(invoice.reload.status).to eq('open')
  end
end
