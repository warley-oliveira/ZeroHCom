class JwtService
  ALGORITHM   = 'HS256'.freeze
  DEFAULT_TTL = 24.hours

  class << self
    # claims: Hash de claims do JWT (use sub, org, etc). Passe explicitamente como Hash
    # — em Ruby 3+, kwargs soltas viram keyword arguments, não um hash posicional.
    def encode(claims, ttl: DEFAULT_TTL)
      now = Time.current.to_i
      JWT.encode(claims.merge(iat: now, exp: (Time.current + ttl).to_i), secret, ALGORITHM)
    end

    def decode(token)
      payload, = JWT.decode(token, secret, true, algorithm: ALGORITHM)
      HashWithIndifferentAccess.new(payload)
    rescue JWT::DecodeError, JWT::ExpiredSignature
      nil
    end

    private

    def secret
      ENV.fetch('JWT_SECRET') { Rails.application.secret_key_base }
    end
  end
end
