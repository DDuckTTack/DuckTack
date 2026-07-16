package com.example.backend1.storage;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FileRecordRepository
extends JpaRepository<FileRecord, Long> {
    Optional<FileRecord> findByStorageKeyAndUserUsername(String storageKey, String username);

    boolean existsByStorageKeyAndUserUsername(String storageKey, String username);

    List<FileRecord> findByDiagnosisIdAndCategory(Long diagnosisId, FileCategory category);
}
