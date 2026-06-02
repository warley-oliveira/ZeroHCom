class AddStatusToPayments < ActiveRecord::Migration[8.1]
  # Payments can now be claimed by the customer (PayID/bank "Já paguei") and
  # await organization review. Existing payments were all recorded by the org,
  # so they default to "confirmed".
  def change
    add_column :payments, :status, :string, default: "confirmed", null: false
    add_index :payments, :status
  end
end
