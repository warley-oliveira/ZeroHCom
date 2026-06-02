require 'rails_helper'

RSpec.describe Asset, type: :model do
  it { is_expected.to belong_to(:organization) }
  it { is_expected.to have_many(:agreements) }
  it { is_expected.to validate_presence_of(:name) }

  it 'defines the expected status enum values' do
    expect(described_class.statuses.keys).to match_array(%w[available rented maintenance])
  end

  it 'stores complex metadata as jsonb' do
    asset = create(:asset, metadata: { 'plate' => 'ABC-123', 'features' => %w[gps abs] })
    expect(asset.reload.metadata).to eq('plate' => 'ABC-123', 'features' => %w[gps abs])
  end
end
