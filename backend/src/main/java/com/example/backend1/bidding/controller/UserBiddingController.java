package com.example.backend1.bidding.controller;

import com.example.backend1.bidding.dto.BiddingDtos;
import com.example.backend1.bidding.service.BiddingService;
import com.example.backend1.common.ApiResponse;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bids")
public class UserBiddingController {
    private final BiddingService service;
    public UserBiddingController(BiddingService service) { this.service = service; }

    @PostMapping
    public ApiResponse<BiddingDtos.Item> create(Authentication auth, @RequestBody BiddingDtos.CreateRequest req) {
        return ApiResponse.ok(service.create(auth.getName(), req));
    }

    @GetMapping("/me")
    public ApiResponse<List<BiddingDtos.Item>> mine(Authentication auth) {
        return ApiResponse.ok(service.myRequests(auth.getName()));
    }

    @GetMapping("/{id}")
    public ApiResponse<BiddingDtos.Item> detail(Authentication auth, @PathVariable Long id) {
        return ApiResponse.ok(service.myRequest(auth.getName(), id));
    }

    @PostMapping("/{id}/select/{bidId}")
    public ApiResponse<BiddingDtos.SelectResponse> select(Authentication auth, @PathVariable Long id,
                                                          @PathVariable Long bidId) {
        return ApiResponse.ok(service.select(auth.getName(), id, bidId));
    }

    @PostMapping("/{id}/extend")
    public ApiResponse<BiddingDtos.Item> extend(Authentication auth, @PathVariable Long id,
                                                @RequestBody BiddingDtos.ExtendDeadlineRequest req) {
        return ApiResponse.ok(service.extendDeadline(auth.getName(), id, req.minutes()));
    }

    @PostMapping("/{id}/widen-radius")
    public ApiResponse<BiddingDtos.Item> widenRadius(Authentication auth, @PathVariable Long id,
                                                      @RequestBody BiddingDtos.WidenRadiusRequest req) {
        return ApiResponse.ok(service.widenRadius(auth.getName(), id, req.maxDistanceKm()));
    }
}
