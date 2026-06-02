module Billing
  # Car-rental billing entry point: generates the due invoices for every active
  # rental agreement (i.e. agreements tied to an asset/car) of an organization.
  #
  # Delegates the per-agreement cycle/dedup logic to GenerateInvoicesService.
  #
  #   Billing::GenerateRentalInvoicesService.call(organization: org)
  #
  # Returns the array of invoices created during the run (may be empty).
  class GenerateRentalInvoicesService
    def self.call(**kwargs)
      new(**kwargs).call
    end

    def initialize(organization:, date: Date.current, due_in_days: GenerateInvoicesService::DEFAULT_DUE_IN_DAYS)
      @organization = organization
      @date = date
      @due_in_days = due_in_days
    end

    def call
      ActiveRecord::Base.transaction do
        rental_agreements.filter_map do |agreement|
          GenerateInvoicesService.call(agreement: agreement, date: @date, due_in_days: @due_in_days).first
        end
      end
    end

    private

    # A rental contract is an active agreement bound to a car (asset).
    def rental_agreements
      @organization.agreements.active.where.not(asset_id: nil)
    end
  end
end
