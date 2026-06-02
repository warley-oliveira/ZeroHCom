# Sidekiq + sidekiq-cron setup.
#
# Redis runs on the custom host port 26379 (see docker-compose.yml); override
# with REDIS_URL in other environments.
redis_url = ENV.fetch("REDIS_URL", "redis://localhost:26379/0")

Sidekiq.configure_server do |config|
  config.redis = { url: redis_url }

  # Load the recurring schedule (sidekiq-cron) on the worker process only.
  schedule_file = Rails.root.join("config/schedule.yml")
  Sidekiq::Cron::Job.load_from_hash!(YAML.load_file(schedule_file)) if schedule_file.exist?
end

Sidekiq.configure_client do |config|
  config.redis = { url: redis_url }
end
