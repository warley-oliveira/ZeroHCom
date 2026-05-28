class ConvertOrganizationsAndUsersToUuid < ActiveRecord::Migration[8.0]
  # Pre-production: drop and recreate is dramatically simpler than swapping
  # PKs in place. No data is preserved across this migration.
  def up
    drop_table :users
    drop_table :organizations

    create_table :organizations, id: :uuid, default: -> { 'gen_random_uuid()' } do |t|
      t.string :name, null: false
      t.string :slug, null: false
      t.timestamps
    end
    add_index :organizations, :slug, unique: true

    create_table :users, id: :uuid, default: -> { 'gen_random_uuid()' } do |t|
      t.references :organization, type: :uuid, null: false, foreign_key: true
      t.string :email, null: false
      t.string :password_digest, null: false
      t.string :name
      t.timestamps
    end
    add_index :users, [:organization_id, :email], unique: true
  end

  def down
    drop_table :users
    drop_table :organizations

    create_table :organizations do |t|
      t.string :name, null: false
      t.string :slug, null: false
      t.timestamps
    end
    add_index :organizations, :slug, unique: true

    create_table :users do |t|
      t.references :organization, null: false, foreign_key: true
      t.string :email, null: false
      t.string :password_digest, null: false
      t.string :name
      t.timestamps
    end
    add_index :users, [:organization_id, :email], unique: true
  end
end
