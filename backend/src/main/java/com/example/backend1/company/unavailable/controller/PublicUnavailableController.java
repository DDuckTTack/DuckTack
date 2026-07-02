package com.example.backend1.company.unavailable.controller;

import com.example.backend1.company.domain.Company;
import com.example.backend1.company.repo.CompanyRepository;
import com.example.backend1.company.unavailable.repository.CompanyUnavailableDateRepository;
import com.example.backend1.company.unavailable.repository.CompanyUnavailableTimeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
public class PublicUnavailableController {

    private static final List<String> FULL_DAY_TIMES = List.of(
            "09:00",
            "10:00",
            "11:00",
            "12:00",
            "13:00",
            "14:00",
            "15:00",
            "16:00",
            "17:00",
            "18:00",
            "19:00",
            "20:00",
            "21:00"
    );

    private final CompanyRepository companyRepo;
    private final CompanyUnavailableTimeRepository timeRepo;
    private final CompanyUnavailableDateRepository dateRepo;

    /**
     * 앱 예약 화면용: 특정 업체의 특정 날짜 차단 시간 조회.
     *
     * 새 경로:
     * GET /api/public/companies/{companyId}/unavailable-times?date=2026-06-01
     *
     * 기존 호환 경로:
     * GET /api/company/{companyId}/unavailable?date=2026-06-01
     */
    @GetMapping({
            "/api/company/{companyId}/unavailable",
            "/api/public/companies/{companyId}/unavailable-times"
    })
    public List<String> getUnavailableTimes(
            @PathVariable Long companyId,
            @RequestParam String date
    ) {
        Company company = companyRepo.findById(companyId)
                .orElseThrow(() -> new RuntimeException("업체 없음"));

        LocalDate targetDate = LocalDate.parse(date);

        return timeRepo.findByCompanyAndDate(company, targetDate)
                .stream()
                .map(t -> normalizeTime(t.getTime().toString()))
                .sorted()
                .toList();
    }

    /**
     * 앱 예약 화면용: 특정 업체의 전체 휴무 날짜 조회.
     *
     * GET /api/public/companies/{companyId}/unavailable-dates
     *
     * 주의:
     * - company_unavailable_dates에 등록된 날짜도 포함
     * - 시간 차단이 09:00~21:00 전부 들어간 날짜도 전체 휴무로 간주
     */
    @GetMapping("/api/public/companies/{companyId}/unavailable-dates")
    public List<String> getUnavailableDates(@PathVariable Long companyId) {
        Company company = companyRepo.findById(companyId)
                .orElseThrow(() -> new RuntimeException("업체 없음"));

        Set<String> result = new HashSet<>();

        dateRepo.findByCompany(company)
                .forEach(d -> result.add(d.getUnavailableDate().toString()));

        Map<LocalDate, Set<String>> timeMap = timeRepo.findByCompany(company)
                .stream()
                .collect(Collectors.groupingBy(
                        t -> t.getDate(),
                        Collectors.mapping(
                                t -> normalizeTime(t.getTime().toString()),
                                Collectors.toSet()
                        )
                ));

        for (Map.Entry<LocalDate, Set<String>> entry : timeMap.entrySet()) {
            if (entry.getValue().containsAll(FULL_DAY_TIMES)) {
                result.add(entry.getKey().toString());
            }
        }

        return result.stream()
                .sorted()
                .toList();
    }

    private String normalizeTime(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }

        return value.length() >= 5 ? value.substring(0, 5) : value;
    }
}