package com.example.backend1.message.domain;

import com.example.backend1.user.domain.User;
import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(
        name = "conversations",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_conversations_users", columnNames = {"user1_id", "user2_id"})
        },
        indexes = {
                @Index(name = "idx_conversations_user1_id", columnList = "user1_id"),
                @Index(name = "idx_conversations_user2_id", columnList = "user2_id")
        }
)
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 두 참여자를 id가 작은 쪽부터 user1/user2로 정규화해서 저장한다.
     * 누가 먼저 대화를 시작했든 동일한 두 사용자 사이엔 대화가 하나만 존재하게 하기 위함.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user1_id", nullable = false)
    private User user1;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user2_id", nullable = false)
    private User user2;

    private OffsetDateTime user1LastReadAt;

    private OffsetDateTime user2LastReadAt;

    private OffsetDateTime lastMessageAt;

    @Column(length = 200)
    private String lastMessagePreview;

    @Column(nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    protected Conversation() {}

    public Conversation(User user1, User user2) {
        if (user1.getId() <= user2.getId()) {
            this.user1 = user1;
            this.user2 = user2;
        } else {
            this.user1 = user2;
            this.user2 = user1;
        }
    }

    public Long getId() { return id; }
    public User getUser1() { return user1; }
    public User getUser2() { return user2; }
    public OffsetDateTime getUser1LastReadAt() { return user1LastReadAt; }
    public OffsetDateTime getUser2LastReadAt() { return user2LastReadAt; }
    public OffsetDateTime getLastMessageAt() { return lastMessageAt; }
    public String getLastMessagePreview() { return lastMessagePreview; }
    public OffsetDateTime getCreatedAt() { return createdAt; }

    public boolean isParticipant(Long userId) {
        return user1.getId().equals(userId) || user2.getId().equals(userId);
    }

    public User otherUser(Long myUserId) {
        if (user1.getId().equals(myUserId)) return user2;
        if (user2.getId().equals(myUserId)) return user1;
        return null;
    }

    public OffsetDateTime myLastReadAt(Long myUserId) {
        return user1.getId().equals(myUserId) ? user1LastReadAt : user2LastReadAt;
    }

    public void markRead(Long myUserId) {
        if (user1.getId().equals(myUserId)) {
            this.user1LastReadAt = OffsetDateTime.now();
        } else if (user2.getId().equals(myUserId)) {
            this.user2LastReadAt = OffsetDateTime.now();
        }
    }

    public void recordMessage(String preview, OffsetDateTime at) {
        this.lastMessagePreview = preview;
        this.lastMessageAt = at;
    }
}
