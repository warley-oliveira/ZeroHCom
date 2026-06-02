class ActivityFeedSerializer
  def self.render(events)
    { events: events.map { |event| event.merge(at: event[:at].iso8601) } }
  end
end
