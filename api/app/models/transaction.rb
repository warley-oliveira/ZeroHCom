class Transaction < ApplicationRecord
  belongs_to :organization
  belongs_to :source, polymorphic: true, optional: true
  belongs_to :asset, optional: true

  monetize :amount_cents, with_model_currency: :currency

  DIRECTIONS = %w[income expense].freeze
  enum :direction, DIRECTIONS.index_with(&:itself)

  validates :currency, presence: true
  validates :category, presence: true
  validates :date, presence: true
end
