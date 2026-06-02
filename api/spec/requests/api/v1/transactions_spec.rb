require 'rails_helper'

RSpec.describe 'Api::V1::Transactions', type: :request do
  let(:org_a)  { create(:organization) }
  let(:org_b)  { create(:organization) }
  let(:user_a) { create(:user, organization: org_a) }

  describe 'GET /api/v1/transactions' do
    context 'when unauthenticated' do
      it 'returns 401' do
        get '/api/v1/transactions'
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'when authenticated' do
      let!(:transaction_a) do
        create(:transaction,
               organization: org_a,
               amount_cents: 12_500,
               currency: 'AUD',
               direction: 'income',
               category: 'rental_income',
               date: Time.utc(2026, 5, 10))
      end
      let!(:transaction_b) { create(:transaction, organization: org_b) }

      it 'returns only tenant transactions in a paginated envelope' do
        get '/api/v1/transactions', headers: auth_headers(user_a)

        expect(response).to have_http_status(:ok)
        body = JSON.parse(response.body)
        expect(body['data'].length).to eq(1)
        expect(body['data'].first['id']).to eq(transaction_a.id)
        expect(body['meta']).to include('page' => 1, 'count' => 1)
      end

      it 'serializes the transaction with formatted money and direction' do
        get '/api/v1/transactions', headers: auth_headers(user_a)

        json = JSON.parse(response.body)['data'].first
        expect(json).to include(
          'amount_cents' => 12_500,
          'amount_formatted' => '125.00',
          'currency' => 'AUD',
          'direction' => 'income',
          'category' => 'rental_income'
        )
      end

      it 'serializes the polymorphic source when present' do
        asset = create(:asset, organization: org_a)
        create(:transaction, organization: org_a, source: asset, direction: 'expense', category: 'maintenance')

        get '/api/v1/transactions', headers: auth_headers(user_a)

        json = JSON.parse(response.body)['data'].find { |t| t['category'] == 'maintenance' }
        expect(json['source']).to eq('type' => 'Asset', 'id' => asset.id)
      end

      it 'filters by direction, category, asset_id and source_type' do
        asset = create(:asset, organization: org_a)
        create(:transaction, organization: org_a, source: asset, asset: asset,
                             direction: 'expense', category: 'maintenance', date: Time.utc(2026, 5, 20))

        get '/api/v1/transactions', params: { direction: 'expense' }, headers: auth_headers(user_a)
        expect(JSON.parse(response.body)['data'].map { |t| t['category'] }).to eq([ 'maintenance' ])

        get '/api/v1/transactions', params: { category: 'rental_income' }, headers: auth_headers(user_a)
        expect(JSON.parse(response.body)['data'].map { |t| t['id'] }).to eq([ transaction_a.id ])

        get '/api/v1/transactions', params: { asset_id: asset.id }, headers: auth_headers(user_a)
        expect(JSON.parse(response.body)['data'].length).to eq(1)

        get '/api/v1/transactions', params: { source_type: 'Asset' }, headers: auth_headers(user_a)
        expect(JSON.parse(response.body)['data'].length).to eq(1)
      end

      it 'filters by the date range' do
        create(:transaction, organization: org_a, direction: 'expense', category: 'fuel', date: Time.utc(2026, 7, 1))

        get '/api/v1/transactions',
            params: { date_from: '2026-05-01', date_to: '2026-05-31' },
            headers: auth_headers(user_a)

        expect(JSON.parse(response.body)['data'].map { |t| t['id'] }).to eq([ transaction_a.id ])
      end
    end
  end

  describe 'POST /api/v1/transactions' do
    let(:valid_params) do
      {
        transaction: {
          direction: 'expense',
          category: 'fuel',
          currency: 'AUD',
          amount_cents: 8_000,
          date: Time.current.iso8601
        }
      }
    end

    it 'creates a transaction scoped to the current tenant' do
      expect {
        post '/api/v1/transactions',
             params: valid_params.to_json,
             headers: auth_headers(user_a).merge('Content-Type' => 'application/json')
      }.to change(Transaction, :count).by(1)

      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body).to include('amount_formatted' => '80.00', 'direction' => 'expense', 'category' => 'fuel')
    end

    it 'returns 422 on validation errors' do
      post '/api/v1/transactions',
           params: { transaction: valid_params[:transaction].merge(category: '') }.to_json,
           headers: auth_headers(user_a).merge('Content-Type' => 'application/json')

      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)['errors']).to have_key('category')
    end
  end

  describe 'DELETE /api/v1/transactions/:id' do
    let!(:transaction_a) { create(:transaction, organization: org_a) }

    it 'deletes a transaction in the current tenant' do
      expect {
        delete "/api/v1/transactions/#{transaction_a.id}", headers: auth_headers(user_a)
      }.to change(Transaction, :count).by(-1)

      expect(response).to have_http_status(:no_content)
    end
  end
end
