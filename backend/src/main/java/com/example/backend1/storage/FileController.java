package com.example.backend1.storage;

import com.example.backend1.common.ApiException;
import com.example.backend1.common.ApiResponse;
import com.example.backend1.common.ErrorCode;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.servlet.http.HttpServletRequest;

import java.util.List;

@RestController
@RequestMapping("/api/files")
@SecurityRequirement(name = "bearerAuth")
public class FileController {

    private static final Logger log = LoggerFactory.getLogger(FileController.class);

    private final FileService fileService;
    private final int maxFilesPerRequest;

    public FileController(
            FileService fileService,
            @Value("${upload.max-files:5}") int maxFilesPerRequest
    ) {
        this.fileService = fileService;
        this.maxFilesPerRequest = maxFilesPerRequest;
    }

    // 파일 업로드
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<List<FileUploadResponse>> upload(
            Authentication authentication,
            HttpServletRequest request,
            @RequestParam("files") List<MultipartFile> files
    ) {
        log.debug("파일 업로드 요청: contentType={}, fileCount={}", request.getContentType(), files.size());

        if (authentication == null) {
            throw new ApiException(ErrorCode.AUTH_FAILED);
        }

        if (files == null || files.isEmpty()) {
            throw new ApiException(ErrorCode.INVALID_INPUT);
        }

        var res = files.stream()
                .map(f -> fileService.saveUploads(authentication.getName(), f))
                .map(f -> new FileUploadResponse(
                        f.key(),
                        f.url(),
                        f.contentType(),
                        f.sizeBytes()
                ))
                .toList();

        return ApiResponse.ok(res);
    }
    // 파일 다운로드
    @GetMapping("/{key}")
    public ResponseEntity<byte[]> download(
            Authentication authentication,
            @PathVariable String key
    ) {
        if (authentication == null) {
            throw new ApiException(ErrorCode.AUTH_FAILED);
        }

        var dl = fileService.downloadOwned(authentication.getName(), key);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, dl.contentType())
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" +
                                dl.filename().replace("\"", "") + "\"")
                .body(dl.bytes());
    }

    public record FileUploadResponse(
            String key,
            String url,
            String contentType,
            long sizeBytes
    ) {}
}