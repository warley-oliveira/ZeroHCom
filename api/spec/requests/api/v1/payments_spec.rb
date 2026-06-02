require 'rails_helper'

RSpec.describe 'Api::V1::Payments', type: :request do
  let(:org_a)  { create(:organization) }
  let(:org_b)  { create(:organization) }
  let(:user_a) { create(:user, organization: org_a) }

  describe 'POST /api/v1/invoices/:invoice_id/payments' do
    let(:invoice_a) { create(:invoice, organization: org_a) }
    let(:valid_params) do
      {
        payment: {
          method: 'credit_card',
          payment_date: Time.current.iso8601,
          amount_cents: 15_000,
          currency: 'AUD'
        }
      }
    end

    context 'when unauthenticated' do
      it 'returns 401' do
        post "/api/v1/invoices/#{invoice_a.id}/payments", params: valid_params
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'when authenticated' do
      it 'creates a payment on an invoice in the current tenant' do
        expect {
          post "/api/v1/invoices/#{invoice_a.id}/payments",
               params: valid_params.to_json,
               headers: auth_headers(user_a).merge('Content-Type' => 'application/json')
        }.to change(Payment, :count).by(1)

        expect(response).to have_http_status(:created)
        body = JSON.parse(response.body)
        expect(body).to include(
          'invoice_id' => invoice_a.id,
          'method' => 'credit_card',
          'amount_cents' => 15_000,
          'amount_formatted' => '150.00',
          'currency' => 'AUD'
        )
      end

      it 'returns 404 when the invoice belongs to another tenant (scoping intact)' do
        invoice_b = create(:invoice, organization: org_b)

        expect {
          post "/api/v1/invoices/#{invoice_b.id}/payments",
               params: valid_params.to_json,
               headers: auth_headers(user_a).merge('Content-Type' => 'application/json')
        }.not_to change(Payment, :count)

        expect(response).to have_http_status(:not_found)
        expect(JSON.parse(response.body)).to eq('error' => 'not_found')
      end

      it 'returns 422 when required fields are missing' do
        post "/api/v1/invoices/#{invoice_a.id}/payments",
             params: { payment: valid_params[:payment].merge(method: '', payment_date: '') }.to_json,
             headers: auth_headers(user_a).merge('Content-Type' => 'application/json')

        expect(response).to have_http_status(:unprocessable_entity)
        errors = JSON.parse(response.body)['errors']
        expect(errors).to have_key('method')
        expect(errors).to have_key('payment_date')
      end
    end
  end

  describe 'POST /api/v1/invoices/:invoice_id/payments/:id/confirm' do
    let(:invoice) { create(:invoice, organization: org_a, amount_cents: 15_000, status: 'open') }
    let(:payment) { create(:payment, :pending, invoice: invoice, amount_cents: 15_000) }

    it 'confirms a pending claim, settling the invoice and posting the ledger entry' do
      expect {
        post "/api/v1/invoices/#{invoice.id}/payments/#{payment.id}/confirm", headers: auth_headers(user_a)
      }.to change(Transaction, :count).by(1)

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)).to include('status' => 'confirmed')
      expect(invoice.reload.status).to eq('paid')
    end

    it 'returns 422 when the payment is not pending' do
      confirmed = create(:payment, invoice: invoice)
      post "/api/v1/invoices/#{invoice.id}/payments/#{confirmed.id}/confirm", headers: auth_headers(user_a)
      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)).to eq('error' => 'payment_not_pending')
    end

    it 'returns 404 across tenants' do
      foreign = create(:invoice, organization: org_b, status: 'open')
      foreign_payment = create(:payment, :pending, invoice: foreign)
      post "/api/v1/invoices/#{foreign.id}/payments/#{foreign_payment.id}/confirm", headers: auth_headers(user_a)
      expect(response).to have_http_status(:not_found)
    end

    it 'returns 401 unauthenticated' do
      post "/api/v1/invoices/#{invoice.id}/payments/#{payment.id}/confirm"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe 'POST /api/v1/invoices/:invoice_id/payments/:id/reject' do
    let(:invoice) { create(:invoice, organization: org_a, amount_cents: 15_000, status: 'open') }
    let(:payment) { create(:payment, :pending, invoice: invoice, amount_cents: 15_000) }

    it 'rejects a pending claim without touching the ledger or invoice' do
      expect {
        post "/api/v1/invoices/#{invoice.id}/payments/#{payment.id}/reject", headers: auth_headers(user_a)
      }.not_to change(Transaction, :count)

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)).to include('status' => 'rejected')
      expect(invoice.reload.status).to eq('open')
    end

    it 'returns 422 when the payment is not pending' do
      confirmed = create(:payment, invoice: invoice)
      post "/api/v1/invoices/#{invoice.id}/payments/#{confirmed.id}/reject", headers: auth_headers(user_a)
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end
end
