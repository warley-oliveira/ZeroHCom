require 'rails_helper'

RSpec.describe BillingCycleJob, type: :job do
  let!(:org_a) { create(:organization) }
  let!(:org_b) { create(:organization) }

  def active_monthly_agreement(organization)
    create(:agreement,
           organization: organization,
           customer: create(:customer, organization: organization),
           billing_cycle: 'monthly',
           status: 'active',
           amount_cents: 50_000,
           currency: 'AUD',
           start_date: Date.new(2026, 1, 1))
  end

  describe '#perform' do
    it 'generates invoices for the active agreements of every organization' do
      agreement_a = active_monthly_agreement(org_a)
      agreement_b = active_monthly_agreement(org_b)

      expect { described_class.perform_now }.to change(Invoice, :count).by(2)

      expect(agreement_a.invoices.count).to eq(1)
      expect(agreement_b.invoices.count).to eq(1)
      # Each invoice stays within its own tenant.
      expect(agreement_a.invoices.first.organization).to eq(org_a)
      expect(agreement_b.invoices.first.organization).to eq(org_b)
    end

    it 'invokes the billing service once per organization' do
      expect(Billing::GenerateInvoicesService).to receive(:call)
        .with(organization: org_a).once.and_return([])
      expect(Billing::GenerateInvoicesService).to receive(:call)
        .with(organization: org_b).once.and_return([])

      described_class.perform_now
    end

    describe 'tenant isolation (CurrentAttributes)' do
      it 'sets Current.organization to the org being processed during each call' do
        seen = {}
        allow(Billing::GenerateInvoicesService).to receive(:call) do |organization:|
          # Capture what the service sees as the current tenant.
          seen[organization.id] = Current.organization
          []
        end

        described_class.perform_now

        expect(seen[org_a.id]).to eq(org_a)
        expect(seen[org_b.id]).to eq(org_b)
      end

      it 'restores Current after each iteration so tenants never leak' do
        Current.organization = nil
        allow(Billing::GenerateInvoicesService).to receive(:call).and_return([])

        described_class.perform_now

        # Current was reset back to its previous (nil) value after the run.
        expect(Current.organization).to be_nil
      end

      it 'does not let one org context bleed into the next iteration' do
        contexts = []
        allow(Billing::GenerateInvoicesService).to receive(:call) do |organization:|
          contexts << Current.organization
          # The org passed in always matches the Current tenant — no bleed.
          expect(Current.organization).to eq(organization)
          []
        end

        described_class.perform_now

        expect(contexts).to contain_exactly(org_a, org_b)
      end
    end
  end
end
