class Customer < ApplicationRecord
  belongs_to :organization
  has_many :invoices, dependent: :restrict_with_error

  validates :name, presence: true
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }, allow_blank: true
end
