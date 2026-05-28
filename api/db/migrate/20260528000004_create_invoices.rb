class CreateInvoices < ActiveRecord::Migration[8.0]
  def change
    create_table :invoices, id: :uuid, default: -> { 'gen_random_uuid()' } do |t|
      t.references :organization, type: :uuid, null: false,
                                  foreign_key: { on_delete: :restrict }
      t.references :customer, type: :uuid, null: false,
                              foreign_key: { on_delete: :restrict }
      t.string :external_id
      t.integer :amount_cents, null: false, default: 0
      t.string :currency, null: false, default: 'AUD'
      t.string :status, null: false, default: 'draft'
      t.date :issue_date, null: false
      t.date :due_date, null: false
      t.timestamps
    end

    add_index :invoices, [:organization_id, :external_id],
              unique: true,
              where: 'external_id IS NOT NULL',
              name: 'index_invoices_on_org_and_external_id'
    add_index :invoices, :status
    add_index :invoices, :due_date
  end
end
