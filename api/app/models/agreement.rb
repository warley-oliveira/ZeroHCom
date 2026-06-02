class Agreement < ApplicationRecord
  belongs_to :organization
  belongs_to :customer
  belongs_to :asset, optional: true
  has_many :invoices, dependent: :nullify

  monetize :amount_cents, with_model_currency: :currency
  monetize :bond_amount_cents, with_model_currency: :currency

  STATUSES = %w[active cancelled paused].freeze
  enum :status, STATUSES.index_with(&:itself)

  validates :currency, presence: true
  validate :customer_in_same_organization
  validate :asset_in_same_organization

  # Whether this agreement requires a security deposit (caução).
  def bond_required?
    bond_amount_cents.to_i.positive?
  end

  # The one-off bond invoice (created lazily by Billing::EnsureBondInvoiceService).
  def bond_invoice
    invoices.find_by(kind: "bond")
  end

  def bond_paid?
    bond_invoice&.status == "paid"
  end

  private

  def customer_in_same_organization
    return if customer.blank? || organization_id.blank?
    return if customer.organization_id == organization_id

    errors.add(:customer, 'must belong to the same organization')
  end

  def asset_in_same_organization
    return if asset.blank? || organization_id.blank?
    return if asset.organization_id == organization_id

    errors.add(:asset, 'must belong to the same organization')
  end
end
