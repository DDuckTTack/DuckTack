package com.example.backend1.storage;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
public interface FileRecordRepository extends JpaRepository<FileRecord, Long> {

    Optional<FileRecord> findByStorageKeyAndUserUsername(String storageKey, String username);

    boolean existsByStorageKeyAndUserUsername(String storageKey, String username);

    // ⭐ 추가
    List<FileRecord> findByDiagnosisIdAndCategory(Long diagnosisId, FileCategory category);
}