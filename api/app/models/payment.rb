class Payment < ApplicationRecord
  belongs_to :invoice

  delegate :organization, :organization_id, to: :invoice

  monetize :amount_cents, with_model_currency: :currency

  validates :payment_date, presence: true
  validates :method, presence: true
end
