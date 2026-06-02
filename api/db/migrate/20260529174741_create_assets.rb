class CreateAssets < ActiveRecord::Migration[8.1]
  def change
    create_table :assets, id: :uuid, default: -> { 'gen_random_uuid()' } do |t|
      t.references :organization, type: :uuid, null: false,
                                  foreign_key: { on_delete: :restrict }
      t.string :name, null: false
      t.string :asset_type
      t.string :status, null: false, default: 'available'
      t.jsonb :metadata, null: false, default: {}
      t.timestamps
    end

    add_index :assets, :asset_type
    add_index :assets, :status
    add_index :assets, :metadata, using: :gin
  end
end
