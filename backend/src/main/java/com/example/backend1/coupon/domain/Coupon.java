package com.example.backend1.coupon.domain;

import com.example.backend1.company.domain.Company;
import com.example.backend1.user.domain.User;
import jakarta.persistence.*;

import java.time.OffsetDateTime;

/**
 * 동일 업체 재방문(2회차 이상 완료) 시 발급되는 다음 방문 할인 쿠폰.
 * 결제 연동이 없어 자동 차감은 하지 않고, 앱 내 쿠폰함에서 제시용으로만 사용한다.
 */
@Entity
public class Coupon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    private Company company;

    private int discountPercent;

    @Enumerated(EnumType.STRING)
    private CouponStatus status;

    private OffsetDateTime issuedAt;
    private OffsetDateTime usedAt;

    // 이 쿠폰을 발급시킨 계기가 된 예약(재방문 완료 예약)
    private Long sourceReservationId;

    protected Coupon() {
    }

    public Coupon(User user, Company company, int discountPercent, Long sourceReservationId) {
        this.user = user;
        this.company = company;
        this.discountPercent = discountPercent;
        this.sourceReservationId = sourceReservationId;
        this.status = CouponStatus.AVAILABLE;
        this.issuedAt = OffsetDateTime.now();
    }

    public void markUsed() {
        this.status = CouponStatus.USED;
        this.usedAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public Company getCompany() { return company; }
    public int getDiscountPercent() { return discountPercent; }
    public CouponStatus getStatus() { return status; }
    public OffsetDateTime getIssuedAt() { return issuedAt; }
    public OffsetDateTime getUsedAt() { return usedAt; }
    public Long getSourceReservationId() { return sourceReservationId; }
}
