# frozen_string_literal: true

# High-volume, relational dev seeds for the ZeroHCom MVP (fleet rental + ride-share).
#
# Populates EVERY organization with a realistic, demo-ready volume of data so the
# dashboards, listings and ledger have something to show on every tenant. Data is
# randomized per org (repetition across tenants is fine and expected).
#
# Idempotent: wipes the business tables (FK-safe order) and rebuilds from scratch
# on every run. Safe to re-run with `bin/rails db:seed`.
#
# Tunable via ENV (defaults give a solid demo volume that seeds in well under a minute):
#   ORG_COUNT=6 CUSTOMERS_PER_ORG=30 ASSETS_PER_ORG=20 WEEKS=12 bin/rails db:seed
#
# All logins use password "password123". Known logins kept stable:
#   - admin@dollarfleet.co / admin@zerohcom.co → "Dollar Fleet & Drive"
#   - admin@acmerentals.co                     → "Acme Rentals"
# Every other org gets admin@<slug-without-dashes>.co.

require "faker"

Faker::Config.locale = "en-AU"
Faker::UniqueGenerator.clear

# ------------------------------------------------------------------------------
# Tunables
# ------------------------------------------------------------------------------
CURRENCY          = "AUD"
WEEKS             = Integer(ENV.fetch("WEEKS", 12))
CUSTOMERS_PER_ORG = Integer(ENV.fetch("CUSTOMERS_PER_ORG", 30))
ASSETS_PER_ORG    = Integer(ENV.fetch("ASSETS_PER_ORG", 20))

# Curated tenants — stable slugs/logins. ORG_COUNT trims or extends this list;
# extra orgs beyond the curated set are generated with Faker company names.
CURATED_ORGS = [
  { name: "Dollar Fleet & Drive", slug: "dollar-fleet",   logins: ["admin@dollarfleet.co", "admin@zerohcom.co"] },
  { name: "Acme Rentals",         slug: "acme-rentals",   logins: ["admin@acmerentals.co"] },
  { name: "Metro Mobility",       slug: "metro-mobility", logins: ["admin@metromobility.co"] },
  { name: "Harbour City Cars",    slug: "harbour-city",   logins: ["admin@harbourcity.co"] },
  { name: "Outback Wheels Co",    slug: "outback-wheels", logins: ["admin@outbackwheels.co"] },
  { name: "Sunline Rideshare",    slug: "sunline-ride",   logins: ["admin@sunlineride.co"] }
].freeze

ORG_COUNT = Integer(ENV.fetch("ORG_COUNT", CURATED_ORGS.size))

VEHICLE_TRANSMISSIONS = %w[eCVT 6F35 8-speed-auto manual-6 single-speed].freeze
VEHICLE_FUELS         = %w[petrol diesel hybrid electric].freeze
VEHICLE_COLORS        = %w[white silver black blue grey red].freeze
PAYMENT_METHODS       = %w[bank_transfer credit_card payid cash].freeze
INCOME_CATEGORIES     = %w[uber_income ride_share_bonus delivery_income].freeze
EXPENSE_CATEGORIES    = %w[fuel tolls cleaning insurance registration].freeze

# ------------------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------------------
def admin_for(organization, email)
  organization.users.create!(
    email: email,
    name: "Admin #{organization.name}",
    password: "password123",
    password_confirmation: "password123"
  )
end

# Pays an invoice through the real domain service so the ledger income entry
# (category: car_rental, attributed to the rented asset) is created exactly
# like production does.
def pay!(invoice, on:)
  Payments::ProcessPaymentService.call(
    invoice: invoice,
    payment_attributes: {
      external_id: "PAY-#{invoice.external_id}",
      amount_cents: invoice.amount_cents,
      currency: invoice.currency,
      method: PAYMENT_METHODS.sample,
      payment_date: on.to_time
    }
  )
end

def ledger!(organization, asset:, direction:, category:, amount_cents:, on:)
  organization.transactions.create!(
    asset: asset,
    direction: direction,
    category: category,
    amount_cents: amount_cents,
    currency: CURRENCY,
    date: on.to_time
  )
end

# Returns one organization's data counts for the summary table.
def org_counts(org)
  {
    customers: org.customers.count,
    assets: org.assets.count,
    agreements: org.agreements.count,
    invoices: org.invoices.count,
    overdue: org.invoices.overdue.count,
    payments: Payment.joins(:invoice).where(invoices: { organization_id: org.id }).count,
    transactions: org.transactions.count
  }
end

# ------------------------------------------------------------------------------
# Per-tenant builder
# ------------------------------------------------------------------------------
def build_assets!(org, count)
  Array.new(count) do |i|
    plate = format("%s-%04d", Faker::Alphanumeric.alpha(number: 3).upcase, rand(0..9999))
    make_model = Faker::Vehicle.make_and_model
    year = rand(2014..2024)

    # ~70% rented, the rest split between available and maintenance.
    status = i < (count * 0.7).floor ? "rented" : %w[available maintenance].sample

    org.assets.create!(
      name: "#{make_model} #{year}",
      asset_type: "vehicle",
      status: status,
      metadata: {
        "plate" => plate,
        "model" => make_model,
        "vin" => Faker::Vehicle.vin,
        "year" => year,
        "color" => VEHICLE_COLORS.sample,
        "fuel_type" => VEHICLE_FUELS.sample,
        "transmission" => VEHICLE_TRANSMISSIONS.sample,
        "odometer_km" => rand(15_000..210_000)
      }
    )
  end
end

def build_customers!(org, count)
  Array.new(count) do |i|
    org.customers.create!(
      external_id: format("drv-%03d", i + 1),
      name: Faker::Name.name,
      email: Faker::Internet.unique.email
    )
  end
end

# Issues a full billing history for one agreement and pays most of it through
# the domain service. Also lays down per-week operating expenses + ride-share
# income against the rented asset so the per-vehicle P&L looks real.
def simulate_agreement!(org, agreement, seq)
  weekly = agreement.billing_cycle == "weekly"
  step   = weekly ? 1 : 4
  weekly_rent = agreement.amount_cents
  delinquent  = rand < 0.15

  periods = (0...WEEKS).step(step).to_a
  periods.each_with_index do |week_offset, idx|
    issue = agreement.start_date + week_offset.weeks
    due   = issue + 5

    status, settle =
      if delinquent && idx >= periods.size - 2
        ["overdue", false]                       # last cycles unpaid -> overdue
      elsif idx == periods.size - 1 && rand < 0.25
        ["draft", false]                         # latest not sent yet
      else
        ["open", true]                           # will be flipped to paid by the service
      end

    invoice = org.invoices.create!(
      customer: agreement.customer,
      agreement: agreement,
      external_id: "#{org.slug}-A#{seq}-W#{idx + 1}",
      amount_cents: weekly_rent,
      currency: CURRENCY,
      status: status,
      issue_date: issue,
      due_date: due
    )

    pay!(invoice, on: issue + rand(0..3)) if settle
  end

  # Per-week operating reality for the rented car.
  asset = agreement.asset
  return unless asset

  WEEKS.times do |w|
    base = agreement.start_date + w.weeks

    # Ride-share / delivery income attributed to the car (~AUD 900–1,500/wk).
    ledger!(org, asset: asset, direction: "income", category: INCOME_CATEGORIES.sample,
                 amount_cents: rand(90_000..150_000), on: base + 6)

    # Fuel every week (~AUD 120–200).
    ledger!(org, asset: asset, direction: "expense", category: "fuel",
                 amount_cents: rand(12_000..20_000), on: base + 2)

    # Tolls most weeks (~AUD 20–70).
    ledger!(org, asset: asset, direction: "expense", category: "tolls",
                 amount_cents: rand(2_000..7_000), on: base + 3) if rand < 0.8
  end

  # Occasional lumpy expenses (insurance, registration, big maintenance hit).
  if rand < 0.4
    ledger!(org, asset: asset, direction: "expense", category: EXPENSE_CATEGORIES.sample,
                 amount_cents: rand(60_000..160_000), on: agreement.start_date + rand(1..WEEKS).weeks)
  end
end

def build_organization!(definition)
  org = Organization.create!(name: definition[:name], slug: definition[:slug])
  definition[:logins].each { |email| admin_for(org, email) }

  customers = build_customers!(org, CUSTOMERS_PER_ORG)
  assets    = build_assets!(org, ASSETS_PER_ORG)

  # Put every rented car under an active agreement with a distinct customer.
  rented = assets.select { |a| a.status == "rented" }
  rented.each_with_index do |asset, seq|
    customer = customers[seq % customers.size]
    weekly   = rand < 0.8
    amount   = weekly ? [30_000, 32_500, 35_000, 40_000, 45_000].sample : [120_000, 140_000, 160_000].sample

    agreement = org.agreements.create!(
      customer: customer,
      asset: asset,
      billing_cycle: weekly ? "weekly" : "monthly",
      amount_cents: amount,
      currency: CURRENCY,
      status: "active",
      start_date: Date.current - WEEKS.weeks
    )

    simulate_agreement!(org, agreement, seq + 1)
  end

  org
end

# ------------------------------------------------------------------------------
# 0. Reset (children first to respect on_delete: :restrict foreign keys)
# ------------------------------------------------------------------------------
puts "Clearing existing data…"
Transaction.delete_all
Payment.delete_all
Invoice.delete_all
Agreement.delete_all
Asset.delete_all
Customer.delete_all
User.delete_all
Organization.delete_all

# ------------------------------------------------------------------------------
# 1. Resolve the list of orgs to build
# ------------------------------------------------------------------------------
org_defs =
  if ORG_COUNT <= CURATED_ORGS.size
    CURATED_ORGS.first(ORG_COUNT)
  else
    extra = (CURATED_ORGS.size...ORG_COUNT).map do |i|
      name = Faker::Company.unique.name
      slug = name.downcase.gsub(/[^a-z0-9]+/, "-").gsub(/(^-|-$)/, "")
      slug = "tenant-#{i + 1}" if slug.empty?
      { name: name, slug: slug, logins: ["admin@#{slug.delete('-')}.co"] }
    end
    CURATED_ORGS + extra
  end

# ------------------------------------------------------------------------------
# 2. Build everything
# ------------------------------------------------------------------------------
summary = {}
org_defs.each do |definition|
  print "Seeding #{definition[:name]} (#{definition[:slug]})… "
  org = build_organization!(definition)
  summary[org] = org_counts(org)
  puts "done."
end

# ------------------------------------------------------------------------------
# 3. Summary
# ------------------------------------------------------------------------------
totals = Hash.new(0)
puts "\nSeed complete — #{summary.size} organization(s), password123 for every login.\n\n"
summary.each do |org, c|
  c.each { |k, v| totals[k] += v }
  puts format("  %-24s customers=%-3d assets=%-3d agreements=%-3d invoices=%-3d (overdue=%-2d) payments=%-3d txns=%-4d",
              org.name, c[:customers], c[:assets], c[:agreements], c[:invoices], c[:overdue], c[:payments], c[:transactions])
  puts "      login: #{org.users.pluck(:email).join(' / ')}"
end

puts format("\n  %-24s customers=%-3d assets=%-3d agreements=%-3d invoices=%-3d (overdue=%-2d) payments=%-3d txns=%-4d",
            "TOTAL", totals[:customers], totals[:assets], totals[:agreements], totals[:invoices],
            totals[:overdue], totals[:payments], totals[:transactions])
