module Api
  module V1
    class AssetsController < BaseController
      def index
        records, meta = paginate(filtered_assets)
        render json: { data: records.map { |a| AssetSerializer.render(a) }, meta: meta }
      end

      def show
        render json: AssetSerializer.render(find_asset)
      end

      def create
        asset = Current.organization.assets.new(asset_params)

        if asset.save
          render json: AssetSerializer.render(asset), status: :created
        else
          render json: { errors: asset.errors }, status: :unprocessable_entity
        end
      end

      def update
        asset = find_asset

        if asset.update(asset_params)
          render json: AssetSerializer.render(asset)
        else
          render json: { errors: asset.errors }, status: :unprocessable_entity
        end
      end

      def destroy
        find_asset.destroy
        head :no_content
      end

      private

      def filtered_assets
        scope = Current.organization.assets.order(created_at: :desc, id: :desc)
        scope = scope.where(status: params[:status]) if Asset::STATUSES.include?(params[:status])
        scope = scope.where("assets.asset_type ILIKE ?", "%#{params[:asset_type].strip}%") if params[:asset_type].present?
        scope = scope.where("assets.name ILIKE ?", "%#{params[:q].strip}%") if params[:q].present?
        scope
      end

      def find_asset
        Current.organization.assets.find(params[:id])
      end

      def asset_params
        params.require(:asset).permit(:name, :asset_type, :status, metadata: {})
      end
    end
  end
end
