class CreatePayments < ActiveRecord::Migration[8.0]
  def change
    create_table :payments, id: :uuid, default: -> { 'gen_random_uuid()' } do |t|
      t.references :invoice, type: :uuid, null: false,
                             foreign_key: { on_delete: :cascade }
      t.string :external_id
      t.integer :amount_cents, null: false, default: 0
      t.string :currency, null: false, default: 'AUD'
      t.datetime :payment_date, null: false
      t.string :method, null: false
      t.timestamps
    end

    add_index :payments, :external_id
  end
end
