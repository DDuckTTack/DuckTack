package com.example.backend1.support.domain;

import com.example.backend1.user.domain.User;
import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "support_threads")
public class SupportThread {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    private OffsetDateTime lastMessageAt;

    @Column(length = 200)
    private String lastMessagePreview;

    /**
     * 마지막 발신자 기준으로 관리자 목록의 대기중/답변완료 상태를 파생시킨다.
     * 공용 문의함이라 특정 관리자 기준 읽음 처리는 의미가 없어 별도 상태 필드를 두지 않는다.
     */
    @Enumerated(EnumType.STRING)
    private SenderRole lastSenderRole;

    private OffsetDateTime userLastReadAt;

    @Column(nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    protected SupportThread() {}

    public SupportThread(User user) {
        this.user = user;
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public OffsetDateTime getLastMessageAt() { return lastMessageAt; }
    public String getLastMessagePreview() { return lastMessagePreview; }
    public SenderRole getLastSenderRole() { return lastSenderRole; }
    public OffsetDateTime getUserLastReadAt() { return userLastReadAt; }
    public OffsetDateTime getCreatedAt() { return createdAt; }

    public void recordMessage(String preview, OffsetDateTime at, SenderRole senderRole) {
        this.lastMessagePreview = preview;
        this.lastMessageAt = at;
        this.lastSenderRole = senderRole;
    }

    public void markReadByUser() {
        this.userLastReadAt = OffsetDateTime.now();
    }
}
