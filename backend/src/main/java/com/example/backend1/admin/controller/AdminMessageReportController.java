package com.example.backend1.admin.controller;

import com.example.backend1.common.ApiResponse;
import com.example.backend1.message.dto.MessageDtos;
import com.example.backend1.message.service.MessageService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/message-reports")
@SecurityRequirement(name = "bearerAuth")
public class AdminMessageReportController {

    private final MessageService messageService;

    public AdminMessageReportController(MessageService messageService) {
        this.messageService = messageService;
    }

    @GetMapping
    public ApiResponse<Page<MessageDtos.AdminMessageReportItem>> list(
            @RequestParam(required = false) String status,
            @PageableDefault(size = 20, sort = "createdAt", direction = org.springframework.data.domain.Sort.Direction.DESC) Pageable pageable
    ) {
        return ApiResponse.ok(messageService.listReports(status, pageable));
    }

    @PostMapping("/{id}/resolve")
    public ApiResponse<Void> resolve(
            @PathVariable Long id,
            @RequestBody MessageDtos.ResolveReportRequest req
    ) {
        messageService.resolveReport(id, req);
        return ApiResponse.ok(null);
    }
}
