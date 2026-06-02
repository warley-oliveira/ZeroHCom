class PaymentSerializer
  def self.render(payment)
    {
      id: payment.id,
      invoice_id: payment.invoice_id,
      external_id: payment.external_id,
      method: payment.method,
      status: payment.status,
      payment_date: payment.payment_date,
      currency: payment.currency,
      amount_cents: payment.amount_cents,
      amount_formatted: payment.amount.format(symbol: false, no_cents_if_whole: false)
    }
  end
end
