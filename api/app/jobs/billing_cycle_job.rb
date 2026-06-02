# Generates recurring invoices for every tenant. Scheduled daily via
# sidekiq-cron (see config/schedule.yml).
#
# Each organization is processed inside its own `Current.set` block so the
# tenant context is isolated per iteration — `Current` is restored to its
# previous value after each org, preventing tenant leakage between iterations.
class BillingCycleJob < ApplicationJob
  queue_as :default

  def perform
    Organization.find_each do |organization|
      Current.set(organization: organization) do
        Billing::GenerateInvoicesService.call(organization: organization)
      end
    end
  end
end
