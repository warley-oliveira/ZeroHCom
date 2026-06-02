class Asset < ApplicationRecord
  belongs_to :organization
  has_many :agreements, dependent: :nullify
  has_many :transactions, dependent: :nullify

  STATUSES = %w[available rented maintenance].freeze
  enum :status, STATUSES.index_with(&:itself)

  validates :name, presence: true
end
