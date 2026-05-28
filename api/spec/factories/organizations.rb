FactoryBot.define do
  factory :organization do
    sequence(:name) { |n| "Org #{n}" }
    sequence(:slug) { |n| "org-#{n}" }
  end
end
