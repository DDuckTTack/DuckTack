package com.example.backend1.storage;

import com.example.backend1.user.domain.User;
import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "file_record", indexes = {
        @Index(name = "idx_file_record_user_created", columnList = "user_id, createdAt"),
        @Index(name = "idx_file_record_category", columnList = "category"),
        @Index(name = "idx_file_record_diagnosis", columnList = "diagnosis_id")
})
public class FileRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id") // ⭐ 명시 (안전)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FileCategory category = FileCategory.UPLOAD;

    @Column(name = "diagnosis_id")
    private Long diagnosisId;

    @Column(nullable = false, unique = true, length = 80)
    private String storageKey;

    @Column(nullable = false, length = 255)
    private String originalName;

    @Column(nullable = false, length = 120)
    private String contentType;

    @Column(nullable = false)
    private long sizeBytes;

    @Column(nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    protected FileRecord() {}

    // 기본 생성자
    public FileRecord(User user, FileCategory category, StoredFile storedFile) {
        this.user = user;
        this.category = category;
        this.storageKey = storedFile.key();
        this.originalName = storedFile.originalName() != null ? storedFile.originalName() : "file";
        this.contentType = storedFile.contentType() != null ? storedFile.contentType() : "application/octet-stream";
        this.sizeBytes = storedFile.sizeBytes();
    }

    // ⭐ 추천 생성자
    public FileRecord(User user, FileCategory category, StoredFile storedFile, Long diagnosisId) {
        this(user, category, storedFile);
        this.diagnosisId = diagnosisId;
    }

    // =====================
    // Getter
    // =====================
    public Long getId() { return id; }
    public User getUser() { return user; }
    public FileCategory getCategory() { return category; }
    public Long getDiagnosisId() { return diagnosisId; }
    public String getStorageKey() { return storageKey; }
    public String getOriginalName() { return originalName; }
    public String getContentType() { return contentType; }
    public long getSizeBytes() { return sizeBytes; }
    public OffsetDateTime getCreatedAt() { return createdAt; }

    // =====================
    // Setter
    // =====================
    public void setDiagnosisId(Long diagnosisId) {
        this.diagnosisId = diagnosisId;
    }

    public void setCategory(FileCategory category) {
        this.category = category;
    }

    // ⭐ 추가 (선택)
    public void setUser(User user) {
        this.user = user;
    }
}