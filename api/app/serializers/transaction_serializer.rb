class TransactionSerializer
  def self.render(transaction)
    {
      id: transaction.id,
      direction: transaction.direction,
      category: transaction.category,
      date: transaction.date,
      currency: transaction.currency,
      amount_cents: transaction.amount_cents,
      amount_formatted: transaction.amount.format(symbol: false, no_cents_if_whole: false),
      asset_id: transaction.asset_id,
      source: render_source(transaction)
    }
  end

  def self.render_source(transaction)
    return nil if transaction.source_type.blank? || transaction.source_id.blank?

    { type: transaction.source_type, id: transaction.source_id }
  end
  private_class_method :render_source
end
