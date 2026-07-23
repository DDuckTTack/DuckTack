package com.example.backend1.coupon.repo;

import com.example.backend1.coupon.domain.Coupon;
import com.example.backend1.coupon.domain.CouponStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CouponRepository extends JpaRepository<Coupon, Long> {

    List<Coupon> findByUserIdOrderByIssuedAtDesc(Long userId);

    boolean existsByUserIdAndCompanyIdAndStatus(Long userId, Long companyId, CouponStatus status);
}
