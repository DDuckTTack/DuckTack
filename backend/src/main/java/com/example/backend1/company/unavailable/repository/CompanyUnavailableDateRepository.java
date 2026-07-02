package com.example.backend1.company.unavailable.repository;

import com.example.backend1.company.domain.Company;
import com.example.backend1.company.unavailable.domain.CompanyUnavailableDate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
public interface CompanyUnavailableDateRepository extends JpaRepository<CompanyUnavailableDate, Long> {

    boolean existsByCompanyAndUnavailableDate(Company company, LocalDate unavailableDate);

    List<CompanyUnavailableDate> findByCompany(Company company);

    List<CompanyUnavailableDate> findByCompanyOrderByUnavailableDateAsc(Company company);

    Optional<CompanyUnavailableDate> findByIdAndCompany(Long id, Company company);
}