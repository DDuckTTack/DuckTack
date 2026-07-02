package com.example.backend1.admin.controller;

import com.example.backend1.admin.dto.AdminProductDtos;
import com.example.backend1.admin.service.AdminProductService;
import com.example.backend1.common.ApiResponse;
import com.example.backend1.diagnosis.domain.IssueType;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Admin - Product")
@RestController
@RequestMapping("/api/admin/products")
@RequiredArgsConstructor
public class AdminProductController {

    private final AdminProductService adminProductService;

    @Operation(summary = "물품 수동 등록")
    @PostMapping
    public ApiResponse<AdminProductDtos.Response> create(
            @RequestBody @Valid AdminProductDtos.CreateRequest req
    ) {
        return ApiResponse.ok(adminProductService.create(req));
    }

    @Operation(summary = "물품 전체 목록")
    @GetMapping
    public ApiResponse<Page<AdminProductDtos.ListItem>> list(
            @RequestParam(required = false) IssueType category,
            Pageable pageable
    ) {
        return ApiResponse.ok(adminProductService.list(category, pageable));
    }

    @Operation(summary = "물품 수정")
    @PutMapping("/{id}")
    public ApiResponse<AdminProductDtos.Response> update(
            @PathVariable Long id,
            @RequestBody @Valid AdminProductDtos.UpdateRequest req
    ) {
        return ApiResponse.ok(adminProductService.update(id, req));
    }

    @Operation(summary = "앱 노출 여부 변경")
    @PatchMapping("/{id}/active")
    public ApiResponse<AdminProductDtos.Response> updateActive(
            @PathVariable Long id,
            @RequestBody @Valid AdminProductDtos.ActiveRequest req
    ) {
        return ApiResponse.ok(adminProductService.updateActive(id, req));
    }

    @Operation(summary = "물품 완전 삭제")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        adminProductService.delete(id);
        return ApiResponse.ok(null);
    }
}