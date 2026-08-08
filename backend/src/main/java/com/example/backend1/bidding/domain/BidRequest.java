package com.example.backend1.bidding.domain;

import com.example.backend1.company.domain.Company;
import com.example.backend1.history.service.HistoryEntity;
import com.example.backend1.user.domain.User;
import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "bid_requests", indexes = {
        @Index(name = "idx_bid_request_status_deadline", columnList = "status, deadline"),
        @Index(name = "idx_bid_request_user_created", columnList = "user_id, createdAt")
})
public class BidRequest {
    public enum Status { OPEN, SELECTED, EXPIRED, CANCELLED }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private HistoryEntity history;

    @Column(nullable = false, length = 500)
    private String address;

    private Double latitude;
    private Double longitude;

    @Column(length = 1000)
    private String requestNote;

    @Column(nullable = false)
    private OffsetDateTime deadline;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.OPEN;

    @ManyToOne(fetch = FetchType.LAZY)
    private Company selectedCompany;

    private OffsetDateTime selectedAt;

    @Column(nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    protected BidRequest() {}

    public BidRequest(User user, HistoryEntity history, String address, Double latitude,
                      Double longitude, String requestNote, OffsetDateTime deadline) {
        this.user = user;
        this.history = history;
        this.address = address;
        this.latitude = latitude;
        this.longitude = longitude;
        this.requestNote = requestNote;
        this.deadline = deadline;
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public HistoryEntity getHistory() { return history; }
    public String getAddress() { return address; }
    public Double getLatitude() { return latitude; }
    public Double getLongitude() { return longitude; }
    public String getRequestNote() { return requestNote; }
    public OffsetDateTime getDeadline() { return deadline; }
    public Status getStatus() { return status; }
    public Company getSelectedCompany() { return selectedCompany; }
    public OffsetDateTime getSelectedAt() { return selectedAt; }
    public OffsetDateTime getCreatedAt() { return createdAt; }

    public boolean isOpen() {
        return status == Status.OPEN && deadline.isAfter(OffsetDateTime.now());
    }

    public void select(Company company) {
        if (!isOpen()) throw new IllegalStateException("마감된 입찰입니다.");
        this.selectedCompany = company;
        this.selectedAt = OffsetDateTime.now();
        this.status = Status.SELECTED;
    }

    public void expireIfNeeded() {
        if (status == Status.OPEN && !deadline.isAfter(OffsetDateTime.now())) status = Status.EXPIRED;
    }
}
