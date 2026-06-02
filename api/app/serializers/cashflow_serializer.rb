class CashflowSerializer
  def self.render(period:, bucket:, currency:, income_expense:, billed_collected:)
    {
      currency: currency,
      bucket: bucket,
      period: { from: period[:from].iso8601, to: period[:to].iso8601 },
      income_expense: income_expense,
      billed_collected: billed_collected
    }
  end
end
