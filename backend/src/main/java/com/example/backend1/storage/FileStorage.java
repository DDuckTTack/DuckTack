package com.example.backend1.storage;

import org.springframework.web.multipart.MultipartFile;

public interface FileStorage {

    StoredFile save(MultipartFile file);

    StoredFile saveBytes(String filename, String contentType, byte[] bytes);

    byte[] load(String key);

    String getPublicUrl(String key);

    /** 저장된 파일 삭제. 없는 파일이면 아무 것도 하지 않는다. */
    void delete(String key);
}