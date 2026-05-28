class CreateUsers < ActiveRecord::Migration[8.0]
  def change
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
