require 'rails_helper'

RSpec.describe 'Api::V1::Assets', type: :request do
  let(:org_a)  { create(:organization) }
  let(:org_b)  { create(:organization) }
  let(:user_a) { create(:user, organization: org_a) }

  describe 'GET /api/v1/assets' do
    context 'when unauthenticated' do
      it 'returns 401' do
        get '/api/v1/assets'
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'when authenticated' do
      let!(:asset_a) do
        create(:asset,
               organization: org_a,
               name: 'Ford Fusion',
               asset_type: 'vehicle',
               status: 'available',
               metadata: { 'plate' => 'XYZ-987', 'year' => 2021 })
      end
      let!(:asset_b) { create(:asset, organization: org_b) }

      it 'returns only tenant assets in a paginated envelope' do
        get '/api/v1/assets', headers: auth_headers(user_a)

        expect(response).to have_http_status(:ok)
        body = JSON.parse(response.body)
        expect(body['data'].length).to eq(1)
        expect(body['data'].first['id']).to eq(asset_a.id)
        expect(body['meta']).to include('page' => 1, 'count' => 1)
      end

      it 'serializes the asset including the jsonb metadata' do
        get '/api/v1/assets', headers: auth_headers(user_a)

        asset_json = JSON.parse(response.body)['data'].first
        expect(asset_json).to include(
          'name' => 'Ford Fusion',
          'asset_type' => 'vehicle',
          'status' => 'available'
        )
        expect(asset_json['metadata']).to eq('plate' => 'XYZ-987', 'year' => 2021)
      end

      it 'filters by asset_type' do
        create(:asset, organization: org_a, asset_type: 'hardware', name: 'MacBook Pro')

        get '/api/v1/assets', params: { asset_type: 'hardware' }, headers: auth_headers(user_a)

        body = JSON.parse(response.body)
        expect(body['data'].length).to eq(1)
        expect(body['data'].first['name']).to eq('MacBook Pro')
      end

      it 'filters by status and searches by name' do
        create(:asset, organization: org_a, name: 'Toyota Hilux', status: 'maintenance')

        get '/api/v1/assets', params: { status: 'maintenance' }, headers: auth_headers(user_a)
        expect(JSON.parse(response.body)['data'].map { |a| a['name'] }).to eq([ 'Toyota Hilux' ])

        get '/api/v1/assets', params: { q: 'fusion' }, headers: auth_headers(user_a)
        expect(JSON.parse(response.body)['data'].map { |a| a['name'] }).to eq([ 'Ford Fusion' ])
      end

      it 'returns the full list when all=true' do
        create(:asset, organization: org_a, name: 'Toyota Hilux')

        get '/api/v1/assets', params: { all: 'true', per_page: 1 }, headers: auth_headers(user_a)
        expect(JSON.parse(response.body)['data'].length).to eq(2)
      end
    end
  end

  describe 'GET /api/v1/assets/:id' do
    let!(:asset_a) { create(:asset, organization: org_a) }
    let!(:asset_b) { create(:asset, organization: org_b) }

    it 'returns the asset when it belongs to the current tenant' do
      get "/api/v1/assets/#{asset_a.id}", headers: auth_headers(user_a)

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)['id']).to eq(asset_a.id)
    end

    it 'returns 404 when the asset belongs to another tenant' do
      get "/api/v1/assets/#{asset_b.id}", headers: auth_headers(user_a)

      expect(response).to have_http_status(:not_found)
    end
  end

  describe 'POST /api/v1/assets' do
    let(:valid_params) do
      {
        asset: {
          name: 'Toyota Corolla',
          asset_type: 'vehicle',
          status: 'available',
          metadata: { plate: 'AAA-111', color: 'white' }
        }
      }
    end

    it 'creates an asset scoped to the current tenant and persists metadata' do
      expect {
        post '/api/v1/assets',
             params: valid_params.to_json,
             headers: auth_headers(user_a).merge('Content-Type' => 'application/json')
      }.to change(Asset, :count).by(1)

      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body['name']).to eq('Toyota Corolla')
      expect(body['metadata']).to eq('plate' => 'AAA-111', 'color' => 'white')
    end

    it 'returns 422 on validation errors' do
      post '/api/v1/assets',
           params: { asset: valid_params[:asset].merge(name: '') }.to_json,
           headers: auth_headers(user_a).merge('Content-Type' => 'application/json')

      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)['errors']).to have_key('name')
    end
  end

  describe 'PATCH /api/v1/assets/:id' do
    let!(:asset_a) { create(:asset, organization: org_a, status: 'available') }
    let!(:asset_b) { create(:asset, organization: org_b) }

    it 'updates an asset in the current tenant' do
      patch "/api/v1/assets/#{asset_a.id}",
            params: { asset: { status: 'rented' } }.to_json,
            headers: auth_headers(user_a).merge('Content-Type' => 'application/json')

      expect(response).to have_http_status(:ok)
      expect(asset_a.reload.status).to eq('rented')
    end

    it 'returns 404 for an asset from another tenant' do
      patch "/api/v1/assets/#{asset_b.id}",
            params: { asset: { status: 'rented' } }.to_json,
            headers: auth_headers(user_a).merge('Content-Type' => 'application/json')

      expect(response).to have_http_status(:not_found)
    end
  end

  describe 'DELETE /api/v1/assets/:id' do
    let!(:asset_a) { create(:asset, organization: org_a) }

    it 'deletes an asset in the current tenant' do
      expect {
        delete "/api/v1/assets/#{asset_a.id}", headers: auth_headers(user_a)
      }.to change(Asset, :count).by(-1)

      expect(response).to have_http_status(:no_content)
    end
  end
end
