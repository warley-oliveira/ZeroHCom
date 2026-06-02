class Invoice < ApplicationRecord
  belongs_to :organization
  belongs_to :customer
  belongs_to :agreement, optional: true
  has_many :payments, dependent: :destroy

  monetize :amount_cents, with_model_currency: :currency

  STATUSES = %w[draft open paid overdue cancelled].freeze
  enum :status, STATUSES.index_with(&:itself)

  KINDS = %w[rent bond].freeze
  enum :kind, KINDS.index_with(&:itself)

  validates :currency, presence: true
  validates :issue_date, presence: true
  validates :due_date, presence: true
  validate :customer_in_same_organization

  # Stable, human-readable reference shown to the payer on the portal and used
  # as the payment reference across gateways.
  def payment_reference
    "INV-#{id.to_s.delete('-').first(8).upcase}"
  end

  private

  def customer_in_same_organization
    return if customer.blank? || organization_id.blank?
    return if customer.organization_id == organization_id

    errors.add(:customer, 'must belong to the same organization')
  end
end
