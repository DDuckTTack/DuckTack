package com.example.backend1.admin.controller;

import com.example.backend1.common.ApiResponse;
import com.example.backend1.support.dto.SupportDtos;
import com.example.backend1.support.service.SupportService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/support")
@SecurityRequirement(name = "bearerAuth")
public class AdminSupportController {

    private final SupportService supportService;

    public AdminSupportController(SupportService supportService) {
        this.supportService = supportService;
    }

    @GetMapping("/threads")
    public ApiResponse<Page<SupportDtos.AdminThreadItem>> listThreads(
            @RequestParam(required = false) String status,
            @PageableDefault(size = 20, sort = "lastMessageAt", direction = org.springframework.data.domain.Sort.Direction.DESC) Pageable pageable
    ) {
        return ApiResponse.ok(supportService.listThreadsForAdmin(status, pageable));
    }

    @GetMapping("/threads/{threadId}")
    public ApiResponse<SupportDtos.AdminThreadItem> getThread(@PathVariable Long threadId) {
        return ApiResponse.ok(supportService.getThreadForAdmin(threadId));
    }

    @GetMapping("/threads/{threadId}/messages")
    public ApiResponse<List<SupportDtos.MessageItem>> listMessages(
            @PathVariable Long threadId,
            @RequestParam(required = false) Long afterId,
            @PageableDefault(size = 30, sort = "id", direction = org.springframework.data.domain.Sort.Direction.DESC) Pageable pageable
    ) {
        return ApiResponse.ok(supportService.listMessagesForAdmin(threadId, afterId, pageable));
    }

    @PostMapping("/threads/{threadId}/messages")
    public ApiResponse<SupportDtos.MessageItem> sendMessage(
            @PathVariable Long threadId,
            @RequestBody SupportDtos.SendMessageRequest req,
            Authentication authentication
    ) {
        return ApiResponse.ok(supportService.sendAdminMessage(authentication.getName(), threadId, req));
    }
}
