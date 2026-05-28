module Api
  module V1
    class CustomersController < BaseController
      def index
        customers = Current.organization.customers.order(:name)
        render json: customers.map { |c| serialize(c) }
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
          render json: { error: 'customer_has_invoices' }, status: :unprocessable_entity
        end
      end

      private

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
          external_id: customer.external_id
        }
      end
    end
  end
end
