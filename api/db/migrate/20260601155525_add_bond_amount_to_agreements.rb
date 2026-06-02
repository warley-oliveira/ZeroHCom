class AddBondAmountToAgreements < ActiveRecord::Migration[8.1]
  # Security deposit (caução) amount set by the org user when creating the
  # agreement. Reuses the agreement's own currency (no separate bond currency).
  def change
    add_column :agreements, :bond_amount_cents, :integer, default: 0, null: false
  end
end
