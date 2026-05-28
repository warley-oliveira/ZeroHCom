class User < ApplicationRecord
  has_secure_password

  belongs_to :organization

  validates :email, presence: true,
                    uniqueness: { case_sensitive: false, scope: :organization_id },
                    format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :password, length: { minimum: 8 }, allow_nil: true

  before_save { self.email = email.downcase.strip if email.present? }
end
