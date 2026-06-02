class AgreementSerializer
  def self.render(agreement)
    {
      id: agreement.id,
      billing_cycle: agreement.billing_cycle,
      status: agreement.status,
      start_date: agreement.start_date,
      end_date: agreement.end_date,
      currency: agreement.currency,
      amount_cents: agreement.amount_cents,
      amount_formatted: agreement.amount.format(symbol: false, no_cents_if_whole: false),
      bond_amount_cents: agreement.bond_amount_cents,
      bond_amount_formatted: agreement.bond_amount.format(symbol: false, no_cents_if_whole: false),
      bond_required: agreement.bond_required?,
      bond_paid: agreement.bond_paid?,
      customer: render_customer(agreement.customer),
      asset: render_asset(agreement.asset)
    }
  end

  def self.render_customer(customer)
    {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      external_id: customer.external_id
    }
  end
  private_class_method :render_customer

  def self.render_asset(asset)
    return nil if asset.blank?

    { id: asset.id, name: asset.name, asset_type: asset.asset_type }
  end
  private_class_method :render_asset
end
