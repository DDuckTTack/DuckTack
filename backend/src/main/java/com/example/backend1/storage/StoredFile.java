package com.example.backend1.storage;

public record StoredFile(
        String key,
        String originalName,
        String contentType,
        long sizeBytes,
        String url
) {}
