module Api
  module V1
    class SessionsController < ApplicationController
      # Login é público — não inclui Authenticatable.
      def create
        user = User.where('lower(email) = ?', params[:email].to_s.downcase.strip).first

        if user&.authenticate(params[:password])
          token = JwtService.encode({ sub: user.id, org: user.organization_id })
          render json: {
            token: token,
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              organization_id: user.organization_id
            }
          }, status: :ok
        else
          render json: { error: 'invalid_credentials' }, status: :unauthorized
        end
      end

      # Stateless JWT — logout é client-side. Endpoint só para semântica REST.
      def destroy
        head :no_content
      end
    end
  end
end
