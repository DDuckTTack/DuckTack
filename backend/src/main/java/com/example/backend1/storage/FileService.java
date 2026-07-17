package com.example.backend1.storage;

import com.example.backend1.common.ApiException;
import com.example.backend1.common.ErrorCode;
import com.example.backend1.user.repo.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FileService {
    private final FileStorage storage;
    private final FileRecordRepository fileRecordRepository;
    private final UserRepository userRepository;

    public FileService(FileStorage storage, FileRecordRepository fileRecordRepository, UserRepository userRepository) {
        this.storage = storage;
        this.fileRecordRepository = fileRecordRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public StoredFile saveUploads(String username, MultipartFile file) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));
        StoredFile stored = storage.save(file);
        fileRecordRepository.save(new FileRecord(user, FileCategory.UPLOAD, stored));
        return stored;
    }

    @Transactional
    public StoredFile saveReportPdf(String username, byte[] pdfBytes) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));
        StoredFile stored = storage.saveBytes("report.pdf", "application/pdf", pdfBytes);
        fileRecordRepository.save(new FileRecord(user, FileCategory.REPORT, stored));
        return stored;
    }
    @Transactional(readOnly = true)
    public byte[] load(String storageKey) {
        return storage.load(storageKey);
    }
    @Transactional(readOnly = true)
    public FileDownload downloadOwned(String username, String key) {
        FileRecord rec = fileRecordRepository.findByStorageKeyAndUserUsername(key, username)
                .orElseThrow(() -> new ApiException(ErrorCode.FILE_NOT_FOUND));

        byte[] bytes = storage.load(rec.getStorageKey());
        return new FileDownload(rec.getOriginalName(), rec.getContentType(), bytes);
    }

    @Transactional(readOnly = true)
    public String getOwnedPublicUrl(String username, String key) {
        boolean ok = fileRecordRepository.existsByStorageKeyAndUserUsername(key, username);
        if (!ok) throw new ApiException(ErrorCode.ACCESS_DENIED);
        return storage.getPublicUrl(key);
    }

    public record FileDownload(String filename, String contentType, byte[] bytes) {}
}

