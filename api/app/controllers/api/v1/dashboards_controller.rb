module Api
  module V1
    class DashboardsController < BaseController
      # GET /api/v1/dashboards/fleet_summary
      # Net profit (income - expense) per asset, aggregated in the database.
      def fleet_summary
        totals = Current.organization.transactions
                        .where.not(asset_id: nil)
                        .group(:asset_id, :direction)
                        .sum(:amount_cents)

        summary = Current.organization.assets.order(:name).map do |asset|
          FleetSummarySerializer.render(
            asset,
            income_cents: totals[[ asset.id, "income" ]] || 0,
            expense_cents: totals[[ asset.id, "expense" ]] || 0
          )
        end

        render json: summary
      end

      # GET /api/v1/dashboards/summary?from=&to=
      # Org-wide KPIs over [from, to] with period-over-period deltas, plus
      # point-in-time invoice health (status distribution + overdue aging).
      def summary
        period = parse_period(default_days: DEFAULT_SUMMARY_DAYS)
        return render_invalid_range unless period

        org = Current.organization
        prev = previous_period(period)

        render json: DashboardSummarySerializer.render(
          period: period,
          currency: DEFAULT_CURRENCY,
          totals: income_expense_totals(org, period),
          previous_totals: income_expense_totals(org, prev),
          mrr_cents: mrr_cents(org),
          active_contracts_count: org.agreements.active.count,
          occupancy: occupancy(org),
          overdue: overdue_snapshot(org, period[:to]),
          cash_collected_cents: cash_collected(org, period),
          invoice_status: invoice_status_distribution(org),
          aging: overdue_aging(org, period[:to])
        )
      end

      # GET /api/v1/dashboards/cashflow?from=&to=&bucket=day|week|month
      # Income/expense and billed/collected time series, zero-filled across the range.
      def cashflow
        period = parse_period(default_days: DEFAULT_CHART_DAYS)
        return render_invalid_range unless period

        bucket = params[:bucket].presence || default_bucket(period)
        return render_invalid_bucket unless ALLOWED_BUCKETS.include?(bucket)

        org = Current.organization

        render json: CashflowSerializer.render(
          period: period,
          bucket: bucket,
          currency: DEFAULT_CURRENCY,
          income_expense: income_expense_series(org, period, bucket),
          billed_collected: billed_collected_series(org, period, bucket)
        )
      end

      # GET /api/v1/dashboards/breakdowns?from=&to=
      # Category/source/method distributions over the period.
      def breakdowns
        period = parse_period(default_days: DEFAULT_CHART_DAYS)
        return render_invalid_range unless period

        org = Current.organization

        render json: DashboardBreakdownsSerializer.render(
          period: period,
          currency: DEFAULT_CURRENCY,
          expense_by_category: category_totals(org, period, "expense"),
          income_by_category: category_totals(org, period, "income"),
          income_by_source: source_totals(org, period),
          payment_methods: payment_method_totals(org, period)
        )
      end

      # GET /api/v1/dashboards/activity?limit=
      # Recent transactions, payments and invoices merged by timestamp (desc).
      def activity
        org = Current.organization
        limit = activity_limit
        events = (recent_transactions(org, limit) +
                  recent_payments(org, limit) +
                  recent_invoices(org, limit))
                 .sort_by { |event| event[:at] }
                 .reverse
                 .first(limit)

        render json: ActivityFeedSerializer.render(events)
      end

      # GET /api/v1/dashboards/pending_confirmations
      # Customer-claimed payments (PayID/bank "Já paguei") awaiting org review.
      # This is the action queue surfaced at the top of the activity panel.
      def pending_confirmations
        payments = Payment.where(invoice: Current.organization.invoices, status: "pending")
                          .includes(invoice: :customer)
                          .order(payment_date: :desc)
                          .limit(PENDING_CONFIRMATIONS_LIMIT)

        render json: PendingConfirmationSerializer.render(payments)
      end

      private

      DEFAULT_CURRENCY = "AUD".freeze
      DEFAULT_SUMMARY_DAYS = 30
      DEFAULT_CHART_DAYS = 90
      ALLOWED_BUCKETS = %w[day week month].freeze
      PENDING_CONFIRMATIONS_LIMIT = 50

      # --- period parsing ------------------------------------------------------

      # Returns { from: Date, to: Date } or nil when params are malformed/inverted.
      def parse_period(default_days:)
        to = parse_date(params[:to]) || Date.current
        from = parse_date(params[:from]) || (to - default_days.days)
        return nil if from > to

        { from: from, to: to }
      rescue ArgumentError
        nil
      end

      def parse_date(value)
        return nil if value.blank?

        Date.iso8601(value)
      end

      # Immediately-preceding window of equal length (for PoP deltas).
      def previous_period(period)
        length = (period[:to] - period[:from]).to_i + 1
        prev_to = period[:from] - 1
        { from: prev_to - (length - 1), to: prev_to }
      end

      # Inclusive datetime range for datetime columns (transactions.date, payments.payment_date).
      def datetime_range(period)
        period[:from].beginning_of_day..period[:to].end_of_day
      end

      def render_invalid_range
        render json: { error: "invalid_date_range" }, status: :unprocessable_entity
      end

      # --- aggregations (all SUM/COUNT/GROUP BY in SQL) ------------------------

      def income_expense_totals(org, period)
        by_dir = org.transactions.where(date: datetime_range(period)).group(:direction).sum(:amount_cents)
        income = by_dir["income"] || 0
        expense = by_dir["expense"] || 0
        { income_cents: income, expense_cents: expense, net_cents: income - expense }
      end

      # MRR snapshot: active agreements normalized to a monthly figure.
      def mrr_cents(org)
        by_cycle = org.agreements.active.group(:billing_cycle).sum(:amount_cents)
        monthly = by_cycle["monthly"] || 0
        weekly = by_cycle["weekly"] || 0
        monthly + (weekly * 52 / 12)
      end

      def occupancy(org)
        by_status = org.assets.group(:status).count
        total = by_status.values.sum
        rented = by_status["rented"] || 0
        { rented: rented, total: total, rate: total.zero? ? 0.0 : (rented.to_f / total).round(4) }
      end

      # Overdue = open/overdue invoices past due as of the period end (point-in-time).
      def overdue_snapshot(org, as_of)
        scope = overdue_scope(org, as_of)
        { amount_cents: scope.sum(:amount_cents), count: scope.count }
      end

      def overdue_scope(org, as_of)
        org.invoices.where(status: %w[open overdue]).where("due_date < ?", as_of)
      end

      def cash_collected(org, period)
        org.invoices.joins(:payments)
           .where(payments: { payment_date: datetime_range(period) })
           .sum("payments.amount_cents")
      end

      def invoice_status_distribution(org)
        counts = org.invoices.group(:status).count
        amounts = org.invoices.group(:status).sum(:amount_cents)
        order = Invoice.statuses.keys
        counts.keys.sort_by { |s| order.index(s) || order.size }.map do |status|
          { status: status, count: counts[status], amount_cents: amounts[status] || 0 }
        end
      end

      # Aging buckets for overdue invoices, computed via a parameterized SQL CASE.
      def overdue_aging(org, as_of)
        scope = overdue_scope(org, as_of)
        case_sql = Arel.sql(
          ActiveRecord::Base.sanitize_sql_array([
            "CASE WHEN due_date >= ? THEN '0_30' WHEN due_date >= ? THEN '31_60' ELSE '60_plus' END",
            as_of - 30, as_of - 60
          ])
        )
        counts = scope.group(case_sql).count
        amounts = scope.group(case_sql).sum(:amount_cents)

        %w[0_30 31_60 60_plus].map do |bucket|
          { bucket: bucket, count: counts[bucket] || 0, amount_cents: amounts[bucket] || 0 }
        end
      end

      # --- cashflow series -----------------------------------------------------

      def render_invalid_bucket
        render json: { error: "invalid_bucket" }, status: :unprocessable_entity
      end

      def default_bucket(period)
        days = (period[:to] - period[:from]).to_i + 1
        return "day" if days <= 31
        return "week" if days <= 120

        "month"
      end

      # Group key as a text label ("YYYY-MM-DD" for day/week, "YYYY-MM" for month).
      # Built from Arel nodes (no string SQL) so the bucket is safely parameterized.
      def bucket_expr(arel_column, bucket)
        fmt = bucket == "month" ? "YYYY-MM" : "YYYY-MM-DD"
        truncated = Arel::Nodes::NamedFunction.new(
          "date_trunc", [ Arel::Nodes.build_quoted(bucket), arel_column ]
        )
        Arel::Nodes::NamedFunction.new("to_char", [ truncated, Arel::Nodes.build_quoted(fmt) ])
      end

      # Every bucket label across the range, so the series has no gaps.
      def bucket_labels(period, bucket)
        case bucket
        when "day"
          (period[:from]..period[:to]).map { |d| d.strftime("%Y-%m-%d") }
        when "week"
          labels = []
          cursor = period[:from].beginning_of_week(:monday)
          while cursor <= period[:to]
            labels << cursor.strftime("%Y-%m-%d")
            cursor += 7
          end
          labels
        else # month
          labels = []
          cursor = period[:from].beginning_of_month
          while cursor <= period[:to]
            labels << cursor.strftime("%Y-%m")
            cursor = cursor.next_month
          end
          labels
        end
      end

      def income_expense_series(org, period, bucket)
        expr = bucket_expr(Transaction.arel_table[:date], bucket)
        rows = org.transactions.where(date: datetime_range(period)).group(expr, :direction).sum(:amount_cents)

        by_label = Hash.new { |h, k| h[k] = { "income" => 0, "expense" => 0 } }
        rows.each { |(label, direction), cents| by_label[label][direction] = cents }

        bucket_labels(period, bucket).map do |label|
          income = by_label[label]["income"]
          expense = by_label[label]["expense"]
          { bucket: label, income_cents: income, expense_cents: expense, net_cents: income - expense }
        end
      end

      def billed_collected_series(org, period, bucket)
        billed = org.invoices
                    .where(issue_date: period[:from]..period[:to])
                    .group(bucket_expr(Invoice.arel_table[:issue_date], bucket))
                    .sum(:amount_cents)

        collected = org.invoices.joins(:payments)
                       .where(payments: { payment_date: datetime_range(period) })
                       .group(bucket_expr(Payment.arel_table[:payment_date], bucket))
                       .sum("payments.amount_cents")

        bucket_labels(period, bucket).map do |label|
          { bucket: label, billed_cents: billed[label] || 0, collected_cents: collected[label] || 0 }
        end
      end

      # --- breakdowns ----------------------------------------------------------

      def category_totals(org, period, direction)
        org.transactions
           .where(direction: direction, date: datetime_range(period))
           .group(:category).sum(:amount_cents)
           .sort_by { |_category, cents| -cents }
           .map { |category, cents| { category: category, amount_cents: cents } }
      end

      def source_totals(org, period)
        org.transactions
           .where(direction: "income", date: datetime_range(period))
           .group(:source_type).sum(:amount_cents)
           .sort_by { |_source, cents| -cents }
           .map { |source_type, cents| { source_type: source_type, amount_cents: cents } }
      end

      def payment_method_totals(org, period)
        base = org.invoices.joins(:payments).where(payments: { payment_date: datetime_range(period) })
        amounts = base.group("payments.method").sum("payments.amount_cents")
        counts = base.group("payments.method").count("payments.id")
        amounts.sort_by { |_method, cents| -cents }
               .map { |method, cents| { method: method, amount_cents: cents, count: counts[method] || 0 } }
      end

      # --- activity feed -------------------------------------------------------

      def activity_limit
        raw = params[:limit].to_i
        return 15 if raw <= 0

        [ raw, 50 ].min
      end

      def recent_transactions(org, limit)
        org.transactions.includes(:asset).order(date: :desc).limit(limit).map do |t|
          {
            type: "transaction", id: t.id, at: t.date,
            direction: t.direction, category: t.category,
            amount_cents: t.amount_cents, currency: t.currency,
            asset: t.asset && { id: t.asset.id, name: t.asset.name }
          }
        end
      end

      # Only confirmed payments belong in the historical timeline — pending claims
      # surface in the #pending_confirmations action queue instead.
      def recent_payments(org, limit)
        Payment.where(invoice: org.invoices).confirmed
               .includes(invoice: :customer)
               .order(payment_date: :desc).limit(limit).map do |p|
          {
            type: "payment", id: p.id, at: p.payment_date,
            method: p.method, amount_cents: p.amount_cents, currency: p.currency,
            customer_name: p.invoice.customer&.name
          }
        end
      end

      def recent_invoices(org, limit)
        org.invoices.includes(:customer).order(created_at: :desc).limit(limit).map do |i|
          {
            type: "invoice", id: i.id, at: i.created_at,
            status: i.status, amount_cents: i.amount_cents, currency: i.currency,
            customer_name: i.customer&.name
          }
        end
      end
    end
  end
end
