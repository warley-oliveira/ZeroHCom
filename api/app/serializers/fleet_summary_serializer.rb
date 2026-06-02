class FleetSummarySerializer
  # Net profit per asset (car). Amounts are in cents; the client formats them.
  def self.render(asset, income_cents:, expense_cents:, currency: "AUD")
    {
      asset: {
        id: asset.id,
        name: asset.name,
        asset_type: asset.asset_type,
        metadata: asset.metadata
      },
      currency: currency,
      income_cents: income_cents,
      expense_cents: expense_cents,
      net_profit_cents: income_cents - expense_cents
    }
  end
end
