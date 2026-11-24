package com.example.backend1.user.controller;

import com.example.backend1.common.ApiException;
import com.example.backend1.common.ApiResponse;
import com.example.backend1.common.ErrorCode;
import com.example.backend1.company.service.KakaoLocalClient;
import com.example.backend1.user.dto.AddressDtos;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClientException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/addresses")
public class AddressController {
    private static final Logger log = LoggerFactory.getLogger(AddressController.class);
    private final KakaoLocalClient kakao;
    public AddressController(KakaoLocalClient kakao) { this.kakao = kakao; }

    @GetMapping("/search")
    public ApiResponse<List<AddressDtos.Item>> search(@RequestParam String query) {
        if (query == null || query.trim().length() < 2) return ApiResponse.ok(List.of());
        Map<String, Object> response;
        try {
            response = kakao.searchAddress(query);
        } catch (RestClientException e) {
            // 카카오 키 누락·만료(401/403)나 한도 초과 시. 원인은 로그로 남기고 사용자에게는 안내 문구만 준다.
            log.warn("[AddressController] 카카오 주소 검색 실패: {}", e.getMessage());
            throw new ApiException(ErrorCode.INTERNAL_ERROR, "주소 검색 서비스에 일시적인 문제가 있어요. 잠시 후 다시 시도해주세요.");
        }
        List<AddressDtos.Item> result = new ArrayList<>();
        Object raw = response == null ? null : response.get("documents");
        if (raw instanceof List<?> documents) {
            for (Object value : documents) {
                if (!(value instanceof Map<?, ?> document)) continue;
                Map<?, ?> road = document.get("road_address") instanceof Map<?, ?> map ? map : Map.of();
                Map<?, ?> address = document.get("address") instanceof Map<?, ?> map ? map : Map.of();
                String roadName = text(road.get("address_name"));
                String jibun = text(address.get("address_name"));
                result.add(new AddressDtos.Item(
                        roadName.isBlank() ? jibun : roadName,
                        jibun,
                        text(road.get("zone_no")),
                        number(document.get("y")),
                        number(document.get("x"))
                ));
            }
        }
        return ApiResponse.ok(result);
    }

    private static String text(Object value) { return value == null ? "" : String.valueOf(value); }
    private static Double number(Object value) {
        try { return value == null ? null : Double.valueOf(String.valueOf(value)); }
        catch (NumberFormatException ignored) { return null; }
    }
}
