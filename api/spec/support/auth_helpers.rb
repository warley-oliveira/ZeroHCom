module AuthHelpers
  def auth_headers(user)
    token = JwtService.encode({ sub: user.id, org: user.organization_id })
    { 'Authorization' => "Bearer #{token}" }
  end
end
