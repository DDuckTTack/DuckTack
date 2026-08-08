package com.example.backend1.user.controller;

import com.example.backend1.common.ApiResponse;
import com.example.backend1.company.service.KakaoLocalClient;
import com.example.backend1.user.dto.AddressDtos;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/addresses")
public class AddressController {
    private final KakaoLocalClient kakao;
    public AddressController(KakaoLocalClient kakao) { this.kakao = kakao; }

    @GetMapping("/search")
    public ApiResponse<List<AddressDtos.Item>> search(@RequestParam String query) {
        if (query == null || query.trim().length() < 2) return ApiResponse.ok(List.of());
        Map<String, Object> response = kakao.searchAddress(query);
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
