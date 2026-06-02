module Api
  module V1
    class AgreementsController < BaseController
      def index
        records, meta = paginate(filtered_agreements)
        render json: { data: records.map { |a| AgreementSerializer.render(a) }, meta: meta }
      end

      def show
        render json: AgreementSerializer.render(find_agreement)
      end

      def create
        agreement = Current.organization.agreements.new(agreement_params)

        if agreement.save
          render json: AgreementSerializer.render(agreement.reload), status: :created
        else
          render json: { errors: agreement.errors }, status: :unprocessable_entity
        end
      end

      def update
        agreement = find_agreement

        if agreement.update(agreement_params)
          render json: AgreementSerializer.render(agreement.reload)
        else
          render json: { errors: agreement.errors }, status: :unprocessable_entity
        end
      end

      def destroy
        find_agreement.destroy
        head :no_content
      end

      private

      def filtered_agreements
        scope = Current.organization.agreements
                       .includes(:customer, :asset)
                       .order(created_at: :desc, id: :desc)
        scope = scope.where(status: params[:status]) if Agreement::STATUSES.include?(params[:status])
        scope = scope.where(billing_cycle: params[:billing_cycle]) if params[:billing_cycle].present?
        scope = scope.where(customer_id: params[:customer_id]) if params[:customer_id].present?
        scope = scope.where(asset_id: params[:asset_id]) if params[:asset_id].present?
        scope = filter_by_bond(scope, params[:bond]) if params[:bond].present?
        scope
      end

      # Relationship-aware bond filter. `paid` checks the related bond invoice's
      # status (mirrors Agreement#bond_paid?); `required`/`pending` key off the
      # bond amount being positive.
      def filter_by_bond(scope, bond)
        paid_ids = Current.organization.invoices.where(kind: "bond", status: "paid").select(:agreement_id)

        case bond
        when "required" then scope.where("agreements.bond_amount_cents > 0")
        when "paid"     then scope.where(id: paid_ids).where("agreements.bond_amount_cents > 0")
        when "pending"  then scope.where("agreements.bond_amount_cents > 0").where.not(id: paid_ids)
        else scope
        end
      end

      def find_agreement
        Current.organization.agreements.includes(:customer, :asset).find(params[:id])
      end

      def agreement_params
        params.require(:agreement).permit(
          :customer_id, :asset_id, :billing_cycle, :status,
          :start_date, :end_date, :currency, :amount_cents, :bond_amount_cents
        )
      end
    end
  end
end
