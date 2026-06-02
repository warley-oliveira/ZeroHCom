require 'rails_helper'

RSpec.describe 'Api::Public::Payments', type: :request do
  let(:organization) { create(:organization) }
  let(:customer)     { create(:customer, organization: organization) }

  def pay(token, invoice, method:)
    post "/api/public/portal/#{token}/invoices/#{invoice.id}/payments",
         params: { payment: { method: method } }.to_json,
         headers: { 'Content-Type' => 'application/json' }
  end

  describe 'POST /api/public/portal/:token/invoices/:invoice_id/payments' do
    let(:agreement) { create(:agreement, :with_asset, organization: organization, customer: customer) }
    let(:invoice)   { create(:invoice, organization: organization, customer: customer, agreement: agreement, amount_cents: 15_000, status: 'open') }

    context 'card (Stripe) — real-time gateway' do
      it 'settles immediately and posts to the ledger (no auth required)' do
        expect {
          pay(customer.portal_token, invoice, method: 'stripe')
        }.to change(Payment, :count).by(1).and change(Transaction, :count).by(1)

        expect(response).to have_http_status(:created)
        body = JSON.parse(response.body)
        expect(body).to include('method' => 'stripe', 'amount_cents' => 15_000, 'status' => 'succeeded')
        expect(invoice.reload.status).to eq('paid')
        expect(Payment.last.status).to eq('confirmed')
      end
    end

    context 'PayID / bank — push methods' do
      it 'records a PENDING claim without settling or posting to the ledger' do
        expect {
          pay(customer.portal_token, invoice, method: 'payid')
        }.to change { Payment.pending.count }.by(1).and change(Transaction, :count).by(0)

        expect(response).to have_http_status(:accepted)
        body = JSON.parse(response.body)
        expect(body).to include('method' => 'payid', 'status' => 'pending')
        expect(invoice.reload.status).to eq('open')
      end

      it 'rejects a second claim while one is already pending' do
        pay(customer.portal_token, invoice, method: 'payid')

        expect {
          pay(customer.portal_token, invoice, method: 'bank_transfer')
        }.not_to change(Payment, :count)

        expect(response).to have_http_status(:unprocessable_entity)
        expect(JSON.parse(response.body)).to eq('error' => 'payment_pending')
      end
    end

    it 'tags a settled bond payment with the "bond" ledger category' do
      bond = Billing::EnsureBondInvoiceService.call(agreement: create(:agreement, :with_bond, organization: organization, customer: customer))

      pay(customer.portal_token, bond, method: 'stripe')

      expect(response).to have_http_status(:created)
      expect(bond.reload.status).to eq('paid')
      expect(Transaction.last.category).to eq('bond')
    end

    it 'returns 422 for an unsupported payment method' do
      pay(customer.portal_token, invoice, method: 'bitcoin')

      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)).to eq('error' => 'unsupported_payment_method')
    end

    it 'returns 422 when the invoice is already paid (no double charge)' do
      invoice.update!(status: 'paid')

      expect {
        pay(customer.portal_token, invoice, method: 'stripe')
      }.not_to change(Payment, :count)

      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)).to eq('error' => 'invoice_not_payable')
    end

    it 'returns 404 when the invoice belongs to another customer' do
      other = create(:customer, organization: organization)
      other_invoice = create(:invoice, organization: organization, customer: other, status: 'open')

      expect {
        pay(customer.portal_token, other_invoice, method: 'stripe')
      }.not_to change(Payment, :count)

      expect(response).to have_http_status(:not_found)
    end

    it 'returns 404 for an invalid token' do
      pay('nope', invoice, method: 'stripe')
      expect(response).to have_http_status(:not_found)
    end
  end
end
