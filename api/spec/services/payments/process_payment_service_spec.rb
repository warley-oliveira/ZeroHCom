require 'rails_helper'

RSpec.describe Payments::ProcessPaymentService do
  let(:organization) { create(:organization) }
  let(:customer)     { create(:customer, organization: organization) }
  let(:invoice) do
    create(:invoice,
           organization: organization,
           customer: customer,
           amount_cents: 15_000,
           currency: 'AUD',
           status: 'open')
  end

  let(:payment_attributes) do
    { amount_cents: 15_000, method: 'credit_card', payment_date: Time.zone.parse('2026-05-29T10:00:00Z') }
  end

  subject(:result) do
    described_class.call(invoice: invoice, payment_attributes: payment_attributes)
  end

  describe 'creating the payment' do
    it 'creates a payment associated with the invoice' do
      expect { result }.to change(Payment, :count).by(1)
      expect(result.payment.invoice).to eq(invoice)
      expect(result.payment.amount_cents).to eq(15_000)
      expect(result.payment.method).to eq('credit_card')
      expect(result.payment.status).to eq('confirmed')
    end
  end

  describe 'invoice status' do
    it 'marks the invoice as paid when payments cover the total' do
      result
      expect(invoice.reload.status).to eq('paid')
    end

    it 'keeps the invoice open when the payment is partial' do
      described_class.call(invoice: invoice, payment_attributes: payment_attributes.merge(amount_cents: 5_000))
      expect(invoice.reload.status).to eq('open')
    end

    it 'marks the invoice as paid once cumulative partial payments settle it' do
      described_class.call(invoice: invoice, payment_attributes: payment_attributes.merge(amount_cents: 9_000))
      expect(invoice.reload.status).to eq('open')

      described_class.call(invoice: invoice, payment_attributes: payment_attributes.merge(amount_cents: 6_000))
      expect(invoice.reload.status).to eq('paid')
    end
  end

  describe 'the ledger entry (the magic)' do
    it 'records a Transaction with the exact amount, currency and date' do
      expect { result }.to change(Transaction, :count).by(1)

      ledger = result.transaction
      expect(ledger.amount_cents).to eq(15_000)
      expect(ledger.currency).to eq('AUD')
      expect(ledger.direction).to eq('income')
      expect(ledger.category).to eq('car_rental')
      expect(ledger.date).to eq(payment_attributes[:payment_date])
      expect(ledger.organization).to eq(organization)
    end

    it 'points the polymorphic source to the created payment' do
      ledger = result.transaction
      expect(ledger.source).to eq(result.payment)
      expect(ledger.source_type).to eq('Payment')
      expect(ledger.source_id).to eq(result.payment.id)
    end

    it 'attributes the income to the rented car (asset) via the agreement' do
      asset = create(:asset, organization: organization)
      agreement = create(:agreement, organization: organization, customer: customer, asset: asset)
      rental_invoice = create(:invoice,
                              organization: organization,
                              customer: customer,
                              agreement: agreement,
                              amount_cents: 15_000,
                              currency: 'AUD',
                              status: 'open')

      result = described_class.call(invoice: rental_invoice, payment_attributes: payment_attributes)

      expect(result.transaction.asset).to eq(asset)
      expect(result.transaction.category).to eq('car_rental')
    end

    it 'accepts a custom category (e.g. derived from contract type)' do
      result = described_class.call(
        invoice: invoice,
        payment_attributes: payment_attributes,
        category: 'rental_income'
      )
      expect(result.transaction.category).to eq('rental_income')
    end
  end

  describe 'atomicity' do
    it 'rolls back the payment and the ledger entry when the payment is invalid' do
      expect {
        described_class.call(invoice: invoice, payment_attributes: payment_attributes.merge(method: nil))
      }.to raise_error(ActiveRecord::RecordInvalid)

      expect(Payment.count).to eq(0)
      expect(Transaction.count).to eq(0)
      expect(invoice.reload.status).to eq('open')
    end
  end
end
