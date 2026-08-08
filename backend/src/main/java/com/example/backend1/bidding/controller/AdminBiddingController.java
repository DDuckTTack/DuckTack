package com.example.backend1.bidding.controller;

import com.example.backend1.bidding.dto.BiddingDtos;
import com.example.backend1.bidding.service.BiddingService;
import com.example.backend1.common.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/bids")
public class AdminBiddingController {
    private final BiddingService service;

    public AdminBiddingController(BiddingService service) { this.service = service; }

    @GetMapping
    public ApiResponse<List<BiddingDtos.AdminItem>> list() {
        return ApiResponse.ok(service.adminRequests());
    }
}
