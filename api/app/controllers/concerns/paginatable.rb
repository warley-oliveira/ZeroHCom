# Adds server-side pagination to index actions via Pagy.
#
# Usage in a controller:
#   records, meta = paginate(filtered_scope)
#   render json: { data: records.map { |r| Serializer.render(r) }, meta: meta }
#
# Reads `params[:page]` and `params[:per_page]` (clamped to MAX_PER_PAGE). When
# `params[:all]` is "true" the page size jumps to MAX_ALL so callers that need
# the full list (e.g. <Select> option dropdowns) can opt out of paging while the
# response keeps the same { data, meta } envelope.
module Paginatable
  extend ActiveSupport::Concern

  include Pagy::Backend

  DEFAULT_PER_PAGE = 25
  MAX_PER_PAGE = 100
  # Safety cap for the `?all=true` opt-out used by dropdowns. Tenants above this
  # would need a dedicated typeahead endpoint (out of scope for now).
  MAX_ALL = 1000

  private

  # Paginates an ActiveRecord scope. Returns [records, meta_hash].
  def paginate(scope)
    pagy, records = pagy(scope, limit: per_page_param, page: params[:page])
    [ records, pagination_meta(pagy) ]
  end

  def per_page_param
    return MAX_ALL if params[:all].to_s == "true"

    requested = params[:per_page].to_i
    return DEFAULT_PER_PAGE unless requested.positive?

    [ requested, MAX_PER_PAGE ].min
  end

  def pagination_meta(pagy)
    {
      page: pagy.page,
      per_page: pagy.limit,
      count: pagy.count,
      pages: pagy.pages,
      next_page: pagy.next,
      prev_page: pagy.prev
    }
  end
end
