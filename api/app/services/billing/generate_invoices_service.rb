module Billing
  # Generates invoices for recurring agreements.
  #
  # Can target a single agreement or every active agreement of an organization.
  # Idempotent per billing cycle: it will not create a second invoice for an
  # agreement that already has one issued within the current cycle window.
  #
  #   Billing::GenerateInvoicesService.call(agreement: agreement)
  #   Billing::GenerateInvoicesService.call(organization: org)
  #
  # Returns the array of invoices created during the run (may be empty).
  class GenerateInvoicesService
    DEFAULT_DUE_IN_DAYS = 5

    def self.call(**kwargs)
      new(**kwargs).call
    end

    def initialize(agreement: nil, organization: nil, date: Date.current, due_in_days: DEFAULT_DUE_IN_DAYS)
      raise ArgumentError, "provide an agreement or an organization" if agreement.nil? && organization.nil?

      @agreement = agreement
      @organization = organization
      @date = date
      @due_in_days = due_in_days
    end

    def call
      ActiveRecord::Base.transaction do
        target_agreements.filter_map { |agreement| generate_for(agreement) }
      end
    end

    private

    def target_agreements
      return [ @agreement ] if @agreement

      @organization.agreements.active
    end

    def generate_for(agreement)
      return unless billable?(agreement)
      return if invoice_for_current_cycle?(agreement)

      agreement.invoices.create!(
        organization: agreement.organization,
        customer: agreement.customer,
        amount_cents: agreement.amount_cents,
        currency: agreement.currency,
        status: "open",
        issue_date: @date,
        due_date: @date + @due_in_days.days
      )
    end

    # Only bill active agreements whose lifespan covers the reference date.
    def billable?(agreement)
      agreement.active? &&
        agreement.billing_cycle.present? &&
        (agreement.start_date.nil? || agreement.start_date <= @date) &&
        (agreement.end_date.nil? || agreement.end_date >= @date)
    end

    def invoice_for_current_cycle?(agreement)
      agreement.invoices.where(issue_date: cycle_window(agreement)).exists?
    end

    # The calendar window that represents "the current billing cycle" for the
    # agreement, used to detect an already-issued invoice for this period.
    def cycle_window(agreement)
      case agreement.billing_cycle
      when "weekly"  then @date.beginning_of_week..@date.end_of_week
      when "monthly" then @date.beginning_of_month..@date.end_of_month
      else @date..@date
      end
    end
  end
end
