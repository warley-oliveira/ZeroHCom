require 'rails_helper'

RSpec.describe PaymentGateways do
  describe '.for' do
    it 'resolves the Stripe gateway' do
      expect(described_class.for('stripe')).to be_a(PaymentGateways::StripeGateway)
    end

    it 'resolves the PayID gateway' do
      expect(described_class.for('payid')).to be_a(PaymentGateways::PayIdGateway)
    end

    it 'resolves the bank transfer gateway' do
      expect(described_class.for('bank_transfer')).to be_a(PaymentGateways::BankTransferGateway)
    end

    it 'raises UnknownGatewayError for an unsupported method' do
      expect { described_class.for('paypal') }.to raise_error(PaymentGateways::UnknownGatewayError)
    end
  end

  describe '.supported_methods' do
    it 'lists the registered methods' do
      expect(described_class.supported_methods).to match_array(%w[stripe payid bank_transfer])
    end
  end

  describe 'gateway charge contracts' do
    let(:invoice) { build(:invoice, amount_cents: 100_000, currency: 'AUD') }

    it 'StripeGateway settles immediately with a charge id' do
      result = PaymentGateways::StripeGateway.new.charge!(invoice: invoice, amount_cents: 100_000, reference: 'INV-ABC')

      expect(result).to be_succeeded
      expect(result.method).to eq('stripe')
      expect(result.external_id).to start_with('mock_ch_')
      expect(result.amount_cents).to eq(100_000)
      expect(result.currency).to eq('AUD')
    end

    it 'PayIdGateway returns a pending claim with PayID transfer instructions' do
      result = PaymentGateways::PayIdGateway.new.charge!(invoice: invoice, amount_cents: 100_000, reference: 'INV-ABC')

      expect(result).to be_requires_action
      expect(result.method).to eq('payid')
      expect(result.instructions).to include(type: 'payid', reference: 'INV-ABC')
      expect(result.instructions[:payid]).to be_present
      expect(result.instructions[:qr]).to include('payid://')
    end

    it 'BankTransferGateway returns a pending claim with bank account instructions' do
      result = PaymentGateways::BankTransferGateway.new.charge!(invoice: invoice, amount_cents: 100_000, reference: 'INV-ABC')

      expect(result).to be_requires_action
      expect(result.method).to eq('bank_transfer')
      expect(result.instructions).to include(type: 'bank_transfer', reference: 'INV-ABC')
      expect(result.instructions[:bsb]).to be_present
      expect(result.instructions[:account_number]).to be_present
    end
  end
end
