package com.example.backend1.storage;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Paths;

@RestController
@RequestMapping("/api/storage")
public class StorageController {

    private final FileStorage storage;

    public StorageController(FileStorage storage) {
        this.storage = storage;
    }

    @GetMapping("/**")
    public ResponseEntity<byte[]> download(HttpServletRequest request) {
        String path = request.getRequestURI()
                .replaceFirst("^/api/storage/?", "");

        if (path.isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "파일 경로가 없습니다.");
        }

        byte[] file;

        try {
            file = storage.load(path);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "파일을 찾을 수 없습니다.");
        }

        String filename = Paths.get(path).getFileName().toString();
        String encodedFilename = URLEncoder.encode(filename, StandardCharsets.UTF_8)
                .replace("+", "%20");

        return ResponseEntity.ok()
                .contentType(resolveMediaType(filename))
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"" + filename.replace("\"", "") + "\"; filename*=UTF-8''" + encodedFilename
                )
                .body(file);
    }

    private MediaType resolveMediaType(String filename) {
        String lower = filename.toLowerCase();

        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
            return MediaType.IMAGE_JPEG;
        }

        if (lower.endsWith(".png")) {
            return MediaType.IMAGE_PNG;
        }

        if (lower.endsWith(".gif")) {
            return MediaType.IMAGE_GIF;
        }

        if (lower.endsWith(".webp")) {
            return MediaType.parseMediaType("image/webp");
        }

        if (lower.endsWith(".heic") || lower.endsWith(".heif")) {
            return MediaType.parseMediaType("image/heic");
        }

        if (lower.endsWith(".pdf")) {
            return MediaType.APPLICATION_PDF;
        }

        return MediaType.APPLICATION_OCTET_STREAM;
    }
}