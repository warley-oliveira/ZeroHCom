class AddAgreementToInvoices < ActiveRecord::Migration[8.1]
  def change
    add_reference :invoices, :agreement, type: :uuid, null: true,
                                         foreign_key: { on_delete: :nullify }
  end
end
