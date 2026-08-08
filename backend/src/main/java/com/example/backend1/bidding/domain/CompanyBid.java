package com.example.backend1.bidding.domain;

import com.example.backend1.company.domain.Company;
import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "company_bids", uniqueConstraints = {
        @UniqueConstraint(name = "uk_company_bid_request_company", columnNames = {"bid_request_id", "company_id"})
})
public class CompanyBid {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bid_request_id")
    private BidRequest bidRequest;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id")
    private Company company;

    @Column(nullable = false)
    private Integer price;

    @Column(length = 1000)
    private String message;

    @Column(nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    protected CompanyBid() {}

    public CompanyBid(BidRequest bidRequest, Company company, Integer price, String message) {
        this.bidRequest = bidRequest;
        this.company = company;
        update(price, message);
    }

    public void update(Integer price, String message) {
        if (price == null || price < 1000) throw new IllegalArgumentException("입찰가는 1,000원 이상이어야 합니다.");
        this.price = price;
        this.message = message;
        this.updatedAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public BidRequest getBidRequest() { return bidRequest; }
    public Company getCompany() { return company; }
    public Integer getPrice() { return price; }
    public String getMessage() { return message; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
