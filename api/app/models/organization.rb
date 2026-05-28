class Organization < ApplicationRecord
  has_many :users, dependent: :destroy
  has_many :customers, dependent: :restrict_with_error
  has_many :invoices, dependent: :restrict_with_error

  validates :name, presence: true
  validates :slug, presence: true,
                   uniqueness: true,
                   format: { with: /\A[a-z0-9][a-z0-9-]*\z/, message: 'must be lowercase alphanumeric/dashes' }
end
