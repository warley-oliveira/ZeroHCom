# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_06_01_170117) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"
  enable_extension "pgcrypto"

  create_table "agreements", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.integer "amount_cents", default: 0, null: false
    t.uuid "asset_id"
    t.string "billing_cycle"
    t.integer "bond_amount_cents", default: 0, null: false
    t.datetime "created_at", null: false
    t.string "currency", default: "AUD", null: false
    t.uuid "customer_id", null: false
    t.date "end_date"
    t.uuid "organization_id", null: false
    t.date "start_date"
    t.string "status", default: "active", null: false
    t.datetime "updated_at", null: false
    t.index ["asset_id"], name: "index_agreements_on_asset_id"
    t.index ["customer_id"], name: "index_agreements_on_customer_id"
    t.index ["organization_id"], name: "index_agreements_on_organization_id"
    t.index ["status"], name: "index_agreements_on_status"
  end

  create_table "assets", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "asset_type"
    t.datetime "created_at", null: false
    t.jsonb "metadata", default: {}, null: false
    t.string "name", null: false
    t.uuid "organization_id", null: false
    t.string "status", default: "available", null: false
    t.datetime "updated_at", null: false
    t.index ["asset_type"], name: "index_assets_on_asset_type"
    t.index ["metadata"], name: "index_assets_on_metadata", using: :gin
    t.index ["organization_id"], name: "index_assets_on_organization_id"
    t.index ["status"], name: "index_assets_on_status"
  end

  create_table "customers", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email"
    t.string "external_id"
    t.string "name", null: false
    t.uuid "organization_id", null: false
    t.string "portal_token", null: false
    t.datetime "updated_at", null: false
    t.index ["organization_id", "external_id"], name: "index_customers_on_org_and_external_id", unique: true, where: "(external_id IS NOT NULL)"
    t.index ["organization_id"], name: "index_customers_on_organization_id"
    t.index ["portal_token"], name: "index_customers_on_portal_token", unique: true
  end

  create_table "invoices", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "agreement_id"
    t.integer "amount_cents", default: 0, null: false
    t.datetime "created_at", null: false
    t.string "currency", default: "AUD", null: false
    t.uuid "customer_id", null: false
    t.date "due_date", null: false
    t.string "external_id"
    t.date "issue_date", null: false
    t.string "kind", default: "rent", null: false
    t.uuid "organization_id", null: false
    t.string "status", default: "draft", null: false
    t.datetime "updated_at", null: false
    t.index ["agreement_id", "kind"], name: "index_one_bond_invoice_per_agreement", unique: true, where: "((kind)::text = 'bond'::text)"
    t.index ["agreement_id"], name: "index_invoices_on_agreement_id"
    t.index ["customer_id"], name: "index_invoices_on_customer_id"
    t.index ["due_date"], name: "index_invoices_on_due_date"
    t.index ["kind"], name: "index_invoices_on_kind"
    t.index ["organization_id", "external_id"], name: "index_invoices_on_org_and_external_id", unique: true, where: "(external_id IS NOT NULL)"
    t.index ["organization_id"], name: "index_invoices_on_organization_id"
    t.index ["status"], name: "index_invoices_on_status"
  end

  create_table "organizations", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.string "slug", null: false
    t.datetime "updated_at", null: false
    t.index ["slug"], name: "index_organizations_on_slug", unique: true
  end

  create_table "payments", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.integer "amount_cents", default: 0, null: false
    t.datetime "created_at", null: false
    t.string "currency", default: "AUD", null: false
    t.string "external_id"
    t.uuid "invoice_id", null: false
    t.string "method", null: false
    t.datetime "payment_date", null: false
    t.string "status", default: "confirmed", null: false
    t.datetime "updated_at", null: false
    t.index ["external_id"], name: "index_payments_on_external_id"
    t.index ["invoice_id"], name: "index_payments_on_invoice_id"
    t.index ["status"], name: "index_payments_on_status"
  end

  create_table "transactions", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.integer "amount_cents", default: 0, null: false
    t.uuid "asset_id"
    t.string "category"
    t.datetime "created_at", null: false
    t.string "currency", default: "AUD", null: false
    t.datetime "date"
    t.string "direction"
    t.uuid "organization_id", null: false
    t.uuid "source_id"
    t.string "source_type"
    t.datetime "updated_at", null: false
    t.index ["asset_id"], name: "index_transactions_on_asset_id"
    t.index ["category"], name: "index_transactions_on_category"
    t.index ["organization_id"], name: "index_transactions_on_organization_id"
    t.index ["source_type", "source_id"], name: "index_transactions_on_source"
  end

  create_table "users", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email", null: false
    t.string "name"
    t.uuid "organization_id", null: false
    t.string "password_digest", null: false
    t.datetime "updated_at", null: false
    t.index ["organization_id", "email"], name: "index_users_on_organization_id_and_email", unique: true
    t.index ["organization_id"], name: "index_users_on_organization_id"
  end

  add_foreign_key "agreements", "assets", on_delete: :nullify
  add_foreign_key "agreements", "customers", on_delete: :restrict
  add_foreign_key "agreements", "organizations", on_delete: :restrict
  add_foreign_key "assets", "organizations", on_delete: :restrict
  add_foreign_key "customers", "organizations", on_delete: :restrict
  add_foreign_key "invoices", "agreements", on_delete: :nullify
  add_foreign_key "invoices", "customers", on_delete: :restrict
  add_foreign_key "invoices", "organizations", on_delete: :restrict
  add_foreign_key "payments", "invoices", on_delete: :cascade
  add_foreign_key "transactions", "assets", on_delete: :nullify
  add_foreign_key "transactions", "organizations", on_delete: :restrict
  add_foreign_key "users", "organizations"
end
