package com.example.backend1.report.service;

import com.openhtmltopdf.outputdevice.helper.BaseRendererBuilder;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import lombok.SneakyThrows;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;

@Service
public class PdfService {

    private static final Logger log = LoggerFactory.getLogger(PdfService.class);

    public byte[] htmlToPdf(String html) {
        try (ByteArrayOutputStream os = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();

            // 1. 폰트 설정
            setupFont(builder);

            builder.useFastMode();

            // 🔥 baseUri 추가 (이미지 경로 깨지는 문제 방지)
            builder.withHtmlContent(html, "http://localhost:8080");

            builder.toStream(os);
            builder.run();

            return os.toByteArray();

        } catch (Exception e) {
            log.error("PDF 렌더링 실패: {}", e.getMessage(), e);
            throw new RuntimeException(e);
        }
    }

    private void setupFont(PdfRendererBuilder builder) {
        ClassPathResource fontResource = new ClassPathResource("fonts/NanumGothic.ttf");

        builder.useFont(() -> {
            try {
                return fontResource.getInputStream();
            } catch (IOException e) {
                throw new RuntimeException("폰트 파일을 읽을 수 없습니다: " + fontResource.getPath(), e);
            }
        }, "Nanum", 400, BaseRendererBuilder.FontStyle.NORMAL, true);
    }

    /**
     * 이미지 바이트 배열을 Base64로 변환
     */
    public String toBase64(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            log.warn("⚠️ Base64 변환 실패: 빈 이미지");
            return "";
        }

        try {
            return "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(bytes);
        } catch (Exception e) {
            log.error("❌ Base64 변환 실패", e);
            return "";
        }
    }
}