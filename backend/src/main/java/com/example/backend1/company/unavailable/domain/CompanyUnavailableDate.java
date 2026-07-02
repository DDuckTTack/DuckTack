package com.example.backend1.company.unavailable.domain;

import com.example.backend1.company.domain.Company;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(
        name = "company_unavailable_dates",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_company_unavailable_date",
                        columnNames = {"company_id", "unavailable_date"}
                )
        }
)
public class CompanyUnavailableDate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 업체
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    // 예약 불가능 날짜
    @Column(name = "unavailable_date", nullable = false)
    private LocalDate unavailableDate;
}