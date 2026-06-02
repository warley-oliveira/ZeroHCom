require 'rails_helper'

RSpec.describe 'Api::V1::Agreements', type: :request do
  let(:org_a)  { create(:organization) }
  let(:org_b)  { create(:organization) }
  let(:user_a) { create(:user, organization: org_a) }

  describe 'GET /api/v1/agreements' do
    context 'when unauthenticated' do
      it 'returns 401' do
        get '/api/v1/agreements'
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'when authenticated' do
      let(:customer_a) { create(:customer, organization: org_a, name: 'Alice Co') }
      let(:asset_a)    { create(:asset, organization: org_a, name: 'Ford Fusion') }
      let!(:agreement_a) do
        create(:agreement,
               organization: org_a,
               customer: customer_a,
               asset: asset_a,
               amount_cents: 50_000,
               currency: 'AUD',
               billing_cycle: 'monthly',
               status: 'active')
      end
      let!(:agreement_b) { create(:agreement, organization: org_b) }

      it 'returns only tenant agreements in a paginated envelope' do
        get '/api/v1/agreements', headers: auth_headers(user_a)

        expect(response).to have_http_status(:ok)
        body = JSON.parse(response.body)
        expect(body['data'].length).to eq(1)
        expect(body['data'].first['id']).to eq(agreement_a.id)
        expect(body['meta']).to include('page' => 1, 'count' => 1)
      end

      it 'serializes money fields, embedded customer and asset' do
        get '/api/v1/agreements', headers: auth_headers(user_a)

        json = JSON.parse(response.body)['data'].first
        expect(json).to include(
          'amount_cents' => 50_000,
          'amount_formatted' => '500.00',
          'currency' => 'AUD',
          'billing_cycle' => 'monthly',
          'status' => 'active'
        )
        expect(json['customer']).to include('id' => customer_a.id, 'name' => 'Alice Co')
        expect(json['asset']).to include('id' => asset_a.id, 'name' => 'Ford Fusion')
      end

      it 'serializes a null asset for service-only agreements' do
        create(:agreement, organization: org_a, asset: nil)

        get '/api/v1/agreements', headers: auth_headers(user_a)

        json = JSON.parse(response.body)['data'].find { |a| a['asset'].nil? }
        expect(json).not_to be_nil
      end

      it 'filters by status, billing_cycle, customer_id and asset_id' do
        create(:agreement, organization: org_a, customer: customer_a, status: 'paused', billing_cycle: 'weekly')

        get '/api/v1/agreements', params: { status: 'active' }, headers: auth_headers(user_a)
        expect(JSON.parse(response.body)['data'].map { |a| a['id'] }).to eq([ agreement_a.id ])

        get '/api/v1/agreements', params: { billing_cycle: 'monthly' }, headers: auth_headers(user_a)
        expect(JSON.parse(response.body)['data'].map { |a| a['id'] }).to eq([ agreement_a.id ])

        get '/api/v1/agreements', params: { asset_id: asset_a.id }, headers: auth_headers(user_a)
        expect(JSON.parse(response.body)['data'].map { |a| a['id'] }).to eq([ agreement_a.id ])
      end

      it 'filters by bond status (required/paid/pending) via the related bond invoice' do
        bonded = create(:agreement, :with_bond, organization: org_a, customer: customer_a)
        create(:invoice, :bond, organization: org_a, customer: customer_a, agreement: bonded, status: 'paid')
        pending_bond = create(:agreement, :with_bond, organization: org_a, customer: customer_a)

        get '/api/v1/agreements', params: { bond: 'required' }, headers: auth_headers(user_a)
        expect(JSON.parse(response.body)['data'].map { |a| a['id'] }).to match_array([ bonded.id, pending_bond.id ])

        get '/api/v1/agreements', params: { bond: 'paid' }, headers: auth_headers(user_a)
        expect(JSON.parse(response.body)['data'].map { |a| a['id'] }).to eq([ bonded.id ])

        get '/api/v1/agreements', params: { bond: 'pending' }, headers: auth_headers(user_a)
        expect(JSON.parse(response.body)['data'].map { |a| a['id'] }).to eq([ pending_bond.id ])
      end
    end
  end

  describe 'POST /api/v1/agreements' do
    let(:customer) { create(:customer, organization: org_a) }
    let(:asset)    { create(:asset, organization: org_a) }
    let(:valid_params) do
      {
        agreement: {
          customer_id: customer.id,
          asset_id: asset.id,
          billing_cycle: 'weekly',
          status: 'active',
          currency: 'AUD',
          amount_cents: 30_000,
          start_date: Date.current.iso8601
        }
      }
    end

    it 'creates an agreement scoped to the current tenant' do
      expect {
        post '/api/v1/agreements',
             params: valid_params.to_json,
             headers: auth_headers(user_a).merge('Content-Type' => 'application/json')
      }.to change(Agreement, :count).by(1)

      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body).to include('amount_cents' => 30_000, 'amount_formatted' => '300.00')
      expect(body['customer']['id']).to eq(customer.id)
    end

    it 'rejects a customer from another tenant with 422' do
      foreign_customer = create(:customer, organization: org_b)

      post '/api/v1/agreements',
           params: { agreement: valid_params[:agreement].merge(customer_id: foreign_customer.id) }.to_json,
           headers: auth_headers(user_a).merge('Content-Type' => 'application/json')

      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)['errors']).to have_key('customer')
    end
  end

  describe 'PATCH /api/v1/agreements/:id' do
    let!(:agreement_a) { create(:agreement, organization: org_a, status: 'active') }

    it 'updates an agreement in the current tenant' do
      patch "/api/v1/agreements/#{agreement_a.id}",
            params: { agreement: { status: 'paused' } }.to_json,
            headers: auth_headers(user_a).merge('Content-Type' => 'application/json')

      expect(response).to have_http_status(:ok)
      expect(agreement_a.reload.status).to eq('paused')
    end
  end

  describe 'DELETE /api/v1/agreements/:id' do
    let!(:agreement_a) { create(:agreement, organization: org_a) }

    it 'deletes an agreement in the current tenant' do
      expect {
        delete "/api/v1/agreements/#{agreement_a.id}", headers: auth_headers(user_a)
      }.to change(Agreement, :count).by(-1)

      expect(response).to have_http_status(:no_content)
    end
  end
end
