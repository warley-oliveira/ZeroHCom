module Api
  module V1
    class BaseController < ApplicationController
      include Authenticatable
      include Paginatable
    end
  end
end
