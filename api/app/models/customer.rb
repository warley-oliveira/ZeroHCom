class Customer < ApplicationRecord
  belongs_to :organization
  has_many :invoices, dependent: :restrict_with_error
  has_many :agreements, dependent: :restrict_with_error

  # Powers the public payment portal link. Auto-generated on create and
  # rotatable via #regenerate_portal_token (revokes any previously shared link).
  has_secure_token :portal_token

  validates :name, presence: true
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }, allow_blank: true

  # Relative path the frontend turns into a full URL for the customer portal.
  def portal_url
    "/portal/#{portal_token}"
  end
end
