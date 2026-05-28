class ApplicationPolicy
  attr_reader :user, :record

  def initialize(user, record)
    @user = user
    @record = record
  end

  def index?    = false
  def show?     = same_org?
  def create?   = same_org?
  def new?      = create?
  def update?   = same_org?
  def edit?     = update?
  def destroy?  = same_org?

  class Scope
    attr_reader :user, :scope

    def initialize(user, scope)
      @user = user
      @scope = scope
    end

    def resolve
      raise NotImplementedError, "#{self.class} must implement #resolve"
    end
  end

  private

  def same_org?
    return false unless user && record.respond_to?(:organization_id)

    record.organization_id == user.organization_id
  end
end
