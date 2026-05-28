module Api
  module V1
    class InvoicesController < BaseController
      def index
        invoices = Current.organization.invoices
                          .includes(:customer)
                          .order(issue_date: :desc)
        render json: invoices.map { |i| serialize(i) }
      end

      def show
        render json: serialize(find_invoice)
      end

      def create
        invoice = Current.organization.invoices.new(invoice_params)

        if invoice.save
          render json: serialize(invoice.reload), status: :created
        else
          render json: { errors: invoice.errors }, status: :unprocessable_entity
        end
      end

      def update
        invoice = find_invoice

        if invoice.update(invoice_params)
          render json: serialize(invoice.reload)
        else
          render json: { errors: invoice.errors }, status: :unprocessable_entity
        end
      end

      def destroy
        find_invoice.destroy
        head :no_content
      end

      private

      def find_invoice
        Current.organization.invoices.includes(:customer).find(params[:id])
      end

      def invoice_params
        params.require(:invoice).permit(
          :customer_id, :external_id, :status,
          :issue_date, :due_date, :currency, :amount_cents
        )
      end

      def serialize(invoice)
        {
          id: invoice.id,
          external_id: invoice.external_id,
          status: invoice.status,
          issue_date: invoice.issue_date,
          due_date: invoice.due_date,
          currency: invoice.currency,
          amount_cents: invoice.amount_cents,
          amount_formatted: invoice.amount.format(symbol: false, no_cents_if_whole: false),
          customer: {
            id: invoice.customer.id,
            name: invoice.customer.name,
            email: invoice.customer.email,
            external_id: invoice.customer.external_id
          }
        }
      end
    end
  end
end
