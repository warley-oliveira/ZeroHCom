FactoryBot.define do
  factory :payment do
    invoice
    sequence(:external_id) { |n| "ext-pay-#{n}" }
    amount_cents { 15_000 }
    currency     { 'AUD' }
    payment_date { Time.current }
    add_attribute(:method) { 'credit_card' }
  end
end
