package com.example.backend1.diagnosis.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "report_metadata")
public class ReportMetadata {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @OneToOne(fetch = FetchType.LAZY, optional = false)
  private Diagnosis diagnosis;

  @Column(nullable = false, length = 255)
  private String storageKey;

  @Column(nullable = false, length = 100)
  private String contentType;

  @Column(nullable = false)
  private long sizeBytes;

  protected ReportMetadata() {}

  public ReportMetadata(String storageKey, String contentType, long sizeBytes) {
    this.storageKey = storageKey;
    this.contentType = contentType;
    this.sizeBytes = sizeBytes;
  }

  void attach(Diagnosis diagnosis) {
    this.diagnosis = diagnosis;
  }

  // 여기 추가 (리포트 다시 생성 시 UPDATE 용)
  public void update(String storageKey, String contentType, long sizeBytes) {
    this.storageKey = storageKey;
    this.contentType = contentType;
    this.sizeBytes = sizeBytes;
  }

  public Long getId() {
    return id;
  }

  public String getStorageKey() {
    return storageKey;
  }

  public String getContentType() {
    return contentType;
  }

  public long getSizeBytes() {
    return sizeBytes;
  }
}