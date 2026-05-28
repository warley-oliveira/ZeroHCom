require 'rails_helper'

RSpec.describe 'Api::V1::Customers', type: :request do
  let(:org_a)  { create(:organization) }
  let(:org_b)  { create(:organization) }
  let(:user_a) { create(:user, organization: org_a) }

  describe 'GET /api/v1/customers' do
    context 'when unauthenticated' do
      it 'returns 401' do
        get '/api/v1/customers'
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'when authenticated' do
      let!(:customer_a)  { create(:customer, organization: org_a, name: 'Acme') }
      let!(:customer_a2) { create(:customer, organization: org_a, name: 'Beta Co') }
      let!(:customer_b)  { create(:customer, organization: org_b, name: 'Other Co') }

      it 'returns only customers from the current tenant, ordered by name' do
        get '/api/v1/customers', headers: auth_headers(user_a)

        expect(response).to have_http_status(:ok)
        body = JSON.parse(response.body)
        names = body.map { |c| c['name'] }
        expect(names).to eq(['Acme', 'Beta Co'])
      end
    end
  end

  describe 'GET /api/v1/customers/:id' do
    let!(:customer_a) { create(:customer, organization: org_a) }
    let!(:customer_b) { create(:customer, organization: org_b) }

    it 'returns 404 when the customer belongs to another tenant' do
      get "/api/v1/customers/#{customer_b.id}", headers: auth_headers(user_a)

      expect(response).to have_http_status(:not_found)
    end

    it 'returns the customer when it belongs to the current tenant' do
      get "/api/v1/customers/#{customer_a.id}", headers: auth_headers(user_a)

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)['id']).to eq(customer_a.id)
    end
  end

  describe 'POST /api/v1/customers' do
    it 'creates a customer scoped to the current tenant' do
      expect {
        post '/api/v1/customers',
             params: { customer: { name: 'New Co', email: 'new@example.com', external_id: 'ext-1' } }.to_json,
             headers: auth_headers(user_a).merge('Content-Type' => 'application/json')
      }.to change(Customer, :count).by(1)

      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body['name']).to eq('New Co')

      created = Customer.find(body['id'])
      expect(created.organization).to eq(org_a)
    end

    it 'returns 422 with field errors when invalid' do
      post '/api/v1/customers',
           params: { customer: { name: '' } }.to_json,
           headers: auth_headers(user_a).merge('Content-Type' => 'application/json')

      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)['errors']).to have_key('name')
    end
  end

  describe 'PATCH /api/v1/customers/:id' do
    let!(:customer_a) { create(:customer, organization: org_a, name: 'Old name') }
    let!(:customer_b) { create(:customer, organization: org_b) }

    it 'updates a customer in the current tenant' do
      patch "/api/v1/customers/#{customer_a.id}",
            params: { customer: { name: 'New name' } }.to_json,
            headers: auth_headers(user_a).merge('Content-Type' => 'application/json')

      expect(response).to have_http_status(:ok)
      expect(customer_a.reload.name).to eq('New name')
    end

    it 'returns 404 when updating a customer from another tenant' do
      patch "/api/v1/customers/#{customer_b.id}",
            params: { customer: { name: 'Hack' } }.to_json,
            headers: auth_headers(user_a).merge('Content-Type' => 'application/json')

      expect(response).to have_http_status(:not_found)
    end
  end

  describe 'DELETE /api/v1/customers/:id' do
    let!(:customer_a) { create(:customer, organization: org_a) }

    it 'deletes a customer in the current tenant' do
      expect {
        delete "/api/v1/customers/#{customer_a.id}", headers: auth_headers(user_a)
      }.to change(Customer, :count).by(-1)

      expect(response).to have_http_status(:no_content)
    end

    it 'returns 422 when the customer still has invoices' do
      create(:invoice, organization: org_a, customer: customer_a)

      delete "/api/v1/customers/#{customer_a.id}", headers: auth_headers(user_a)

      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)).to eq('error' => 'customer_has_invoices')
    end
  end
end
