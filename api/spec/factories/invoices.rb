FactoryBot.define do
  factory :invoice do
    organization
    sequence(:external_id) { |n| "ext-inv-#{n}" }
    amount_cents { 15_000 }
    currency     { 'AUD' }
    status       { 'open' }
    kind         { 'rent' }
    issue_date   { Date.current }
    due_date     { Date.current + 30 }

    # Keep customer.organization in sync with invoice.organization
    # to satisfy the custom validation.
    after(:build) do |invoice|
      invoice.customer ||= build(:customer, organization: invoice.organization)
    end

    trait :bond do
      kind { 'bond' }
    end
  end
end
