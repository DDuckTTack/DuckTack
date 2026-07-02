package com.example.backend1.admin.controller;

import com.example.backend1.admin.dto.AdminCompanyDtos;
import com.example.backend1.admin.service.AdminCompanyService;
import com.example.backend1.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/companies")
public class AdminCompanyController {

    private final AdminCompanyService adminCompanyService;

    public AdminCompanyController(AdminCompanyService adminCompanyService) {
        this.adminCompanyService = adminCompanyService;
    }

    @PostMapping
    public ApiResponse<AdminCompanyDtos.CompanyResponse> create(
            @RequestBody @Valid AdminCompanyDtos.CreateRequest req
    ) {
        return ApiResponse.ok(adminCompanyService.create(req));
    }

    @GetMapping
    public ApiResponse<Page<AdminCompanyDtos.CompanyListItem>> list(
            @RequestParam(required = false) Boolean activeOnly,
            @PageableDefault(size = 100) Pageable pageable
    ) {
        return ApiResponse.ok(adminCompanyService.list(activeOnly, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<AdminCompanyDtos.CompanyResponse> get(@PathVariable Long id) {
        return ApiResponse.ok(adminCompanyService.get(id));
    }

    @PutMapping("/{id}")
    public ApiResponse<AdminCompanyDtos.CompanyResponse> update(
            @PathVariable Long id,
            @RequestBody @Valid AdminCompanyDtos.UpdateRequest req
    ) {
        return ApiResponse.ok(adminCompanyService.update(id, req));
    }

    @PatchMapping("/{id}/active")
    public ApiResponse<AdminCompanyDtos.CompanyResponse> setActive(
            @PathVariable Long id,
            @RequestBody @Valid AdminCompanyDtos.SetActiveRequest req
    ) {
        return ApiResponse.ok(adminCompanyService.setActive(id, req.active()));
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<AdminCompanyDtos.CompanyResponse> setStatus(
            @PathVariable Long id,
            @RequestBody @Valid AdminCompanyDtos.SetStatusRequest req
    ) {
        return ApiResponse.ok(adminCompanyService.setStatus(id, req.status()));
    }
}