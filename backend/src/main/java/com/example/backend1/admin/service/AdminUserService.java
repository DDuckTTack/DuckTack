package com.example.backend1.admin.service;

import com.example.backend1.admin.dto.AdminUserDtos;
import com.example.backend1.common.ApiException;
import com.example.backend1.common.ErrorCode;
import com.example.backend1.company.domain.Company;
import com.example.backend1.history.repo.HistoryRepository;
import com.example.backend1.history.service.HistoryEntity;
import com.example.backend1.reservation.domain.Reservation;
import com.example.backend1.reservation.repo.ReservationRepository;
import com.example.backend1.review.repo.ReviewRepository;
import com.example.backend1.user.domain.User;
import com.example.backend1.user.repo.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AdminUserService {

  private final UserRepository userRepository;
  private final HistoryRepository historyRepository;
  private final ReservationRepository reservationRepository;
  private final ReviewRepository reviewRepository;

  public AdminUserService(
          UserRepository userRepository,
          HistoryRepository historyRepository,
          ReservationRepository reservationRepository,
          ReviewRepository reviewRepository
  ) {
    this.userRepository = userRepository;
    this.historyRepository = historyRepository;
    this.reservationRepository = reservationRepository;
    this.reviewRepository = reviewRepository;
  }

  @Transactional(readOnly = true)
  public Page<AdminUserDtos.UserListItem> listUsers(Pageable pageable) {
    return userRepository.findAll(pageable).map(this::toListItem);
  }

  @Transactional(readOnly = true)
  public AdminUserDtos.UserDetailResponse getUser(Long id) {
    User user = userRepository.findById(id)
            .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

    List<Reservation> reservations = reservationRepository.findByUserIdOrderByVisitDateDescVisitTimeDesc(user.getId());

    long pending = countStatus(reservations, Reservation.Status.PENDING);
    long accepted = countStatus(reservations, Reservation.Status.ACCEPTED);
    long rejected = countStatus(reservations, Reservation.Status.REJECTED);
    long done = countStatus(reservations, Reservation.Status.DONE);
    long cancelled = countStatus(reservations, Reservation.Status.CANCELLED);
    long noshow = countStatus(reservations, Reservation.Status.NOSHOW);
    long reviewCount = reviewRepository.countByUserId(user.getId());

    List<AdminUserDtos.UserReservationItem> items = reservations.stream()
            .map(r -> toReservationItem(r, user))
            .toList();

    return new AdminUserDtos.UserDetailResponse(
            toDetail(user),
            new AdminUserDtos.UserReservationStats(
                    reservations.size(),
                    accepted,
                    pending,
                    rejected,
                    done,
                    cancelled,
                    noshow,
                    reviewCount
            ),
            items
    );
  }

  /** 특정 사용자의 진단 이력 전체 조회 (관리자 전용) */
  @Transactional(readOnly = true)
  public List<AdminUserDtos.UserHistoryItem> getUserHistories(Long userId) {
    userRepository.findById(userId)
            .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

    List<HistoryEntity> histories = historyRepository.findByUserId(userId);

    return histories.stream()
            .map(h -> new AdminUserDtos.UserHistoryItem(
                    h.getId(),
                    h.getDiagnosis() != null ? h.getDiagnosis().getId() : null,
                    h.getStatus(),
                    h.getRiskScore(),
                    h.getIssueType(),
                    h.getCreatedAt()
            ))
            .collect(Collectors.toList());
  }

  private long countStatus(List<Reservation> reservations, Reservation.Status status) {
    return reservations.stream()
            .filter(r -> r.getStatus() == status)
            .count();
  }

  private AdminUserDtos.UserReservationItem toReservationItem(Reservation r, User user) {
    Company company = r.getCompany();

    Long companyId = company != null ? company.getId() : null;
    String companyName = company != null ? company.getName() : null;
    boolean reviewWritten = company != null && reviewRepository.existsByCompanyAndUser(company, user);

    return new AdminUserDtos.UserReservationItem(
            r.getId(),
            companyId,
            companyName,
            r.getStatus() != null ? r.getStatus().name() : null,
            r.getVisitDate() != null ? r.getVisitDate().toString() : null,
            r.getVisitTime() != null ? r.getVisitTime().toString() : null,
            r.getIssueSummary(),
            r.getRequestNote(),
            reviewWritten
    );
  }

  private AdminUserDtos.UserListItem toListItem(User u) {
    return new AdminUserDtos.UserListItem(
            u.getId(),
            u.getUsername(),
            u.getAddress()
    );
  }

  private AdminUserDtos.UserDetail toDetail(User u) {
    return new AdminUserDtos.UserDetail(
            u.getId(),
            u.getUsername(),
            u.getEmail(),
            u.getRole(),
            u.getPhoneNumber(),
            u.getAddress(),
            u.getResidenceType(),
            u.getRentType(),
            u.getCreatedAt()
    );
  }
}
