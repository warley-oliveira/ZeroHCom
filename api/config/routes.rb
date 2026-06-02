Rails.application.routes.draw do
  # Health check usado por load balancers / uptime monitors
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    # Public, unauthenticated customer portal (resolved by Customer#portal_token).
    namespace :public do
      get  "portal/:token", to: "portals#show"
      post "portal/:token/invoices/:invoice_id/payments", to: "payments#create"
    end

    namespace :v1 do
      post   "login",  to: "sessions#create"
      delete "logout", to: "sessions#destroy"

      resources :customers, only: %i[index show create update destroy] do
        member do
          post :regenerate_portal_token
        end
      end
      resources :invoices,     only: %i[index show create update destroy] do
        resources :payments, only: %i[create] do
          member do
            post :confirm
            post :reject
          end
        end
      end
      resources :assets,       only: %i[index show create update destroy]
      resources :agreements,   only: %i[index show create update destroy]
      resources :transactions, only: %i[index show create update destroy]

      get "dashboards/fleet_summary", to: "dashboards#fleet_summary"
      get "dashboards/summary",       to: "dashboards#summary"
      get "dashboards/cashflow",      to: "dashboards#cashflow"
      get "dashboards/breakdowns",    to: "dashboards#breakdowns"
      get "dashboards/activity",      to: "dashboards#activity"
      get "dashboards/pending_confirmations", to: "dashboards#pending_confirmations"
    end
  end
end
