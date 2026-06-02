class AddPortalTokenToCustomers < ActiveRecord::Migration[8.1]
  # Per-customer token that powers the public payment portal link.
  # Non-guessable, no expiry, revocable by regenerating (has_secure_token).
  def up
    add_column :customers, :portal_token, :string

    # Backfill existing rows in batches before enforcing NOT NULL.
    # Tenant tables are small; find_each keeps it off a single massive UPDATE.
    Customer.reset_column_information
    Customer.where(portal_token: nil).find_each do |customer|
      customer.update_columns(portal_token: SecureRandom.base58(24))
    end

    change_column_null :customers, :portal_token, false
    add_index :customers, :portal_token, unique: true
  end

  def down
    remove_index :customers, :portal_token
    remove_column :customers, :portal_token
  end
end
