package com.example.backend1.company.unavailable.repository;

import com.example.backend1.company.domain.Company;
import com.example.backend1.company.unavailable.domain.CompanyUnavailableTime;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface CompanyUnavailableTimeRepository extends JpaRepository<CompanyUnavailableTime, Long> {

    // 🔥 특정 날짜의 차단 시간 조회
    List<CompanyUnavailableTime> findByCompanyAndDate(
            Company company,
            LocalDate date
    );
    List<CompanyUnavailableTime> findByCompany(Company company);
    // 🔥 특정 시간 차단 여부 체크 (이미 너 쓰고 있음)
    boolean existsByCompanyAndDateAndTime(
            Company company,
            LocalDate date,
            LocalTime time
    );
}