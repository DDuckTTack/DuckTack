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

    @Column(name = "max_distance_km")
    private Integer maxDistanceKm;

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
                      Double longitude, String requestNote, OffsetDateTime deadline, Integer maxDistanceKm) {
        this.user = user;
        this.history = history;
        this.address = address;
        this.latitude = latitude;
        this.longitude = longitude;
        this.requestNote = requestNote;
        this.deadline = deadline;
        this.maxDistanceKm = maxDistanceKm;
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public HistoryEntity getHistory() { return history; }
    public String getAddress() { return address; }
    public Double getLatitude() { return latitude; }
    public Double getLongitude() { return longitude; }
    public String getRequestNote() { return requestNote; }
    public Integer getMaxDistanceKm() { return maxDistanceKm; }
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

    public void extendDeadline(int minutes) {
        if (!isOpen()) throw new IllegalStateException("진행 중인 입찰만 마감을 연장할 수 있습니다.");
        if (minutes <= 0) throw new IllegalArgumentException("연장 시간이 올바르지 않습니다.");
        OffsetDateTime extended = this.deadline.plusMinutes(minutes);
        if (extended.isAfter(this.createdAt.plusHours(72))) {
            throw new IllegalStateException("최대 72시간까지만 연장할 수 있어요.");
        }
        this.deadline = extended;
    }

    public void widenMaxDistanceKm(Integer newMaxDistanceKm) {
        if (!isOpen()) throw new IllegalStateException("진행 중인 입찰만 반경을 조정할 수 있습니다.");
        if (this.maxDistanceKm == null) {
            throw new IllegalStateException("이미 전체 지역으로 설정되어 있어 더 넓힐 수 없습니다.");
        }
        if (newMaxDistanceKm != null && newMaxDistanceKm <= this.maxDistanceKm) {
            throw new IllegalArgumentException("현재보다 넓은 반경만 선택할 수 있습니다.");
        }
        this.maxDistanceKm = newMaxDistanceKm;
    }
}
