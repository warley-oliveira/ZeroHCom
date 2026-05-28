require 'rails_helper'

RSpec.describe 'Api::V1::Invoices', type: :request do
  let(:org_a)  { create(:organization) }
  let(:org_b)  { create(:organization) }
  let(:user_a) { create(:user, organization: org_a) }

  describe 'GET /api/v1/invoices' do
    context 'when unauthenticated' do
      it 'returns 401' do
        get '/api/v1/invoices'
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'when authenticated' do
      let(:customer_a) { create(:customer, organization: org_a, name: 'Alice Co') }
      let!(:invoice_a) do
        create(:invoice,
               organization: org_a,
               customer: customer_a,
               amount_cents: 15_000,
               currency: 'AUD',
               status: 'open',
               issue_date: Date.new(2026, 5, 1),
               due_date: Date.new(2026, 5, 31))
      end
      let!(:invoice_b) { create(:invoice, organization: org_b) }

      it 'returns only invoices from the current tenant' do
        get '/api/v1/invoices', headers: auth_headers(user_a)

        expect(response).to have_http_status(:ok)
        body = JSON.parse(response.body)
        expect(body.length).to eq(1)
        expect(body.first['id']).to eq(invoice_a.id)
      end

      it 'serializes the invoice with money fields and embedded customer' do
        get '/api/v1/invoices', headers: auth_headers(user_a)

        invoice_json = JSON.parse(response.body).first
        expect(invoice_json).to include(
          'amount_cents' => 15_000,
          'amount_formatted' => '150.00',
          'currency' => 'AUD',
          'status' => 'open'
        )
        expect(invoice_json['customer']).to include(
          'id' => customer_a.id,
          'name' => 'Alice Co'
        )
      end
    end
  end

  describe 'GET /api/v1/invoices/:id' do
    let!(:invoice_a) { create(:invoice, organization: org_a) }
    let!(:invoice_b) { create(:invoice, organization: org_b) }

    it 'returns the invoice when it belongs to the current tenant' do
      get "/api/v1/invoices/#{invoice_a.id}", headers: auth_headers(user_a)

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)['id']).to eq(invoice_a.id)
    end

    it 'returns 404 when the invoice belongs to another tenant' do
      get "/api/v1/invoices/#{invoice_b.id}", headers: auth_headers(user_a)

      expect(response).to have_http_status(:not_found)
      expect(JSON.parse(response.body)).to eq('error' => 'not_found')
    end

    it 'returns 401 without a token' do
      get "/api/v1/invoices/#{invoice_a.id}"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe 'POST /api/v1/invoices' do
    let(:customer) { create(:customer, organization: org_a) }
    let(:valid_params) do
      {
        invoice: {
          customer_id: customer.id,
          external_id: 'INV-NEW',
          status: 'open',
          currency: 'AUD',
          amount_cents: 25_000,
          issue_date: Date.current.iso8601,
          due_date: (Date.current + 14).iso8601
        }
      }
    end

    it 'creates an invoice scoped to the current tenant' do
      expect {
        post '/api/v1/invoices',
             params: valid_params.to_json,
             headers: auth_headers(user_a).merge('Content-Type' => 'application/json')
      }.to change(Invoice, :count).by(1)

      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body).to include(
        'amount_cents' => 25_000,
        'amount_formatted' => '250.00',
        'status' => 'open'
      )
      expect(body['customer']['id']).to eq(customer.id)
    end

    it 'rejects a customer from another tenant with 422' do
      foreign_customer = create(:customer, organization: org_b)

      post '/api/v1/invoices',
           params: { invoice: valid_params[:invoice].merge(customer_id: foreign_customer.id) }.to_json,
           headers: auth_headers(user_a).merge('Content-Type' => 'application/json')

      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)['errors']).to have_key('customer')
    end

    it 'returns 422 on validation errors' do
      post '/api/v1/invoices',
           params: { invoice: valid_params[:invoice].merge(currency: '') }.to_json,
           headers: auth_headers(user_a).merge('Content-Type' => 'application/json')

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe 'PATCH /api/v1/invoices/:id' do
    let!(:invoice_a) { create(:invoice, organization: org_a, status: 'open') }
    let!(:invoice_b) { create(:invoice, organization: org_b) }

    it 'updates an invoice in the current tenant' do
      patch "/api/v1/invoices/#{invoice_a.id}",
            params: { invoice: { status: 'paid' } }.to_json,
            headers: auth_headers(user_a).merge('Content-Type' => 'application/json')

      expect(response).to have_http_status(:ok)
      expect(invoice_a.reload.status).to eq('paid')
    end

    it 'returns 404 for an invoice from another tenant' do
      patch "/api/v1/invoices/#{invoice_b.id}",
            params: { invoice: { status: 'paid' } }.to_json,
            headers: auth_headers(user_a).merge('Content-Type' => 'application/json')

      expect(response).to have_http_status(:not_found)
    end
  end

  describe 'DELETE /api/v1/invoices/:id' do
    let!(:invoice_a) { create(:invoice, organization: org_a) }

    it 'deletes an invoice in the current tenant' do
      expect {
        delete "/api/v1/invoices/#{invoice_a.id}", headers: auth_headers(user_a)
      }.to change(Invoice, :count).by(-1)

      expect(response).to have_http_status(:no_content)
    end
  end
end
