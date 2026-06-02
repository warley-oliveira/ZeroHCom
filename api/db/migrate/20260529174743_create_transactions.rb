class CreateTransactions < ActiveRecord::Migration[8.1]
  def change
    create_table :transactions, id: :uuid, default: -> { 'gen_random_uuid()' } do |t|
      t.references :organization, type: :uuid, null: false,
                                  foreign_key: { on_delete: :restrict }
      t.integer :amount_cents, null: false, default: 0
      t.string :currency, null: false, default: 'AUD'
      t.string :direction
      t.string :category
      t.references :source, type: :uuid, polymorphic: true, null: true, index: true
      t.datetime :date
      t.timestamps
    end

    add_index :transactions, :category
  end
end
