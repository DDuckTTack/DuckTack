package com.example.backend1.storage;

import com.example.backend1.common.ApiException;
import com.example.backend1.common.ApiResponse;
import com.example.backend1.common.ErrorCode;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping(value={"/api/files"})
@SecurityRequirement(name="bearerAuth")
public class FileController {
    private final FileService fileService;
    private final int maxFilesPerRequest;

    public FileController(FileService fileService, @Value(value="${upload.max-files:5}") int maxFilesPerRequest) {
        this.fileService = fileService;
        this.maxFilesPerRequest = maxFilesPerRequest;
    }

    @PostMapping(value={"/upload"})
    public ApiResponse<List<FileUploadResponse>> upload(Authentication authentication, @RequestPart(value="files") List<MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            throw new ApiException(ErrorCode.INVALID_INPUT);
        }
        if (files.size() > this.maxFilesPerRequest) {
            throw new ApiException(ErrorCode.INVALID_INPUT);
        }
        List<FileUploadResponse> res = files.stream().map(f -> this.fileService.saveUploads(authentication.getName(), (MultipartFile)f)).map(f -> new FileUploadResponse(f.key(), f.url(), f.contentType(), f.sizeBytes())).toList();
        return ApiResponse.ok(res);
    }

    @GetMapping(value={"/{key}"})
    public ResponseEntity<byte[]> download(Authentication authentication, @PathVariable String key) {
        FileService.FileDownload dl = this.fileService.downloadOwned(authentication.getName(), key);
        return ResponseEntity.ok()
                .header("Content-Type", dl.contentType())
                .header("Content-Disposition", "attachment; filename=\"" + dl.filename().replace("\"", "") + "\"")
                .body(dl.bytes());
    }

    public record FileUploadResponse(String key, String url, String contentType, long sizeBytes) {
    }
}
