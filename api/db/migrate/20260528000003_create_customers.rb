class CreateCustomers < ActiveRecord::Migration[8.0]
  def change
    create_table :customers, id: :uuid, default: -> { 'gen_random_uuid()' } do |t|
      t.references :organization, type: :uuid, null: false,
                                  foreign_key: { on_delete: :restrict }
      t.string :name, null: false
      t.string :email
      t.string :external_id
      t.timestamps
    end

    add_index :customers, [:organization_id, :external_id],
              unique: true,
              where: 'external_id IS NOT NULL',
              name: 'index_customers_on_org_and_external_id'
  end
end
