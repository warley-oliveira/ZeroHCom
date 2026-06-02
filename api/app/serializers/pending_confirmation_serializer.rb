# Serializes a customer-claimed payment awaiting org review, with just enough
# invoice/customer context for the dashboard review modal (approve/reject).
class PendingConfirmationSerializer
  def self.render(payments)
    { payments: payments.map { |payment| render_one(payment) } }
  end

  def self.render_one(payment)
    invoice = payment.invoice
    {
      id: payment.id,
      invoice_id: invoice.id,
      method: payment.method,
      external_id: payment.external_id,
      payment_date: payment.payment_date.iso8601,
      currency: payment.currency,
      amount_cents: payment.amount_cents,
      amount_formatted: payment.amount.format(symbol: false, no_cents_if_whole: false),
      kind: invoice.kind,
      invoice_reference: invoice.payment_reference,
      invoice_status: invoice.status,
      customer: render_customer(invoice.customer)
    }
  end
  private_class_method :render_one

  def self.render_customer(customer)
    return nil if customer.blank?

    { id: customer.id, name: customer.name, email: customer.email }
  end
  private_class_method :render_customer
end
