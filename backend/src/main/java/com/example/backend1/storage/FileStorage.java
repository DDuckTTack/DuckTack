package com.example.backend1.storage;

import org.springframework.web.multipart.MultipartFile;

public interface FileStorage {
    StoredFile save(MultipartFile file);

    StoredFile saveBytes(String originalName, String contentType, byte[] bytes);

    byte[] load(String key);

    String getPublicUrl(String key);
}
