package com.example.backend1.community.moderation;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Component
public class ModerationClient {

    private final RestTemplate restTemplate;
    private final String url;

    public ModerationClient(
            @Qualifier("moderationRestTemplate") RestTemplate restTemplate,
            @Value("${moderation.base-url:http://ai-server:5000}") String baseUrl,
            @Value("${moderation.path:/moderate}") String path
    ) {
        this.restTemplate = restTemplate;
        this.url = baseUrl.replaceAll("/$", "") + (path.startsWith("/") ? path : "/" + path);
    }

    public ModerationResponse moderate(String text) {
        return restTemplate.postForObject(url, Map.of("text", text), ModerationResponse.class);
    }

    public record ModerationResponse(
            boolean toxic,
            double score,
            double threshold,
            String label,
            String model
    ) {}
}
