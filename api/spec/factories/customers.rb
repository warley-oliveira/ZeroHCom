FactoryBot.define do
  factory :customer do
    organization
    sequence(:name)        { |n| "Customer #{n}" }
    sequence(:email)       { |n| "customer#{n}@example.com" }
    sequence(:external_id) { |n| "ext-cust-#{n}" }
  end
end
