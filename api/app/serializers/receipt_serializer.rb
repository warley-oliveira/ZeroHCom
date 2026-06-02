class ReceiptSerializer
  def self.render(payment, invoice)
    {
      receipt_id: payment.id,
      external_id: payment.external_id,
      method: payment.method,
      # "succeeded" for a settled (confirmed) payment, "pending" for a claim
      # awaiting organization review.
      status: payment.confirmed? ? "succeeded" : "pending",
      paid_at: payment.payment_date,
      reference: invoice.payment_reference,
      invoice: {
        id: invoice.id,
        kind: invoice.kind,
        status: invoice.reload.status
      },
      currency: payment.currency,
      amount_cents: payment.amount_cents,
      amount_formatted: payment.amount.format(symbol: false, no_cents_if_whole: false)
    }
  end
end
