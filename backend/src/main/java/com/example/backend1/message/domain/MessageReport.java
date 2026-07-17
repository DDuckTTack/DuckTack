package com.example.backend1.message.domain;

import com.example.backend1.user.domain.User;
import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "message_reports")
public class MessageReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    /**
     * 특정 메시지를 신고한 경우에만 세팅. 상대방을 통째로 신고한 경우 null.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reported_message_id")
    private Message reportedMessage;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reported_user_id", nullable = false)
    private User reportedUser;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ReportReason reason;

    @Column(length = 1000)
    private String detail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MessageReportStatus status = MessageReportStatus.PENDING;

    @Column(length = 500)
    private String adminMemo;

    @Column(nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    private OffsetDateTime resolvedAt;

    protected MessageReport() {}

    public MessageReport(User reporter, Conversation conversation, Message reportedMessage,
                          User reportedUser, ReportReason reason, String detail) {
        this.reporter = reporter;
        this.conversation = conversation;
        this.reportedMessage = reportedMessage;
        this.reportedUser = reportedUser;
        this.reason = reason;
        this.detail = detail;
    }

    public Long getId() { return id; }
    public User getReporter() { return reporter; }
    public Conversation getConversation() { return conversation; }
    public Message getReportedMessage() { return reportedMessage; }
    public User getReportedUser() { return reportedUser; }
    public ReportReason getReason() { return reason; }
    public String getDetail() { return detail; }
    public MessageReportStatus getStatus() { return status; }
    public String getAdminMemo() { return adminMemo; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getResolvedAt() { return resolvedAt; }

    public void resolve(MessageReportStatus newStatus, String adminMemo) {
        this.status = newStatus;
        this.adminMemo = adminMemo;
        this.resolvedAt = OffsetDateTime.now();
    }
}
