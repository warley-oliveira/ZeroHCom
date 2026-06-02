module Api
  module Public
    class PortalsController < BaseController
      # GET /api/public/portal/:token
      def show
        # Materialise each agreement's bond invoice on demand (idempotent).
        current_customer.agreements.each do |agreement|
          Billing::EnsureBondInvoiceService.call(agreement: agreement)
        end

        # Re-read with associations preloaded (the ensure step above may have
        # inserted bond invoices) to render without N+1 queries.
        customer = Customer
                   .includes(agreements: [ :asset, { invoices: :payments } ], invoices: :payments)
                   .find(current_customer.id)

        render json: PortalSerializer.render(customer)
      end
    end
  end
end
