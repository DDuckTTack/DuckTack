package com.example.backend1.company.dto;

import com.example.backend1.company.domain.Company;
import lombok.Getter;

@Getter
public class CompanyResponse {

    private Long id;
    private String name;
    private double distanceKm;
    private Integer minEstimatedQuoteKrw; // 수정
    private Integer maxEstimatedQuoteKrw; // 추가

    public CompanyResponse(Company c, double distanceKm) {
        this.id = c.getId();
        this.name = c.getName();
        this.distanceKm = distanceKm;
        this.minEstimatedQuoteKrw = c.getMinEstimatedQuoteKrw(); // 수정
        this.maxEstimatedQuoteKrw = c.getMaxEstimatedQuoteKrw(); // 수정
    }
}