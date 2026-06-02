module Api
  module Public
    # Base for the public, unauthenticated customer portal.
    #
    # Inherits from ApplicationController (NOT Api::V1::BaseController), so the
    # Authenticatable concern is never included and no JWT is required. Access
    # is gated entirely by the customer's portal_token; everything downstream is
    # scoped to that single customer.
    class BaseController < ApplicationController
      before_action :resolve_customer!

      private

      def resolve_customer!
        # find_by! raises RecordNotFound (→ uniform 404) for an invalid OR
        # revoked token, so the two are indistinguishable to a probe.
        @current_customer = Customer.find_by!(portal_token: params[:token])
        Current.organization = @current_customer.organization
      end

      attr_reader :current_customer
    end
  end
end
