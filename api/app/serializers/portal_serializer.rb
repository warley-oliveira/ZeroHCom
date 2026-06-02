class PortalSerializer
  def self.render(customer)
    {
      organization: render_organization(customer.organization),
      customer: { id: customer.id, name: customer.name, email: customer.email },
      payment_instructions: payment_instructions,
      contracts: customer.agreements.map { |a| render_contract(a) },
      open_invoices: open_invoices_for(customer).map { |i| render_invoice(i) },
      history: history_for(customer).map { |p| render_payment(p) }
    }
  end

  def self.render_organization(organization)
    { id: organization.id, name: organization.name, slug: organization.slug }
  end
  private_class_method :render_organization

  # Mock destination details for the push payment methods (PayID / bank).
  # Mirrors the gateway mocks; real values come from org settings later.
  def self.payment_instructions
    {
      payid: { identifier: ENV.fetch("MOCK_PAYID_IDENTIFIER", "payments@example.com.au") },
      bank: {
        account_name: ENV.fetch("MOCK_BANK_ACCOUNT_NAME", "ZeroHCom Pty Ltd"),
        bsb: ENV.fetch("MOCK_BANK_BSB", "000-000"),
        account_number: ENV.fetch("MOCK_BANK_ACCOUNT_NUMBER", "12345678")
      }
    }
  end
  private_class_method :payment_instructions

  def self.render_contract(agreement)
    {
      id: agreement.id,
      status: agreement.status,
      billing_cycle: agreement.billing_cycle,
      start_date: agreement.start_date,
      end_date: agreement.end_date,
      currency: agreement.currency,
      amount_cents: agreement.amount_cents,
      amount_formatted: format_money(agreement.amount),
      asset: render_asset(agreement.asset),
      bond: render_bond(agreement)
    }
  end
  private_class_method :render_contract

  def self.render_bond(agreement)
    return nil unless agreement.bond_required?

    invoice = agreement.invoices.find { |i| i.kind == "bond" }
    {
      required: true,
      paid: invoice&.status == "paid",
      # A claim (PayID/bank) was submitted and is awaiting org confirmation.
      pending: invoice ? invoice.payments.any?(&:pending?) : false,
      amount_cents: agreement.bond_amount_cents,
      amount_formatted: format_money(agreement.bond_amount),
      invoice_id: invoice&.id,
      status: invoice&.status,
      reference: invoice&.payment_reference
    }
  end
  private_class_method :render_bond

  def self.render_asset(asset)
    return nil if asset.blank?

    { id: asset.id, name: asset.name, asset_type: asset.asset_type }
  end
  private_class_method :render_asset

  # Open/overdue recurring invoices only — the bond is paid from its contract card.
  def self.open_invoices_for(customer)
    customer.invoices
            .select { |i| i.kind == "rent" && %w[open overdue].include?(i.status) }
            .sort_by { |i| i.due_date || i.issue_date }
  end
  private_class_method :open_invoices_for

  def self.render_invoice(invoice)
    {
      id: invoice.id,
      agreement_id: invoice.agreement_id,
      kind: invoice.kind,
      status: invoice.status,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      currency: invoice.currency,
      amount_cents: invoice.amount_cents,
      amount_formatted: format_money(invoice.amount),
      reference: invoice.payment_reference,
      # True when the customer already submitted a claim awaiting org review.
      pending: invoice.payments.any?(&:pending?)
    }
  end
  private_class_method :render_invoice

  # All CONFIRMED payments (rent + bond), most recent first. Pending claims and
  # rejected ones are not part of the customer's payment history.
  def self.history_for(customer)
    customer.invoices.flat_map(&:payments).select(&:confirmed?).sort_by(&:payment_date).reverse
  end
  private_class_method :history_for

  def self.render_payment(payment)
    {
      id: payment.id,
      invoice_id: payment.invoice_id,
      kind: payment.invoice.kind,
      method: payment.method,
      external_id: payment.external_id,
      payment_date: payment.payment_date,
      currency: payment.currency,
      amount_cents: payment.amount_cents,
      amount_formatted: format_money(payment.amount)
    }
  end
  private_class_method :render_payment

  def self.format_money(money)
    money.format(symbol: false, no_cents_if_whole: false)
  end
  private_class_method :format_money
end
