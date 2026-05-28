require 'rails_helper'

RSpec.describe 'Api::V1::Sessions', type: :request do
  describe 'POST /api/v1/login' do
    let!(:user) { create(:user, email: 'alice@example.com', password: 'password123') }

    context 'with valid credentials' do
      it 'returns 200 and a JWT carrying the user/org claims' do
        post '/api/v1/login', params: { email: 'alice@example.com', password: 'password123' }

        expect(response).to have_http_status(:ok)

        body = JSON.parse(response.body)
        expect(body['token']).to be_present
        expect(body['user']).to include(
          'id' => user.id,
          'email' => 'alice@example.com',
          'organization_id' => user.organization_id
        )

        payload = JwtService.decode(body['token'])
        expect(payload[:sub]).to eq(user.id)
        expect(payload[:org]).to eq(user.organization_id)
        expect(payload[:exp]).to be > Time.current.to_i
      end

      it 'is case-insensitive on the email' do
        post '/api/v1/login', params: { email: 'ALICE@example.com', password: 'password123' }
        expect(response).to have_http_status(:ok)
      end
    end

    context 'with an invalid password' do
      it 'returns 401 with a generic error' do
        post '/api/v1/login', params: { email: 'alice@example.com', password: 'wrong-pass' }

        expect(response).to have_http_status(:unauthorized)
        expect(JSON.parse(response.body)).to eq('error' => 'invalid_credentials')
      end
    end

    context 'with an unknown email' do
      it 'returns 401 (does not disclose user existence)' do
        post '/api/v1/login', params: { email: 'ghost@example.com', password: 'whatever1' }

        expect(response).to have_http_status(:unauthorized)
        expect(JSON.parse(response.body)).to eq('error' => 'invalid_credentials')
      end
    end

    context 'with missing params' do
      it 'returns 401' do
        post '/api/v1/login', params: {}
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe 'DELETE /api/v1/logout' do
    it 'returns 204 (stateless JWT, client discards token)' do
      delete '/api/v1/logout'
      expect(response).to have_http_status(:no_content)
    end
  end
end
