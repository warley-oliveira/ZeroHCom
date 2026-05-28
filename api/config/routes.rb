Rails.application.routes.draw do
  # Health check usado por load balancers / uptime monitors
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      post   "login",  to: "sessions#create"
      delete "logout", to: "sessions#destroy"

      resources :customers, only: %i[index show create update destroy]
      resources :invoices,  only: %i[index show create update destroy]
    end
  end
end
