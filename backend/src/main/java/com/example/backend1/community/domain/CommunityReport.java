package com.example.backend1.community.domain;

import com.example.backend1.user.domain.User;
import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(
        name = "community_reports",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_community_reports_target_user", columnNames = {"target_type", "target_id", "reporter_id"})
        },
        indexes = {
                @Index(name = "idx_community_reports_target", columnList = "target_type,target_id"),
                @Index(name = "idx_community_reports_reporter_id", columnList = "reporter_id"),
                @Index(name = "idx_community_reports_created_at", columnList = "created_at")
        }
)
public class CommunityReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 20)
    private ReportTargetType targetType;

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private ReportReason reason;

    @Column(length = 500)
    private String detail;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    protected CommunityReport() {
    }

    public CommunityReport(ReportTargetType targetType, Long targetId, User reporter, ReportReason reason, String detail) {
        this.targetType = targetType;
        this.targetId = targetId;
        this.reporter = reporter;
        this.reason = reason;
        this.detail = detail;
    }

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public ReportTargetType getTargetType() { return targetType; }
    public Long getTargetId() { return targetId; }
    public User getReporter() { return reporter; }
    public ReportReason getReason() { return reason; }
    public String getDetail() { return detail; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}
