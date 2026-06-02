FactoryBot.define do
  factory :payment do
    invoice
    sequence(:external_id) { |n| "ext-pay-#{n}" }
    amount_cents { 15_000 }
    currency     { 'AUD' }
    status       { 'confirmed' }
    payment_date { Time.current }
    add_attribute(:method) { 'credit_card' }

    trait :pending do
      status { 'pending' }
    end

    trait :rejected do
      status { 'rejected' }
    end
  end
end
