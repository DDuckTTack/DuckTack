package com.example.backend1.storage;

import com.example.backend1.storage.FileCategory;
import com.example.backend1.storage.StoredFile;
import com.example.backend1.user.domain.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name="file_record", indexes={@Index(name="idx_file_record_user_created", columnList="user_id, createdAt"), @Index(name="idx_file_record_category", columnList="category")})
public class FileRecord {
    @Id
    @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch=FetchType.LAZY, optional=false)
    private User user;
    @Enumerated(value=EnumType.STRING)
    @Column(nullable=false, length=20)
    private FileCategory category = FileCategory.UPLOAD;
    @Column(nullable=false, unique=true, length=80)
    private String storageKey;
    @Column(nullable=false, length=255)
    private String originalName;
    @Column(nullable=false, length=120)
    private String contentType;
    @Column(nullable=false)
    private long sizeBytes;
    @Column(nullable=true)
    private Long diagnosisId;
    @Column(nullable=false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    protected FileRecord() {
    }

    public FileRecord(User user, FileCategory category, StoredFile storedFile) {
        this.user = user;
        this.category = category;
        this.storageKey = storedFile.key();
        this.originalName = storedFile.originalName() != null ? storedFile.originalName() : "file";
        this.contentType = storedFile.contentType() != null ? storedFile.contentType() : "application/octet-stream";
        this.sizeBytes = storedFile.sizeBytes();
    }

    public FileRecord(User user, FileCategory category, StoredFile storedFile, Long diagnosisId) {
        this(user, category, storedFile);
        this.diagnosisId = diagnosisId;
    }

    public Long getId() {
        return this.id;
    }

    public User getUser() {
        return this.user;
    }

    public FileCategory getCategory() {
        return this.category;
    }

    public String getStorageKey() {
        return this.storageKey;
    }

    public String getOriginalName() {
        return this.originalName;
    }

    public String getContentType() {
        return this.contentType;
    }

    public long getSizeBytes() {
        return this.sizeBytes;
    }

    public Long getDiagnosisId() {
        return this.diagnosisId;
    }

    public OffsetDateTime getCreatedAt() {
        return this.createdAt;
    }
}
