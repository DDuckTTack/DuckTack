package com.example.backend1.support.domain;

import com.example.backend1.user.domain.User;
import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(
        name = "support_messages",
        indexes = {
                @Index(name = "idx_support_messages_thread_id_id", columnList = "thread_id, id")
        }
)
public class SupportMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "thread_id", nullable = false)
    private SupportThread thread;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private SenderRole senderRole;

    @Column(length = 2000, nullable = false)
    private String content;

    @Column(nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    protected SupportMessage() {}

    public SupportMessage(SupportThread thread, User sender, SenderRole senderRole, String content) {
        this.thread = thread;
        this.sender = sender;
        this.senderRole = senderRole;
        this.content = content;
    }

    public Long getId() { return id; }
    public SupportThread getThread() { return thread; }
    public User getSender() { return sender; }
    public SenderRole getSenderRole() { return senderRole; }
    public String getContent() { return content; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}
