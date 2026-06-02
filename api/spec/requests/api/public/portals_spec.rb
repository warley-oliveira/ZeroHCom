require 'rails_helper'

RSpec.describe 'Api::Public::Portals', type: :request do
  let(:organization) { create(:organization) }
  let(:customer)     { create(:customer, organization: organization, name: 'Jane Renter') }

  describe 'GET /api/public/portal/:token' do
    it 'returns the portal payload without any authentication' do
      agreement = create(:agreement, :with_bond, organization: organization, customer: customer, bond_amount_cents: 100_000)
      create(:invoice, organization: organization, customer: customer, agreement: agreement, status: 'open', amount_cents: 15_000)

      get "/api/public/portal/#{customer.portal_token}"

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body['customer']).to include('id' => customer.id, 'name' => 'Jane Renter')
      expect(body['organization']).to include('id' => organization.id)
      expect(body['payment_instructions']).to have_key('payid')
      expect(body['contracts'].length).to eq(1)
      expect(body['contracts'].first['bond']).to include('required' => true, 'paid' => false, 'amount_cents' => 100_000)
      expect(body['open_invoices'].length).to eq(1)
      expect(body['open_invoices'].first).to include('kind' => 'rent', 'amount_cents' => 15_000)
    end

    it 'lazily creates the bond invoice on first view and is idempotent on the next' do
      create(:agreement, :with_bond, organization: organization, customer: customer)

      expect {
        get "/api/public/portal/#{customer.portal_token}"
      }.to change { Invoice.where(kind: 'bond').count }.by(1)

      expect {
        get "/api/public/portal/#{customer.portal_token}"
      }.not_to change { Invoice.where(kind: 'bond').count }
    end

    it 'excludes the bond invoice from open_invoices (paid from its contract card)' do
      create(:agreement, :with_bond, organization: organization, customer: customer)

      get "/api/public/portal/#{customer.portal_token}"

      kinds = JSON.parse(response.body)['open_invoices'].map { |i| i['kind'] }
      expect(kinds).to all(eq('rent'))
    end

    it 'returns 200 with empty collections for a customer with no agreements' do
      get "/api/public/portal/#{customer.portal_token}"

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body['contracts']).to eq([])
      expect(body['open_invoices']).to eq([])
    end

    it 'only exposes the resolved customer’s own data' do
      other = create(:customer, organization: organization)
      create(:agreement, organization: organization, customer: other)
      create(:agreement, organization: organization, customer: customer)

      get "/api/public/portal/#{customer.portal_token}"

      ids = JSON.parse(response.body)['contracts'].map { |c| c['id'] }
      expect(ids).to eq(customer.agreements.pluck(:id))
    end

    it 'returns 404 for an invalid token' do
      get '/api/public/portal/does-not-exist'
      expect(response).to have_http_status(:not_found)
      expect(JSON.parse(response.body)).to eq('error' => 'not_found')
    end

    it 'returns 404 for a revoked (regenerated) token' do
      old_token = customer.portal_token
      customer.regenerate_portal_token

      get "/api/public/portal/#{old_token}"
      expect(response).to have_http_status(:not_found)
    end
  end
end
