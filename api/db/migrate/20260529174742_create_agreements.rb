class CreateAgreements < ActiveRecord::Migration[8.1]
  def change
    create_table :agreements, id: :uuid, default: -> { 'gen_random_uuid()' } do |t|
      t.references :organization, type: :uuid, null: false,
                                  foreign_key: { on_delete: :restrict }
      t.references :customer, type: :uuid, null: false,
                              foreign_key: { on_delete: :restrict }
      t.references :asset, type: :uuid, null: true,
                           foreign_key: { on_delete: :nullify }
      t.string :billing_cycle
      t.integer :amount_cents, null: false, default: 0
      t.string :currency, null: false, default: 'AUD'
      t.string :status, null: false, default: 'active'
      t.date :start_date
      t.date :end_date
      t.timestamps
    end

    add_index :agreements, :status
  end
end
