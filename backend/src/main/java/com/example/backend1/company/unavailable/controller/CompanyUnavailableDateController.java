package com.example.backend1.company.unavailable.controller;

import com.example.backend1.company.unavailable.dto.CompanyUnavailableDateDtos;
import com.example.backend1.company.unavailable.service.CompanyUnavailableDateService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/company/unavailable-dates")
@RequiredArgsConstructor
public class CompanyUnavailableDateController {

    private final CompanyUnavailableDateService unavailableDateService;

    @GetMapping
    public List<CompanyUnavailableDateDtos.Response> getMyUnavailableDates(Authentication auth) {
        return unavailableDateService.getMyUnavailableDates(auth.getName());
    }

    @PostMapping
    public CompanyUnavailableDateDtos.Response create(
            Authentication auth,
            @RequestBody CompanyUnavailableDateDtos.CreateRequest request
    ) {
        return unavailableDateService.create(auth.getName(), request);
    }

    @DeleteMapping("/{id}")
    public void delete(
            Authentication auth,
            @PathVariable Long id
    ) {
        unavailableDateService.delete(auth.getName(), id);
    }
}