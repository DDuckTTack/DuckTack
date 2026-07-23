package com.example.backend1.coupon.service;

import com.example.backend1.common.ApiException;
import com.example.backend1.common.ErrorCode;
import com.example.backend1.company.domain.Company;
import com.example.backend1.coupon.domain.Coupon;
import com.example.backend1.coupon.domain.CouponStatus;
import com.example.backend1.coupon.dto.CouponDtos;
import com.example.backend1.coupon.repo.CouponRepository;
import com.example.backend1.reservation.repo.ReservationRepository;
import com.example.backend1.user.domain.User;
import com.example.backend1.user.repo.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CouponService {

    private static final int REPEAT_VISIT_DISCOUNT_PERCENT = 5;

    private final CouponRepository couponRepository;
    private final ReservationRepository reservationRepository;
    private final UserRepository userRepository;

    public CouponService(
            CouponRepository couponRepository,
            ReservationRepository reservationRepository,
            UserRepository userRepository
    ) {
        this.couponRepository = couponRepository;
        this.reservationRepository = reservationRepository;
        this.userRepository = userRepository;
    }

    /**
     * 예약이 DONE 처리될 때 호출한다. 이번 예약을 제외하고 동일 유저+업체로 이미 완료된
     * 예약(재방문)이 있고, 아직 사용하지 않은 쿠폰이 없다면 다음 방문 할인 쿠폰을 발급한다.
     */
    @Transactional
    public void issueRepeatVisitCouponIfEligible(User user, Company company, Long currentReservationId) {
        boolean hasPriorVisit = reservationRepository.existsByUserIdAndCompanyIdAndStatusAndIdNot(
                user.getId(),
                company.getId(),
                com.example.backend1.reservation.domain.Reservation.Status.DONE,
                currentReservationId
        );

        if (!hasPriorVisit) {
            return;
        }

        boolean alreadyHasAvailableCoupon = couponRepository.existsByUserIdAndCompanyIdAndStatus(
                user.getId(), company.getId(), CouponStatus.AVAILABLE
        );

        if (alreadyHasAvailableCoupon) {
            return;
        }

        couponRepository.save(new Coupon(user, company, REPEAT_VISIT_DISCOUNT_PERCENT, currentReservationId));
    }

    @Transactional(readOnly = true)
    public List<CouponDtos.CouponItem> listMyCoupons(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

        return couponRepository.findByUserIdOrderByIssuedAtDesc(user.getId())
                .stream()
                .map(CouponService::toItem)
                .toList();
    }

    @Transactional
    public CouponDtos.CouponItem useCoupon(String username, Long couponId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

        Coupon coupon = couponRepository.findById(couponId)
                .orElseThrow(() -> new ApiException(ErrorCode.COUPON_NOT_FOUND));

        if (!coupon.getUser().getId().equals(user.getId())) {
            throw new ApiException(ErrorCode.ACCESS_DENIED);
        }

        if (coupon.getStatus() == CouponStatus.USED) {
            throw new ApiException(ErrorCode.COUPON_ALREADY_USED);
        }

        coupon.markUsed();

        return toItem(coupon);
    }

    private static CouponDtos.CouponItem toItem(Coupon coupon) {
        return new CouponDtos.CouponItem(
                coupon.getId(),
                coupon.getCompany().getId(),
                coupon.getCompany().getName(),
                coupon.getDiscountPercent(),
                coupon.getStatus(),
                coupon.getIssuedAt(),
                coupon.getUsedAt()
        );
    }
}
