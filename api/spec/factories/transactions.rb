FactoryBot.define do
  factory :transaction do
    organization
    amount_cents { 12_500 }
    currency     { 'AUD' }
    direction    { 'income' }
    category     { 'rental_income' }
    date         { Time.current }

    trait :expense do
      direction { 'expense' }
      category  { 'maintenance' }
    end

    trait :with_source do
      after(:build) do |transaction|
        transaction.source ||= build(:asset, organization: transaction.organization)
      end
    end
  end
end
