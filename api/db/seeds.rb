# Idempotent dev seeds. Safe to re-run.

def seed_org(slug:, name:, admin_email:)
  organization = Organization.find_or_create_by!(slug: slug) do |org|
    org.name = name
  end

  User.find_or_create_by!(email: admin_email, organization: organization) do |user|
    user.name = "Admin #{name}"
    user.password = 'password123'
    user.password_confirmation = 'password123'
  end

  organization
end

def seed_customer(organization:, external_id:, name:, email:)
  organization.customers.find_or_create_by!(external_id: external_id) do |c|
    c.name = name
    c.email = email
  end
end

def seed_invoice(organization:, customer:, external_id:, amount_cents:, currency:, status:, issue_date:, due_date:)
  organization.invoices.find_or_create_by!(external_id: external_id) do |i|
    i.customer = customer
    i.amount_cents = amount_cents
    i.currency = currency
    i.status = status
    i.issue_date = issue_date
    i.due_date = due_date
  end
end

# ------------------------------------------------------------
# Primary tenant (login: admin@zerohcom.co / password123)
# ------------------------------------------------------------

org = seed_org(slug: 'zerohcom', name: 'ZeroHCom', admin_email: 'admin@zerohcom.co')

acme    = seed_customer(organization: org, external_id: 'xero-acme',    name: 'Acme Holdings Pty Ltd', email: 'finance@acme.example')
globex  = seed_customer(organization: org, external_id: 'xero-globex',  name: 'Globex Corporation',    email: 'ap@globex.example')
soylent = seed_customer(organization: org, external_id: 'xero-soylent', name: 'Soylent Industries',    email: 'billing@soylent.example')
initech = seed_customer(organization: org, external_id: 'xero-initech', name: 'Initech LLC',           email: 'accounts@initech.example')
umbrella = seed_customer(organization: org, external_id: 'xero-umbrella', name: 'Umbrella Group',      email: 'finance@umbrella.example')

today = Date.current

seed_invoice(organization: org, customer: acme,    external_id: 'INV-1001', amount_cents:  15_000, currency: 'AUD', status: 'paid',      issue_date: today - 45, due_date: today - 15)
seed_invoice(organization: org, customer: acme,    external_id: 'INV-1002', amount_cents:  82_500, currency: 'AUD', status: 'open',      issue_date: today - 10, due_date: today + 20)
seed_invoice(organization: org, customer: globex,  external_id: 'INV-1003', amount_cents: 240_000, currency: 'AUD', status: 'overdue',   issue_date: today - 60, due_date: today - 30)
seed_invoice(organization: org, customer: globex,  external_id: 'INV-1004', amount_cents:  37_500, currency: 'USD', status: 'paid',      issue_date: today - 30, due_date: today)
seed_invoice(organization: org, customer: soylent, external_id: 'INV-1005', amount_cents:  99_900, currency: 'AUD', status: 'draft',     issue_date: today,      due_date: today + 30)
seed_invoice(organization: org, customer: soylent, external_id: 'INV-1006', amount_cents: 125_000, currency: 'AUD', status: 'open',      issue_date: today - 5,  due_date: today + 25)
seed_invoice(organization: org, customer: initech, external_id: 'INV-1007', amount_cents:  60_000, currency: 'BRL', status: 'overdue',   issue_date: today - 50, due_date: today - 20)
seed_invoice(organization: org, customer: initech, external_id: 'INV-1008', amount_cents:  18_750, currency: 'AUD', status: 'cancelled', issue_date: today - 20, due_date: today + 10)
seed_invoice(organization: org, customer: umbrella, external_id: 'INV-1009', amount_cents: 450_000, currency: 'AUD', status: 'open',     issue_date: today - 2,  due_date: today + 28)
seed_invoice(organization: org, customer: umbrella, external_id: 'INV-1010', amount_cents:  72_000, currency: 'AUD', status: 'paid',     issue_date: today - 90, due_date: today - 60)

# Sample payments for the paid invoices
paid_invoice = org.invoices.find_by!(external_id: 'INV-1001')
unless paid_invoice.payments.exists?
  paid_invoice.payments.create!(
    external_id:  'PAY-2001',
    amount_cents: paid_invoice.amount_cents,
    currency:     paid_invoice.currency,
    payment_date: paid_invoice.due_date - 2,
    method:       'bank_transfer'
  )
end

paid_invoice2 = org.invoices.find_by!(external_id: 'INV-1010')
unless paid_invoice2.payments.exists?
  paid_invoice2.payments.create!(
    external_id:  'PAY-2002',
    amount_cents: paid_invoice2.amount_cents,
    currency:     paid_invoice2.currency,
    payment_date: paid_invoice2.due_date - 5,
    method:       'credit_card'
  )
end

# ------------------------------------------------------------
# Second tenant — used to validate multi-tenant isolation.
# ------------------------------------------------------------

org2 = seed_org(slug: 'demo-co', name: 'Demo Co', admin_email: 'admin@democo.co')

vandelay = seed_customer(organization: org2, external_id: 'xero-vandelay', name: 'Vandelay Industries', email: 'finance@vandelay.example')
pendant  = seed_customer(organization: org2, external_id: 'xero-pendant',  name: 'Pendant Publishing',  email: 'billing@pendant.example')

seed_invoice(organization: org2, customer: vandelay, external_id: 'DEMO-1', amount_cents: 50_000, currency: 'AUD', status: 'open', issue_date: today - 5, due_date: today + 25)
seed_invoice(organization: org2, customer: pendant,  external_id: 'DEMO-2', amount_cents: 22_500, currency: 'AUD', status: 'paid', issue_date: today - 30, due_date: today)

puts "Seeded:"
puts "  - Org '#{org.slug}'   → admin@zerohcom.co / password123   (#{org.customers.count} customers, #{org.invoices.count} invoices)"
puts "  - Org '#{org2.slug}' → admin@democo.co / password123     (#{org2.customers.count} customers, #{org2.invoices.count} invoices)"
