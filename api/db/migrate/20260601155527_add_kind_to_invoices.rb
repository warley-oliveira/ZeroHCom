class AddKindToInvoices < ActiveRecord::Migration[8.1]
  # Distinguishes recurring rent invoices from one-off bond (caução) invoices.
  # The bond invoice is the single source of truth for the bond paid state.
  def change
    add_column :invoices, :kind, :string, default: "rent", null: false
    add_index :invoices, :kind

    # At most one bond invoice per agreement — DB-level idempotency for the
    # lazy EnsureBondInvoiceService (a racing second insert raises RecordNotUnique).
    add_index :invoices, %i[agreement_id kind],
              unique: true,
              where: "kind = 'bond'",
              name: "index_one_bond_invoice_per_agreement"
  end
end
