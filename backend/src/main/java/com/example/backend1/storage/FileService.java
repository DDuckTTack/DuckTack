package com.example.backend1.storage;

import com.example.backend1.common.ApiException;
import com.example.backend1.common.ErrorCode;
import com.example.backend1.user.domain.User;
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
        User user = (User)this.userRepository.findByUsername(username).orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));
        StoredFile stored = this.storage.save(file);
        this.fileRecordRepository.save(new FileRecord(user, FileCategory.UPLOAD, stored));
        return stored;
    }

    @Transactional
    public StoredFile saveReportPdf(String username, byte[] pdfBytes) {
        User user = (User)this.userRepository.findByUsername(username).orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));
        StoredFile stored = this.storage.saveBytes("report.pdf", "application/pdf", pdfBytes);
        this.fileRecordRepository.save(new FileRecord(user, FileCategory.REPORT, stored));
        return stored;
    }

    @Transactional(readOnly=true)
    public FileDownload downloadOwned(String username, String key) {
        FileRecord rec = this.fileRecordRepository.findByStorageKeyAndUserUsername(key, username).orElseThrow(() -> new ApiException(ErrorCode.FILE_NOT_FOUND));
        byte[] bytes = this.storage.load(rec.getStorageKey());
        return new FileDownload(rec.getOriginalName(), rec.getContentType(), bytes);
    }

    @Transactional(readOnly=true)
    public byte[] load(String key) {
        return this.storage.load(key);
    }

    @Transactional(readOnly=true)
    public String getOwnedPublicUrl(String username, String key) {
        boolean ok = this.fileRecordRepository.existsByStorageKeyAndUserUsername(key, username);
        if (!ok) {
            throw new ApiException(ErrorCode.ACCESS_DENIED);
        }
        return this.storage.getPublicUrl(key);
    }

    public record FileDownload(String filename, String contentType, byte[] bytes) {
    }
}
