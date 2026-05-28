module Authenticatable
  extend ActiveSupport::Concern

  included do
    before_action :authenticate_user!
    attr_reader :current_user
  end

  private

  def authenticate_user!
    payload = JwtService.decode(bearer_token)
    @current_user = payload && User.find_by(id: payload[:sub])

    if @current_user
      Current.user = @current_user
      Current.organization = @current_user.organization
      return
    end

    render json: { error: 'unauthorized' }, status: :unauthorized
  end

  def bearer_token
    header = request.headers['Authorization'].to_s
    header.start_with?('Bearer ') ? header.split(' ', 2).last : nil
  end

  def pundit_user
    current_user
  end
end
