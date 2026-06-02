module Api
  module V1
    class CustomersController < BaseController
      def index
        records, meta = paginate(filtered_customers)
        render json: { data: records.map { |c| serialize(c) }, meta: meta }
      end

      def show
        render json: serialize(find_customer)
      end

      def create
        customer = Current.organization.customers.new(customer_params)

        if customer.save
          render json: serialize(customer), status: :created
        else
          render json: { errors: customer.errors }, status: :unprocessable_entity
        end
      end

      def update
        customer = find_customer

        if customer.update(customer_params)
          render json: serialize(customer)
        else
          render json: { errors: customer.errors }, status: :unprocessable_entity
        end
      end

      def destroy
        customer = find_customer

        if customer.destroy
          head :no_content
        else
          render json: { error: "customer_has_invoices" }, status: :unprocessable_entity
        end
      end

      # POST /api/v1/customers/:id/regenerate_portal_token
      # Rotates the portal token, immediately revoking any previously shared link.
      def regenerate_portal_token
        customer = find_customer
        customer.regenerate_portal_token
        render json: serialize(customer)
      end

      private

      # name ASC with an id tiebreaker so pagination is stable across pages.
      def filtered_customers
        scope = Current.organization.customers.order(:name, :id)
        scope = search_customers(scope, params[:q]) if params[:q].present?
        scope
      end

      def search_customers(scope, term)
        like = "%#{term.strip}%"
        scope.where(
          "customers.name ILIKE :like OR customers.email ILIKE :like OR customers.external_id ILIKE :like",
          like: like
        )
      end

      def find_customer
        Current.organization.customers.find(params[:id])
      end

      def customer_params
        params.require(:customer).permit(:name, :email, :external_id)
      end

      def serialize(customer)
        {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          external_id: customer.external_id,
          portal_token: customer.portal_token,
          portal_url: customer.portal_url
        }
      end
    end
  end
end
