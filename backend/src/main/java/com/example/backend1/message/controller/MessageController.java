package com.example.backend1.message.controller;

import com.example.backend1.common.ApiResponse;
import com.example.backend1.message.dto.MessageDtos;
import com.example.backend1.message.service.MessageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Message")
@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    @Operation(summary = "내 대화 목록 조회")
    @GetMapping("/conversations")
    public ApiResponse<Page<MessageDtos.ConversationItem>> listConversations(
            @RequestParam(required = false) String type,
            @PageableDefault(size = 20, sort = "lastMessageAt", direction = org.springframework.data.domain.Sort.Direction.DESC) Pageable pageable,
            Authentication authentication
    ) {
        return ApiResponse.ok(messageService.listConversations(authentication.getName(), type, pageable));
    }

    @Operation(summary = "대화 생성 또는 조회")
    @PostMapping("/conversations")
    public ApiResponse<MessageDtos.ConversationItem> createConversation(
            @RequestBody MessageDtos.CreateConversationRequest req,
            Authentication authentication
    ) {
        return ApiResponse.ok(messageService.getOrCreateConversation(authentication.getName(), req));
    }

    @Operation(summary = "대화 상세 조회")
    @GetMapping("/conversations/{id}")
    public ApiResponse<MessageDtos.ConversationItem> getConversation(
            @PathVariable Long id,
            Authentication authentication
    ) {
        return ApiResponse.ok(messageService.getConversation(authentication.getName(), id));
    }

    @Operation(summary = "메시지 목록 조회 (afterId로 폴링)")
    @GetMapping("/conversations/{id}/messages")
    public ApiResponse<List<MessageDtos.MessageItem>> listMessages(
            @PathVariable Long id,
            @RequestParam(required = false) Long afterId,
            @PageableDefault(size = 30, sort = "id", direction = org.springframework.data.domain.Sort.Direction.DESC) Pageable pageable,
            Authentication authentication
    ) {
        return ApiResponse.ok(messageService.listMessages(authentication.getName(), id, afterId, pageable));
    }

    @Operation(summary = "메시지 전송")
    @PostMapping("/conversations/{id}/messages")
    public ApiResponse<MessageDtos.MessageItem> sendMessage(
            @PathVariable Long id,
            @RequestBody MessageDtos.SendMessageRequest req,
            Authentication authentication
    ) {
        return ApiResponse.ok(messageService.sendMessage(authentication.getName(), id, req));
    }

    @Operation(summary = "쪽지/상대방 신고")
    @PostMapping("/reports")
    public ApiResponse<Void> report(
            @RequestBody MessageDtos.ReportRequest req,
            Authentication authentication
    ) {
        messageService.reportMessage(authentication.getName(), req);
        return ApiResponse.ok(null);
    }
}
