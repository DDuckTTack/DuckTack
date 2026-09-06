package com.example.backend1.realtime;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class RealtimeEventListener {
    private final SimpMessagingTemplate messagingTemplate;

    public RealtimeEventListener(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void publish(RealtimeDomainEvent event) {
        if (event.username() == null) {
            messagingTemplate.convertAndSend(event.destination(), event.payload());
        } else {
            messagingTemplate.convertAndSendToUser(event.username(), event.destination(), event.payload());
        }
    }
}
