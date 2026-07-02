package com.example.backend1.company.unavailable.domain;

import com.example.backend1.company.domain.Company;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity
public class CompanyUnavailableTime {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 업체
    @ManyToOne
    private Company company;

    // 날짜
    private LocalDate date;

    // 시간
    private LocalTime time;

    // ===== getter =====
    public Long getId() { return id; }
    public Company getCompany() { return company; }
    public LocalDate getDate() { return date; }
    public LocalTime getTime() { return time; }

    // ===== setter =====
    public void setCompany(Company company) { this.company = company; }
    public void setDate(LocalDate date) { this.date = date; }
    public void setTime(LocalTime time) { this.time = time; }
}