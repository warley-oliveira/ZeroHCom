class DashboardSummarySerializer
  def self.render(period:, currency:, totals:, previous_totals:, mrr_cents:,
                  active_contracts_count:, occupancy:, overdue:, cash_collected_cents:,
                  invoice_status:, aging:)
    {
      currency: currency,
      period: { from: period[:from].iso8601, to: period[:to].iso8601 },
      kpis: {
        revenue_cents: totals[:income_cents],
        expense_cents: totals[:expense_cents],
        net_profit_cents: totals[:net_cents],
        mrr_cents: mrr_cents,
        active_contracts_count: active_contracts_count,
        fleet_occupancy: occupancy,
        overdue_cents: overdue[:amount_cents],
        overdue_count: overdue[:count],
        cash_collected_cents: cash_collected_cents
      },
      deltas: {
        revenue_cents: delta(totals[:income_cents], previous_totals[:income_cents]),
        expense_cents: delta(totals[:expense_cents], previous_totals[:expense_cents]),
        net_profit_cents: delta(totals[:net_cents], previous_totals[:net_cents])
      },
      invoice_status: invoice_status,
      overdue_aging: aging
    }
  end

  # delta_pct is null when the previous window was zero (no meaningful percentage).
  def self.delta(current, previous)
    delta_cents = current - previous
    pct = previous.zero? ? nil : ((delta_cents.to_f / previous.abs) * 100).round(1)
    { current_cents: current, previous_cents: previous, delta_cents: delta_cents, delta_pct: pct }
  end
  private_class_method :delta
end
