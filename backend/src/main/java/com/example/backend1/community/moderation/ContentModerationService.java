package com.example.backend1.community.moderation;

import com.example.backend1.common.ApiException;
import com.example.backend1.common.ErrorCode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ContentModerationService {

    private static final Logger log = LoggerFactory.getLogger(ContentModerationService.class);
    private final ModerationClient moderationClient;
    private final boolean enabled;
    private final boolean failOpen;

    public ContentModerationService(
            ModerationClient moderationClient,
            @Value("${moderation.enabled:true}") boolean enabled,
            @Value("${moderation.fail-open:true}") boolean failOpen
    ) {
        this.moderationClient = moderationClient;
        this.enabled = enabled;
        this.failOpen = failOpen;
    }

    public void validate(String text) {
        if (!enabled || text == null || text.isBlank()) return;

        try {
            ModerationClient.ModerationResponse response = moderationClient.moderate(text);
            if (response != null && response.toxic()) {
                log.info("커뮤니티 유해 표현 차단: score={}, label={}", response.score(), response.label());
                throw new ApiException(
                        ErrorCode.COMMUNITY_CONTENT_BLOCKED,
                        "욕설·비방으로 판단될 수 있는 표현이 포함되어 있습니다. 내용을 수정해 주세요."
                );
            }
        } catch (ApiException e) {
            throw e;
        } catch (RuntimeException e) {
            if (!failOpen) {
                throw new ApiException(ErrorCode.INTERNAL_ERROR, "콘텐츠 안전성 검사에 실패했습니다. 잠시 후 다시 시도해 주세요.");
            }
            log.warn("콘텐츠 안전성 검사 실패로 등록을 허용합니다: {}", e.getMessage());
        }
    }
}
