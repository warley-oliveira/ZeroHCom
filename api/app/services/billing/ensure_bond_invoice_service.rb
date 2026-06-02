module Billing
  # Lazily materialises the one-off bond (caução) invoice for an agreement.
  #
  # The bond invoice (kind: "bond") is the single source of truth for whether
  # the bond has been paid, so we never duplicate that state onto the agreement.
  # Idempotent: a partial unique index guarantees at most one bond invoice per
  # agreement, and a racing insert is rescued and re-read.
  #
  #   Billing::EnsureBondInvoiceService.call(agreement: agreement)
  #
  # Returns the bond Invoice, or nil when the agreement requires no bond.
  class EnsureBondInvoiceService
    def self.call(**kwargs)
      new(**kwargs).call
    end

    def initialize(agreement:, date: Date.current, due_in_days: 0)
      @agreement = agreement
      @date = date
      @due_in_days = due_in_days
    end

    def call
      return nil unless @agreement.bond_required?

      invoice = @agreement.bond_invoice
      return create_bond_invoice! if invoice.nil?

      # Keep an unpaid bond invoice in sync with the agreement's current bond
      # amount; never touch a bond that's already been settled.
      if invoice.open? && invoice.amount_cents != @agreement.bond_amount_cents
        invoice.update!(amount_cents: @agreement.bond_amount_cents)
      end

      invoice
    rescue ActiveRecord::RecordNotUnique
      # Lost a race against a concurrent request — the bond invoice now exists.
      @agreement.bond_invoice
    end

    private

    def create_bond_invoice!
      @agreement.invoices.create!(
        organization: @agreement.organization,
        customer: @agreement.customer,
        kind: "bond",
        amount_cents: @agreement.bond_amount_cents,
        currency: @agreement.currency,
        status: "open",
        issue_date: @date,
        due_date: @date + @due_in_days.days
      )
    end
  end
end
