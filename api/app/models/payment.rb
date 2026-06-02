class Payment < ApplicationRecord
  belongs_to :invoice

  delegate :organization, :organization_id, to: :invoice

  monetize :amount_cents, with_model_currency: :currency

  # pending   – customer claimed it (PayID/bank "Já paguei"), awaiting org review
  # confirmed – settled: counts toward the invoice and posts to the ledger
  # rejected  – org dismissed the claim; the invoice stays payable
  STATUSES = %w[pending confirmed rejected].freeze
  enum :status, STATUSES.index_with(&:itself)

  validates :payment_date, presence: true
  validates :method, presence: true
end
