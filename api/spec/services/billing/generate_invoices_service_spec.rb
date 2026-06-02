require 'rails_helper'

RSpec.describe Billing::GenerateInvoicesService do
  let(:organization) { create(:organization) }
  let(:customer)     { create(:customer, organization: organization) }
  let(:today)        { Date.new(2026, 5, 15) }

  def monthly_agreement(**attrs)
    create(:agreement,
           organization: organization,
           customer: customer,
           amount_cents: 50_000,
           currency: 'AUD',
           billing_cycle: 'monthly',
           status: 'active',
           start_date: Date.new(2026, 1, 1),
           **attrs)
  end

  describe 'creating an invoice for a single agreement' do
    let(:agreement) { monthly_agreement }

    it 'creates an open invoice linked to the agreement and customer' do
      invoices = nil
      expect {
        invoices = described_class.call(agreement: agreement, date: today)
      }.to change(Invoice, :count).by(1)

      invoice = invoices.first
      expect(invoice.status).to eq('open')
      expect(invoice.amount_cents).to eq(50_000)
      expect(invoice.currency).to eq('AUD')
      expect(invoice.agreement).to eq(agreement)
      expect(invoice.customer).to eq(customer)
      expect(invoice.organization).to eq(organization)
      expect(invoice.issue_date).to eq(today)
      expect(invoice.due_date).to eq(today + 5.days)
    end

    it 'supports a parametrizable due window' do
      invoices = described_class.call(agreement: agreement, date: today, due_in_days: 10)
      expect(invoices.first.due_date).to eq(today + 10.days)
    end
  end

  describe 'idempotency per cycle' do
    let(:agreement) { monthly_agreement }

    it 'does not create a duplicate invoice for the same month' do
      described_class.call(agreement: agreement, date: today)

      expect {
        described_class.call(agreement: agreement, date: Date.new(2026, 5, 28))
      }.not_to change(Invoice, :count)
    end

    it 'creates a new invoice for the next cycle (following month)' do
      described_class.call(agreement: agreement, date: today)

      expect {
        described_class.call(agreement: agreement, date: Date.new(2026, 6, 15))
      }.to change(Invoice, :count).by(1)
    end
  end

  describe 'eligibility' do
    it 'skips agreements that are not active' do
      agreement = monthly_agreement(status: 'paused')
      expect {
        described_class.call(agreement: agreement, date: today)
      }.not_to change(Invoice, :count)
    end

    it 'skips agreements that have not started yet' do
      agreement = monthly_agreement(start_date: Date.new(2026, 7, 1))
      expect {
        described_class.call(agreement: agreement, date: today)
      }.not_to change(Invoice, :count)
    end

    it 'skips agreements already ended' do
      agreement = monthly_agreement(end_date: Date.new(2026, 4, 30))
      expect {
        described_class.call(agreement: agreement, date: today)
      }.not_to change(Invoice, :count)
    end
  end

  describe 'running for a whole organization' do
    it 'generates invoices only for the active agreements of that organization' do
      active_one = monthly_agreement
      active_two = monthly_agreement
      monthly_agreement(status: 'cancelled')

      other_org = create(:organization)
      create(:agreement, organization: other_org, billing_cycle: 'monthly', status: 'active',
                         start_date: Date.new(2026, 1, 1))

      invoices = nil
      expect {
        invoices = described_class.call(organization: organization, date: today)
      }.to change(Invoice, :count).by(2)

      expect(invoices.map(&:agreement)).to match_array([ active_one, active_two ])
    end
  end

  describe 'argument validation' do
    it 'raises when neither an agreement nor an organization is given' do
      expect { described_class.call(date: today) }.to raise_error(ArgumentError)
    end
  end
end
