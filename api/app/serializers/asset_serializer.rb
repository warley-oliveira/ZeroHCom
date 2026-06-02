class AssetSerializer
  def self.render(asset)
    {
      id: asset.id,
      name: asset.name,
      asset_type: asset.asset_type,
      status: asset.status,
      metadata: asset.metadata
    }
  end
end
