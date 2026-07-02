package com.example.backend1.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.RestClientException;

@Component
public class AiClient {

    private final RestTemplate restTemplate;
    private final String baseUrl;

    public AiClient(
            RestTemplate aiRestTemplate,
            @Value("${ai.base-url}") String baseUrl
    ) {
        this.restTemplate = aiRestTemplate;
        this.baseUrl = baseUrl;
    }

    @Retryable(
            retryFor = RestClientException.class,
            maxAttemptsExpression = "${ai.retry.max-attempts:3}",
            backoff = @Backoff(
                    delayExpression = "${ai.retry.delay-ms:300}",
                    multiplierExpression = "${ai.retry.multiplier:2.0}"
            )
    )
    public AiRawResponse analyze(AiAnalyzeRequest req) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<AiAnalyzeRequest> entity = new HttpEntity<>(req, headers);
        try {
            ResponseEntity<AiRawResponse> res =
                    restTemplate.exchange(baseUrl + "/analysis", HttpMethod.POST, entity, AiRawResponse.class);
            return res.getBody();
        } catch (RestClientException e) {
            throw e;
        }
    }
}
