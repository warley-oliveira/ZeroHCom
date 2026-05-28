MoneyRails.configure do |config|
  config.default_currency = :aud
  config.no_cents_if_whole = false
end

# Use the currency's own locale rules for formatting (silences the upstream
# "default localization behaviour will change" deprecation warning).
Money.locale_backend = :currency
