package com.example.backend1.company.unavailable.controller;
import java.util.List;
import com.example.backend1.company.unavailable.dto.CompanyUnavailableTimeDtos;
import com.example.backend1.company.unavailable.service.CompanyUnavailableTimeService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/company/unavailable-times")
@RequiredArgsConstructor
public class CompanyUnavailableTimeController {

    private final CompanyUnavailableTimeService service;
    @GetMapping
    public List<CompanyUnavailableTimeDtos.Response> getMy(Authentication auth) {
        return service.getMy(auth.getName());
    }
    @PostMapping
    public void create(Authentication auth,
                       @RequestBody CompanyUnavailableTimeDtos.CreateRequest req) {
        service.create(auth.getName(), req);
    }

    @DeleteMapping("/{id}")
    public void delete(Authentication auth,
                       @PathVariable Long id) {
        service.delete(auth.getName(), id);
    }
}