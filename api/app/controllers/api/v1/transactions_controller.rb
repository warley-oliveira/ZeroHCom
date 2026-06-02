module Api
  module V1
    class TransactionsController < BaseController
      def index
        records, meta = paginate(filtered_transactions)
        render json: { data: records.map { |t| TransactionSerializer.render(t) }, meta: meta }
      end

      def show
        render json: TransactionSerializer.render(find_transaction)
      end

      def create
        transaction = Current.organization.transactions.new(transaction_params)

        if transaction.save
          render json: TransactionSerializer.render(transaction), status: :created
        else
          render json: { errors: transaction.errors }, status: :unprocessable_entity
        end
      end

      def update
        transaction = find_transaction

        if transaction.update(transaction_params)
          render json: TransactionSerializer.render(transaction)
        else
          render json: { errors: transaction.errors }, status: :unprocessable_entity
        end
      end

      def destroy
        find_transaction.destroy
        head :no_content
      end

      private

      def filtered_transactions
        scope = Current.organization.transactions.order(date: :desc, id: :desc)
        scope = scope.where(direction: params[:direction]) if Transaction::DIRECTIONS.include?(params[:direction])
        scope = scope.where("transactions.category ILIKE ?", "%#{params[:category].strip}%") if params[:category].present?
        scope = scope.where(asset_id: params[:asset_id]) if params[:asset_id].present?
        scope = scope.where(source_type: params[:source_type]) if params[:source_type].present?
        scope = scope.where("transactions.date >= ?", params[:date_from]) if params[:date_from].present?
        scope = scope.where("transactions.date <= ?", params[:date_to]) if params[:date_to].present?
        scope
      end

      def find_transaction
        Current.organization.transactions.find(params[:id])
      end

      def transaction_params
        params.require(:transaction).permit(
          :direction, :category, :date, :currency, :amount_cents,
          :asset_id, :source_type, :source_id
        )
      end
    end
  end
end
