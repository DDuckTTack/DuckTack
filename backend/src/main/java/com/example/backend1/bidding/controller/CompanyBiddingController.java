package com.example.backend1.bidding.controller;

import com.example.backend1.bidding.dto.BiddingDtos;
import com.example.backend1.bidding.service.BiddingService;
import com.example.backend1.common.ApiResponse;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/company/bids")
public class CompanyBiddingController {
    private final BiddingService service;
    public CompanyBiddingController(BiddingService service) { this.service = service; }

    @GetMapping
    public ApiResponse<List<BiddingDtos.Item>> opportunities(Authentication auth) {
        return ApiResponse.ok(service.companyOpportunities(auth.getName()));
    }

    @GetMapping("/mine")
    public ApiResponse<List<BiddingDtos.CompanyResult>> mine(Authentication auth) {
        return ApiResponse.ok(service.companyResults(auth.getName()));
    }

    @PostMapping("/{requestId}")
    public ApiResponse<BiddingDtos.Offer> submit(Authentication auth, @PathVariable Long requestId,
                                                  @RequestBody BiddingDtos.SubmitBidRequest req) {
        return ApiResponse.ok(service.submit(auth.getName(), requestId, req));
    }

    @GetMapping("/settings/radius")
    public ApiResponse<BiddingDtos.Radius> radius(Authentication auth) {
        return ApiResponse.ok(service.radius(auth.getName()));
    }

    @PutMapping("/settings/radius")
    public ApiResponse<BiddingDtos.Radius> updateRadius(Authentication auth,
                                                         @RequestBody BiddingDtos.RadiusRequest req) {
        return ApiResponse.ok(service.updateRadius(auth.getName(), req));
    }
}
