FactoryBot.define do
  factory :agreement do
    organization
    amount_cents  { 50_000 }
    currency      { 'AUD' }
    billing_cycle     { 'monthly' }
    status            { 'active' }
    start_date        { Date.current }
    bond_amount_cents { 0 }

    # Keep associated customer/asset organization in sync with the agreement
    # to satisfy the cross-tenant validations.
    after(:build) do |agreement|
      agreement.customer ||= build(:customer, organization: agreement.organization)
    end

    trait :with_asset do
      after(:build) do |agreement|
        agreement.asset ||= build(:asset, organization: agreement.organization)
      end
    end

    trait :with_bond do
      bond_amount_cents { 100_000 }
    end
  end
end
