require 'rails_helper'

RSpec.describe 'Api::V1::Dashboards', type: :request do
  let(:org_a)  { create(:organization) }
  let(:org_b)  { create(:organization) }
  let(:user_a) { create(:user, organization: org_a) }

  describe 'GET /api/v1/dashboards/fleet_summary' do
    context 'when unauthenticated' do
      it 'returns 401' do
        get '/api/v1/dashboards/fleet_summary'
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'when authenticated' do
      let!(:car) { create(:asset, organization: org_a, name: 'Ford Fusion') }
      let!(:other_car) { create(:asset, organization: org_a, name: 'Toyota Corolla') }

      before do
        # Car: 50,000 + 12,000 income, 8,000 + 3,000 expense -> net 51,000
        create(:transaction, organization: org_a, asset: car, direction: 'income',  category: 'car_rental', amount_cents: 50_000)
        create(:transaction, organization: org_a, asset: car, direction: 'income',  category: 'uber_income', amount_cents: 12_000)
        create(:transaction, organization: org_a, asset: car, direction: 'expense', category: 'fuel',        amount_cents: 8_000)
        create(:transaction, organization: org_a, asset: car, direction: 'expense', category: 'maintenance', amount_cents: 3_000)

        # Transaction without an asset must not count toward any car.
        create(:transaction, organization: org_a, asset: nil, direction: 'income', category: 'misc', amount_cents: 99_999)

        # Another tenant's data must never leak in.
        leak_car = create(:asset, organization: org_b)
        create(:transaction, organization: org_b, asset: leak_car, direction: 'income', amount_cents: 777_000)
      end

      it 'returns the net profit per car for the current tenant only' do
        get '/api/v1/dashboards/fleet_summary', headers: auth_headers(user_a)

        expect(response).to have_http_status(:ok)
        body = JSON.parse(response.body)

        # Only org_a's two cars, ordered by name.
        expect(body.map { |row| row['asset']['name'] }).to eq([ 'Ford Fusion', 'Toyota Corolla' ])

        ford = body.find { |row| row['asset']['id'] == car.id }
        expect(ford).to include(
          'income_cents' => 62_000,
          'expense_cents' => 11_000,
          'net_profit_cents' => 51_000
        )
      end

      it 'reports zeros for a car without any transactions' do
        get '/api/v1/dashboards/fleet_summary', headers: auth_headers(user_a)

        idle = JSON.parse(response.body).find { |row| row['asset']['id'] == other_car.id }
        expect(idle).to include(
          'income_cents' => 0,
          'expense_cents' => 0,
          'net_profit_cents' => 0
        )
      end

      it 'produces a negative net profit when expenses exceed income' do
        loss_car = create(:asset, organization: org_a, name: 'Aaa Money Pit')
        create(:transaction, organization: org_a, asset: loss_car, direction: 'income',  amount_cents: 1_000)
        create(:transaction, organization: org_a, asset: loss_car, direction: 'expense', amount_cents: 9_000)

        get '/api/v1/dashboards/fleet_summary', headers: auth_headers(user_a)

        row = JSON.parse(response.body).find { |r| r['asset']['id'] == loss_car.id }
        expect(row['net_profit_cents']).to eq(-8_000)
      end
    end
  end

  describe 'GET /api/v1/dashboards/summary' do
    def summary_body(user, params = {})
      get '/api/v1/dashboards/summary', params: params, headers: auth_headers(user)
      JSON.parse(response.body)
    end

    it 'returns 401 when unauthenticated' do
      get '/api/v1/dashboards/summary'
      expect(response).to have_http_status(:unauthorized)
    end

    it 'returns zeros for an organization with no data' do
      body = summary_body(user_a)

      expect(response).to have_http_status(:ok)
      expect(body['kpis']).to include(
        'revenue_cents' => 0, 'expense_cents' => 0, 'net_profit_cents' => 0,
        'mrr_cents' => 0, 'active_contracts_count' => 0,
        'overdue_cents' => 0, 'overdue_count' => 0, 'cash_collected_cents' => 0
      )
      expect(body['kpis']['fleet_occupancy']).to eq('rented' => 0, 'total' => 0, 'rate' => 0.0)
      expect(body['deltas']['revenue_cents']).to eq(
        'current_cents' => 0, 'previous_cents' => 0, 'delta_cents' => 0, 'delta_pct' => nil
      )
      expect(body['invoice_status']).to eq([])
      expect(body['overdue_aging']).to eq([
        { 'bucket' => '0_30', 'count' => 0, 'amount_cents' => 0 },
        { 'bucket' => '31_60', 'count' => 0, 'amount_cents' => 0 },
        { 'bucket' => '60_plus', 'count' => 0, 'amount_cents' => 0 }
      ])
    end

    it 'returns 422 for an inverted range' do
      summary_body(user_a, from: '2026-02-10', to: '2026-02-01')
      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)).to eq('error' => 'invalid_date_range')
    end

    it 'returns 422 for a malformed date' do
      summary_body(user_a, from: 'not-a-date')
      expect(response).to have_http_status(:unprocessable_entity)
    end

    context 'with seeded data for the current tenant' do
      let(:today) { Date.current }

      before do
        # Income/expense within the default 30-day window.
        create(:transaction, organization: org_a, direction: 'income',  amount_cents: 50_000, date: 2.days.ago)
        create(:transaction, organization: org_a, direction: 'income',  amount_cents: 30_000, date: 5.days.ago)
        create(:transaction, organization: org_a, direction: 'expense', amount_cents: 20_000, date: 3.days.ago)
        # Previous (immediately-preceding) window — drives the deltas.
        create(:transaction, organization: org_a, direction: 'income',  amount_cents: 40_000, date: 45.days.ago)
        # Far outside both windows — must not count.
        create(:transaction, organization: org_a, direction: 'income',  amount_cents: 99_999, date: 200.days.ago)

        # Agreements -> MRR + active count (cancelled excluded).
        create(:agreement, organization: org_a, status: 'active',    billing_cycle: 'monthly', amount_cents: 50_000)
        create(:agreement, organization: org_a, status: 'active',    billing_cycle: 'weekly',  amount_cents: 10_000)
        create(:agreement, organization: org_a, status: 'cancelled', billing_cycle: 'monthly', amount_cents: 999_000)

        # Assets -> occupancy (2 rented of 4).
        create(:asset, organization: org_a, status: 'rented')
        create(:asset, organization: org_a, status: 'rented')
        create(:asset, organization: org_a, status: 'available')
        create(:asset, organization: org_a, status: 'maintenance')

        # Invoices -> status distribution + overdue + aging.
        open_overdue = create(:invoice, organization: org_a, status: 'open',    amount_cents: 15_000, due_date: today - 10)
        create(:invoice, organization: org_a, status: 'open',    amount_cents: 20_000, due_date: today + 10)
        create(:invoice, organization: org_a, status: 'overdue', amount_cents: 25_000, due_date: today - 40)
        create(:invoice, organization: org_a, status: 'overdue', amount_cents: 5_000,  due_date: today - 90)
        paid = create(:invoice, organization: org_a, status: 'paid', amount_cents: 12_000, due_date: today - 5)

        # Cash collected within window (+ one outside to verify exclusion).
        create(:payment, invoice: paid, amount_cents: 12_000, payment_date: 3.days.ago)
        create(:payment, invoice: open_overdue, amount_cents: 5_000, payment_date: 50.days.ago)

        # Another tenant's data must never leak in.
        create(:transaction, organization: org_b, direction: 'income', amount_cents: 1_000_000, date: 1.day.ago)
        create(:agreement,   organization: org_b, status: 'active', billing_cycle: 'monthly', amount_cents: 1_000_000)
        create(:asset,       organization: org_b, status: 'rented')
        create(:invoice,     organization: org_b, status: 'overdue', amount_cents: 1_000_000, due_date: today - 5)
      end

      it 'computes period KPIs scoped to the tenant' do
        kpis = summary_body(user_a)['kpis']

        expect(response).to have_http_status(:ok)
        expect(kpis).to include(
          'revenue_cents' => 80_000,
          'expense_cents' => 20_000,
          'net_profit_cents' => 60_000,
          'mrr_cents' => 93_333, # 50_000 monthly + (10_000 weekly * 52 / 12)
          'active_contracts_count' => 2,
          'overdue_cents' => 45_000,
          'overdue_count' => 3,
          'cash_collected_cents' => 12_000
        )
        expect(kpis['fleet_occupancy']).to eq('rented' => 2, 'total' => 4, 'rate' => 0.5)
      end

      it 'computes period-over-period deltas (null pct when previous is zero)' do
        deltas = summary_body(user_a)['deltas']

        expect(deltas['revenue_cents']).to eq(
          'current_cents' => 80_000, 'previous_cents' => 40_000, 'delta_cents' => 40_000, 'delta_pct' => 100.0
        )
        expect(deltas['expense_cents']).to eq(
          'current_cents' => 20_000, 'previous_cents' => 0, 'delta_cents' => 20_000, 'delta_pct' => nil
        )
        expect(deltas['net_profit_cents']).to eq(
          'current_cents' => 60_000, 'previous_cents' => 40_000, 'delta_cents' => 20_000, 'delta_pct' => 50.0
        )
      end

      it 'breaks down invoice status and overdue aging' do
        body = summary_body(user_a)

        statuses = body['invoice_status'].index_by { |row| row['status'] }
        expect(statuses['open']).to include('count' => 2, 'amount_cents' => 35_000)
        expect(statuses['overdue']).to include('count' => 2, 'amount_cents' => 30_000)
        expect(statuses['paid']).to include('count' => 1, 'amount_cents' => 12_000)

        expect(body['overdue_aging']).to eq([
          { 'bucket' => '0_30',    'count' => 1, 'amount_cents' => 15_000 },
          { 'bucket' => '31_60',   'count' => 1, 'amount_cents' => 25_000 },
          { 'bucket' => '60_plus', 'count' => 1, 'amount_cents' => 5_000 }
        ])
      end
    end
  end

  describe 'GET /api/v1/dashboards/cashflow' do
    let(:today) { Date.current }

    it 'returns 401 when unauthenticated' do
      get '/api/v1/dashboards/cashflow'
      expect(response).to have_http_status(:unauthorized)
    end

    it 'returns 422 for an invalid bucket' do
      get '/api/v1/dashboards/cashflow', params: { bucket: 'fortnight' }, headers: auth_headers(user_a)
      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)).to eq('error' => 'invalid_bucket')
    end

    it 'returns daily income/expense and billed/collected series, zero-filled' do
      # Transactions across the 3-day window (today-1 stays empty -> zero-filled).
      create(:transaction, organization: org_a, direction: 'income',  amount_cents: 10_000, date: (today - 2).noon)
      create(:transaction, organization: org_a, direction: 'expense', amount_cents: 4_000,  date: (today - 2).noon)
      create(:transaction, organization: org_a, direction: 'income',  amount_cents: 6_000,  date: today.noon)

      inv_a = create(:invoice, organization: org_a, issue_date: today - 2, amount_cents: 20_000)
      inv_b = create(:invoice, organization: org_a, issue_date: today,     amount_cents: 5_000)
      create(:payment, invoice: inv_a, amount_cents: 8_000, payment_date: (today - 2).noon)
      create(:payment, invoice: inv_b, amount_cents: 3_000, payment_date: today.noon)

      # Another tenant must not leak in.
      create(:transaction, organization: org_b, direction: 'income', amount_cents: 999_000, date: today.noon)

      get '/api/v1/dashboards/cashflow',
          params: { from: (today - 2).iso8601, to: today.iso8601, bucket: 'day' },
          headers: auth_headers(user_a)

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)

      labels = [ today - 2, today - 1, today ].map { |d| d.strftime('%Y-%m-%d') }
      expect(body['bucket']).to eq('day')
      expect(body['income_expense'].map { |p| p['bucket'] }).to eq(labels)

      expect(body['income_expense']).to eq([
        { 'bucket' => labels[0], 'income_cents' => 10_000, 'expense_cents' => 4_000, 'net_cents' => 6_000 },
        { 'bucket' => labels[1], 'income_cents' => 0,      'expense_cents' => 0,     'net_cents' => 0 },
        { 'bucket' => labels[2], 'income_cents' => 6_000,  'expense_cents' => 0,     'net_cents' => 6_000 }
      ])

      expect(body['billed_collected']).to eq([
        { 'bucket' => labels[0], 'billed_cents' => 20_000, 'collected_cents' => 8_000 },
        { 'bucket' => labels[1], 'billed_cents' => 0,      'collected_cents' => 0 },
        { 'bucket' => labels[2], 'billed_cents' => 5_000,  'collected_cents' => 3_000 }
      ])
    end
  end

  describe 'GET /api/v1/dashboards/breakdowns' do
    it 'returns 401 when unauthenticated' do
      get '/api/v1/dashboards/breakdowns'
      expect(response).to have_http_status(:unauthorized)
    end

    it 'returns category/source/method distributions for the tenant' do
      create(:transaction, :expense, organization: org_a, category: 'fuel',        amount_cents: 8_000, date: 2.days.ago)
      create(:transaction, :expense, organization: org_a, category: 'fuel',        amount_cents: 2_000, date: 3.days.ago)
      create(:transaction, :expense, organization: org_a, category: 'maintenance', amount_cents: 5_000, date: 1.day.ago)
      create(:transaction, organization: org_a, direction: 'income', category: 'car_rental',  amount_cents: 30_000, date: 2.days.ago)
      create(:transaction, organization: org_a, direction: 'income', category: 'uber_income', amount_cents: 12_000, date: 2.days.ago)

      inv = create(:invoice, organization: org_a)
      create(:payment, invoice: inv, amount_cents: 8_000, method: 'credit_card',   payment_date: 2.days.ago)
      create(:payment, invoice: inv, amount_cents: 2_000, method: 'credit_card',   payment_date: 1.day.ago)
      create(:payment, invoice: inv, amount_cents: 3_000, method: 'bank_transfer', payment_date: 2.days.ago)

      # Another tenant must not leak.
      create(:transaction, :expense, organization: org_b, category: 'fuel', amount_cents: 999_000, date: 1.day.ago)

      get '/api/v1/dashboards/breakdowns', headers: auth_headers(user_a)

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)

      expect(body['expense_by_category']).to eq([
        { 'category' => 'fuel',        'amount_cents' => 10_000 },
        { 'category' => 'maintenance', 'amount_cents' => 5_000 }
      ])
      expect(body['income_by_category']).to eq([
        { 'category' => 'car_rental',  'amount_cents' => 30_000 },
        { 'category' => 'uber_income', 'amount_cents' => 12_000 }
      ])
      expect(body['income_by_source']).to eq([
        { 'source_type' => nil, 'amount_cents' => 42_000 }
      ])

      methods = body['payment_methods'].index_by { |row| row['method'] }
      expect(methods['credit_card']).to include('count' => 2, 'amount_cents' => 10_000)
      expect(methods['bank_transfer']).to include('count' => 1, 'amount_cents' => 3_000)
    end
  end

  describe 'GET /api/v1/dashboards/activity' do
    it 'returns 401 when unauthenticated' do
      get '/api/v1/dashboards/activity'
      expect(response).to have_http_status(:unauthorized)
    end

    it 'merges recent transactions, payments and invoices for the tenant' do
      create(:transaction, organization: org_a, direction: 'income', category: 'car_rental', amount_cents: 7_000, date: 1.day.ago)
      paid_inv = create(:invoice, organization: org_a)
      create(:payment, invoice: paid_inv, amount_cents: 6_000, method: 'pix', payment_date: 2.hours.ago)

      # Another tenant must not leak.
      other = create(:invoice, organization: org_b)
      create(:payment, invoice: other, amount_cents: 999_000, method: 'pix', payment_date: 1.hour.ago)
      create(:transaction, organization: org_b, direction: 'income', amount_cents: 999_000, date: 1.minute.ago)

      get '/api/v1/dashboards/activity', headers: auth_headers(user_a)

      expect(response).to have_http_status(:ok)
      events = JSON.parse(response.body)['events']

      expect(events.map { |e| e['type'] }).to include('transaction', 'payment', 'invoice')
      expect(events.map { |e| e['amount_cents'] }).not_to include(999_000)

      payment = events.find { |e| e['type'] == 'payment' }
      expect(payment).to include('method' => 'pix', 'amount_cents' => 6_000)
      expect(payment['customer_name']).to be_present
    end

    it 'honors the limit cap' do
      create_list(:transaction, 5, organization: org_a)

      get '/api/v1/dashboards/activity', params: { limit: 2 }, headers: auth_headers(user_a)

      expect(JSON.parse(response.body)['events'].size).to eq(2)
    end

    it 'excludes pending payment claims from the historical timeline' do
      inv = create(:invoice, organization: org_a)
      create(:payment, :pending, invoice: inv, amount_cents: 4_200, method: 'payid', payment_date: 1.hour.ago)

      get '/api/v1/dashboards/activity', headers: auth_headers(user_a)

      payments = JSON.parse(response.body)['events'].select { |e| e['type'] == 'payment' }
      expect(payments.map { |p| p['amount_cents'] }).not_to include(4_200)
    end
  end

  describe 'GET /api/v1/dashboards/pending_confirmations' do
    it 'returns 401 when unauthenticated' do
      get '/api/v1/dashboards/pending_confirmations'
      expect(response).to have_http_status(:unauthorized)
    end

    it 'returns only pending claims for the tenant, with invoice and customer context' do
      customer = create(:customer, organization: org_a, name: 'Alice Co')
      invoice = create(:invoice, organization: org_a, customer: customer, kind: 'rent')
      pending = create(:payment, :pending, invoice: invoice, amount_cents: 9_900,
                                            method: 'payid', payment_date: 2.hours.ago)

      # Confirmed/rejected claims and other tenants must not appear.
      create(:payment, invoice: invoice, amount_cents: 1_000)
      create(:payment, :rejected, invoice: invoice, amount_cents: 2_000)
      other_invoice = create(:invoice, organization: org_b)
      create(:payment, :pending, invoice: other_invoice, amount_cents: 777_000)

      get '/api/v1/dashboards/pending_confirmations', headers: auth_headers(user_a)

      expect(response).to have_http_status(:ok)
      payments = JSON.parse(response.body)['payments']
      expect(payments.map { |p| p['id'] }).to eq([ pending.id ])
      expect(payments.first).to include(
        'invoice_id' => invoice.id,
        'method' => 'payid',
        'amount_cents' => 9_900,
        'amount_formatted' => '99.00',
        'kind' => 'rent',
        'invoice_reference' => invoice.payment_reference
      )
      expect(payments.first['customer']).to include('name' => 'Alice Co')
    end
  end
end
