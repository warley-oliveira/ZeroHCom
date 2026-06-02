FactoryBot.define do
  factory :asset do
    organization
    sequence(:name) { |n| "Asset #{n}" }
    asset_type      { 'vehicle' }
    status          { 'available' }
    metadata do
      {
        'plate' => 'OXZ-9922',
        'model' => 'Ford Fusion Titanium AWD',
        'year' => 2015,
        'transmission' => '6F35'
      }
    end
  end
end
