package com.example.backend1.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;

@Component
public class LocalFileStorage implements FileStorage {

    @Value("${storage.local.root}")
    private String root;

    @Value("${storage.local.public-base-url}")
    private String publicBaseUrl;

    @Override
    public StoredFile save(MultipartFile file) {
        try {
            String originalName = file.getOriginalFilename();
            String ext = originalName.substring(originalName.lastIndexOf("."));

            // uploads/ 경로 포함해서 key 생성
            String key = "uploads/" + UUID.randomUUID() + ext;

            Path path = Paths.get(root, key);
            Files.createDirectories(path.getParent());

            Files.copy(file.getInputStream(), path, StandardCopyOption.REPLACE_EXISTING);

            String url = publicBaseUrl + "/storage/" + key;

            return new StoredFile(
                    key,
                    originalName,
                    file.getContentType(),
                    file.getSize(),
                    url
            );

        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public StoredFile saveBytes(String filename, String contentType, byte[] bytes) {
        try {
            String ext = filename.substring(filename.lastIndexOf("."));

            // reports/ 경로 포함해서 key 생성
            String key = "reports/" + UUID.randomUUID() + ext;

            Path path = Paths.get(root, key);
            Files.createDirectories(path.getParent());

            Files.write(path, bytes);

            String url = publicBaseUrl + "/storage/" + key;

            return new StoredFile(
                    key,
                    filename,
                    contentType,
                    bytes.length,
                    url
            );

        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public byte[] load(String key) {
        try {
            Path path = Paths.get(root, key);
            return Files.readAllBytes(path);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public String getPublicUrl(String key) {
        return publicBaseUrl + "/storage/" + key;
    }
}