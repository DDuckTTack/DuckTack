package com.example.backend1.diagnosis.domain;

import com.example.backend1.user.domain.User;
import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "diagnosis", indexes = {
    @Index(name = "idx_diagnosis_user_created", columnList = "user_id, createdAt")
})
public class Diagnosis {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  private User user;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private AnalysisStatus status = AnalysisStatus.ANALYZING;

  @Column(nullable = false)
  private Integer riskScore = 0; // 0~100

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private IssueType issueType = IssueType.ETC;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  @OneToOne(mappedBy = "diagnosis", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
  private ReportMetadata report;

  protected Diagnosis() {}

  public Diagnosis(User user) {
    this.user = user;
  }

  public Long getId() { return id; }
  public User getUser() { return user; }
  public AnalysisStatus getStatus() { return status; }
  public Integer getRiskScore() { return riskScore; }
  public IssueType getIssueType() { return issueType; }
  public OffsetDateTime getCreatedAt() { return createdAt; }
  public ReportMetadata getReport() { return report; }

  public void updateFromAiResult(AnalysisStatus status, Integer riskScore, IssueType issueType) {
    if (status != null) this.status = status;
    if (riskScore != null) this.riskScore = riskScore;
    if (issueType != null) this.issueType = issueType;
  }

  public void attachReport(ReportMetadata report) {
    this.report = report;
    if (report != null) report.attach(this);
  }
}
