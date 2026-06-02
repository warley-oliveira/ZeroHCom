# Pagy configuration — server-side pagination for index endpoints.
# See app/controllers/concerns/paginatable.rb for the request-facing helpers.

require "pagy/extras/overflow"

# Default page size when the client omits/under-specifies `per_page`.
Pagy::DEFAULT[:limit] = 25

# Out-of-range pages (e.g. ?page=999 on a 3-page collection) return the last
# page instead of raising Pagy::OverflowError. Meta reflects the page served.
Pagy::DEFAULT[:overflow] = :last_page

Pagy::DEFAULT.freeze
