package com.example.backend1.storage;

import com.example.backend1.common.ApiException;
import com.example.backend1.common.ErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

@Component
public class LocalFileStorage implements FileStorage {

    private final Path root;
    private final String publicBaseUrl;

    public LocalFileStorage(
            @Value("${storage.local.root}") String root,
            @Value("${storage.local.public-base-url}") String publicBaseUrl
    ) {
        this.root = Path.of(root).toAbsolutePath().normalize();
        this.publicBaseUrl = publicBaseUrl.replaceAll("/+$", "");
        try {
            Files.createDirectories(this.root);
        } catch (IOException e) {
            throw new IllegalStateException("Unable to create storage root: " + this.root, e);
        }
    }

    @Override
    public StoredFile save(MultipartFile file) {
        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "file";
        String contentType = file.getContentType() != null ? file.getContentType() : "application/octet-stream";
        try {
            return write(originalName, contentType, file.getBytes());
        } catch (IOException e) {
            throw new ApiException(ErrorCode.INTERNAL_ERROR, "파일 저장에 실패했습니다.");
        }
    }

    @Override
    public StoredFile saveBytes(String originalName, String contentType, byte[] bytes) {
        try {
            return write(originalName, contentType, bytes);
        } catch (IOException e) {
            throw new ApiException(ErrorCode.INTERNAL_ERROR, "파일 저장에 실패했습니다.");
        }
    }

    @Override
    public byte[] load(String key) {
        Path target = resolve(key);
        try {
            return Files.readAllBytes(target);
        } catch (IOException e) {
            throw new ApiException(ErrorCode.FILE_NOT_FOUND);
        }
    }

    @Override
    public String getPublicUrl(String key) {
        return publicBaseUrl + "/storage/" + key;
    }

    private StoredFile write(String originalName, String contentType, byte[] bytes) throws IOException {
        String extension = "";
        int dot = originalName.lastIndexOf('.');
        if (dot >= 0 && dot < originalName.length() - 1) {
            extension = originalName.substring(dot);
        }
        String key = UUID.randomUUID() + extension;

        Path target = resolve(key);
        Files.write(target, bytes);

        return new StoredFile(key, originalName, contentType, bytes.length, getPublicUrl(key));
    }

    private Path resolve(String key) {
        Path target = root.resolve(key).normalize();
        if (!target.startsWith(root)) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "잘못된 파일 키입니다.");
        }
        return target;
    }
}
