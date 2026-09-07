package com.example.backend1.realtime;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

@Component
public class RealtimeEventPublisher {
    private final ApplicationEventPublisher publisher;

    public RealtimeEventPublisher(ApplicationEventPublisher publisher) {
        this.publisher = publisher;
    }

    public void publishToUser(String username, String type, Long resourceId) {
        publisher.publishEvent(new RealtimeDomainEvent(username, "/queue/events", new RealtimeEvent(type, resourceId)));
    }

    public void publishBidChange(String type, Long requestId) {
        publisher.publishEvent(new RealtimeDomainEvent(null, "/topic/bids", new RealtimeEvent(type, requestId)));
    }
}
