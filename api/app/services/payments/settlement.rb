module Payments
  # Shared settlement logic: marking an invoice paid once its CONFIRMED payments
  # cover it, and posting the income ledger entry. Pending payments never count
  # toward settlement and never hit the ledger until confirmed.
  module Settlement
    DEFAULT_CATEGORY = "car_rental".freeze

    module_function

    def settle_invoice_if_fully_paid!(invoice)
      paid_cents = invoice.payments.confirmed.sum(:amount_cents)
      return if paid_cents < invoice.amount_cents

      invoice.update!(status: "paid")
    end

    def record_income!(invoice, payment, category = nil)
      Transaction.create!(
        organization: invoice.organization,
        amount_cents: payment.amount_cents,
        currency: payment.currency,
        direction: "income",
        category: category.presence || DEFAULT_CATEGORY,
        source: payment,
        # Attribute the revenue to the rented asset (car) via the agreement.
        asset: invoice.agreement&.asset,
        date: payment.payment_date
      )
    end
  end
end
