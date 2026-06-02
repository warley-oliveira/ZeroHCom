module Api
  module V1
    class InvoicesController < BaseController
      def index
        records, meta = paginate(filtered_invoices)
        render json: { data: records.map { |i| serialize(i) }, meta: meta }
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

      def filtered_invoices
        scope = Current.organization.invoices
                       .includes(:customer, :payments)
                       .order(issue_date: :desc, id: :desc)
        scope = scope.where(status: params[:status]) if Invoice::STATUSES.include?(params[:status])
        scope = scope.where(kind: params[:kind]) if Invoice::KINDS.include?(params[:kind])
        scope = scope.where(customer_id: params[:customer_id]) if params[:customer_id].present?
        scope = scope.where(agreement_id: params[:agreement_id]) if params[:agreement_id].present?
        scope = scope.where("invoices.due_date >= ?", params[:due_from]) if params[:due_from].present?
        scope = scope.where("invoices.due_date <= ?", params[:due_to]) if params[:due_to].present?
        scope = search_invoices(scope, params[:q]) if params[:q].present?
        scope
      end

      # Match by invoice external_id OR customer name. Uses a customer subquery
      # instead of a JOIN so it doesn't fight the includes(:customer) eager load.
      def search_invoices(scope, term)
        like = "%#{term.strip}%"
        customer_ids = Current.organization.customers.where("name ILIKE ?", like).select(:id)
        scope.where("invoices.external_id ILIKE ?", like).or(scope.where(customer_id: customer_ids))
      end

      def find_invoice
        Current.organization.invoices.includes(:customer, :payments).find(params[:id])
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
          },
          # Customer-initiated claims (PayID/bank) awaiting org review.
          pending_payments: invoice.payments.select(&:pending?).map { |p| PaymentSerializer.render(p) }
        }
      end
    end
  end
end
