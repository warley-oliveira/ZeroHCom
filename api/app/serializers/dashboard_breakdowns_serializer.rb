class DashboardBreakdownsSerializer
  def self.render(period:, currency:, expense_by_category:, income_by_category:,
                  income_by_source:, payment_methods:)
    {
      currency: currency,
      period: { from: period[:from].iso8601, to: period[:to].iso8601 },
      expense_by_category: expense_by_category,
      income_by_category: income_by_category,
      income_by_source: income_by_source,
      payment_methods: payment_methods
    }
  end
end
