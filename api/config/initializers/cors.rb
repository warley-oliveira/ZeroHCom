# Be sure to restart your server when you modify this file.

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins ENV.fetch("CORS_ALLOWED_ORIGINS", "http://localhost:25173").split(",").map(&:strip)

    resource "*",
      headers: :any,
      expose:  %w[Authorization],
      methods: %i[get post put patch delete options head],
      max_age: 600
  end
end
