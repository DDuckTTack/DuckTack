package com.example.backend1.support.controller;

import com.example.backend1.common.ApiResponse;
import com.example.backend1.support.dto.SupportDtos;
import com.example.backend1.support.service.SupportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Support")
@RestController
@RequestMapping("/api/support")
public class SupportController {

    private final SupportService supportService;

    public SupportController(SupportService supportService) {
        this.supportService = supportService;
    }

    @Operation(summary = "내 문의 채팅방 조회 (없으면 생성)")
    @GetMapping("/thread")
    public ApiResponse<SupportDtos.ThreadItem> getMyThread(Authentication authentication) {
        return ApiResponse.ok(supportService.getOrCreateMyThread(authentication.getName()));
    }

    @Operation(summary = "내 문의 메시지 목록 조회 (afterId로 폴링)")
    @GetMapping("/thread/messages")
    public ApiResponse<List<SupportDtos.MessageItem>> listMyMessages(
            @RequestParam(required = false) Long afterId,
            @PageableDefault(size = 30, sort = "id", direction = org.springframework.data.domain.Sort.Direction.DESC) Pageable pageable,
            Authentication authentication
    ) {
        return ApiResponse.ok(supportService.listMyMessages(authentication.getName(), afterId, pageable));
    }

    @Operation(summary = "문의 메시지 전송")
    @PostMapping("/thread/messages")
    public ApiResponse<SupportDtos.MessageItem> sendMyMessage(
            @RequestBody SupportDtos.SendMessageRequest req,
            Authentication authentication
    ) {
        return ApiResponse.ok(supportService.sendMyMessage(authentication.getName(), req));
    }
}
