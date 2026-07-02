package com.example.backend1.reservation.service;

import com.example.backend1.company.domain.Company;
import com.example.backend1.company.repo.CompanyRepository;
import com.example.backend1.company.unavailable.repository.CompanyUnavailableDateRepository;
import com.example.backend1.company.unavailable.repository.CompanyUnavailableTimeRepository;
import com.example.backend1.history.repo.HistoryRepository;
import com.example.backend1.history.service.HistoryEntity;
import com.example.backend1.reservation.domain.Reservation;
import com.example.backend1.reservation.dto.CompleteReservationRequest;
import com.example.backend1.reservation.dto.ReservationCalendarResponse;
import com.example.backend1.reservation.dto.ReservationDetailResponse;
import com.example.backend1.reservation.dto.ReservationRequest;
import com.example.backend1.reservation.repo.ReservationRepository;
import com.example.backend1.user.domain.User;
import com.example.backend1.user.repo.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class ReservationService {

    private static final List<Reservation.Status> ACTIVE_RESERVATION_STATUSES = List.of(
            Reservation.Status.PENDING,
            Reservation.Status.ACCEPTED
    );

    private final ReservationRepository reservationRepo;
    private final CompanyRepository companyRepo;
    private final CompanyUnavailableDateRepository dateRepo;
    private final CompanyUnavailableTimeRepository timeRepo;
    private final UserRepository userRepository;
    private final HistoryRepository historyRepository;

    public ReservationService(
            ReservationRepository reservationRepo,
            CompanyRepository companyRepo,
            CompanyUnavailableDateRepository dateRepo,
            CompanyUnavailableTimeRepository timeRepo,
            UserRepository userRepository,
            HistoryRepository historyRepository
    ) {
        this.reservationRepo = reservationRepo;
        this.companyRepo = companyRepo;
        this.dateRepo = dateRepo;
        this.timeRepo = timeRepo;
        this.userRepository = userRepository;
        this.historyRepository = historyRepository;
    }

    public void create(ReservationRequest req, Authentication auth) {
        if (auth == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }

        if (req == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "예약 요청 정보가 없습니다.");
        }

        String username = auth.getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        if (req.vendorId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "예약할 업체 정보가 없습니다.");
        }

        Company company = companyRepo.findById(req.vendorId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "업체를 찾을 수 없습니다."));

        if (!company.isActive() || !company.isPartner() || !company.isApproved()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "제휴업체만 예약할 수 있습니다.");
        }

        LocalDate visitDate = req.visitDate();
        LocalTime visitTime = req.visitTime();

        if (visitDate == null || visitTime == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "방문 날짜와 시간을 선택해주세요.");
        }

        HistoryEntity history = resolveHistory(req, user);

        /**
         * 중복 요청 방지 핵심.
         * 앱에서 같은 예약 요청이 빠르게 2번 전송되면 첫 번째 요청에서 이미 history.reservation_id가 연결된다.
         * 이때 두 번째 요청은 실패로 처리하지 말고 성공처럼 무시한다.
         */
        if (history != null && history.getReservation() != null) {
            Reservation existing = history.getReservation();

            boolean sameReservation = existing.getCompany() != null
                    && existing.getCompany().getId().equals(company.getId())
                    && visitDate.equals(existing.getVisitDate())
                    && visitTime.equals(existing.getVisitTime());

            if (sameReservation) {
                return;
            }

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "해당 진단 기록에는 이미 다른 예약이 연결되어 있습니다."
            );
        }

        if (dateRepo.existsByCompanyAndUnavailableDate(company, visitDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "해당 날짜는 업체 휴무일입니다.");
        }

        if (timeRepo.existsByCompanyAndDateAndTime(company, visitDate, visitTime)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "해당 시간은 업체가 차단한 시간입니다.");
        }

        LocalTime start = visitTime.minusMinutes(30);
        LocalTime end = visitTime.plusMinutes(30);

        boolean exists = reservationRepo
                .existsByCompanyAndVisitDateAndVisitTimeBetweenAndStatusIn(
                        company,
                        visitDate,
                        start,
                        end,
                        ACTIVE_RESERVATION_STATUSES
                );

        if (exists) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "이미 다른 사용자가 예약했습니다. 다른 시간대를 이용해주세요."
            );
        }

        Reservation reservation = new Reservation();
        reservation.setCompany(company);
        reservation.setUser(user);
        reservation.setCustomerName(req.customerName());
        reservation.setPhoneNumber(req.phoneNumber());
        reservation.setAddress(req.address());
        reservation.setVisitDate(visitDate);
        reservation.setVisitTime(visitTime);
        reservation.setIssueSummary(req.issueSummary());
        reservation.setRequestNote(req.requestNote());
        reservation.setStatus(Reservation.Status.PENDING);
        reservation.setRejectReason(null);

        reservationRepo.save(reservation);

        if (history != null) {
            history.setReservation(reservation);
        }
    }

    private HistoryEntity resolveHistory(ReservationRequest req, User user) {
        Long historyId = req.historyId();

        if (historyId == null) {
            historyId = extractHistoryIdFromRequestNote(req.requestNote());
        }

        if (historyId == null) {
            return null;
        }

        HistoryEntity history = historyRepository.findById(historyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "히스토리를 찾을 수 없습니다."));

        if (!history.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 진단 기록에만 예약을 연결할 수 있습니다.");
        }

        return history;
    }

    private Long extractHistoryIdFromRequestNote(String requestNote) {
        if (requestNote == null || requestNote.isBlank()) {
            return null;
        }

        java.util.regex.Matcher matcher =
                java.util.regex.Pattern.compile("historyId=(\\d+)").matcher(requestNote);

        if (!matcher.find()) {
            return null;
        }

        try {
            return Long.parseLong(matcher.group(1));
        } catch (NumberFormatException e) {
            return null;
        }
    }


    @Transactional(readOnly = true)
    public String getDiagnosisImageUrl(Long reservationId) {
        if (reservationId == null) {
            return null;
        }

        return historyRepository.findByReservation_Id(reservationId)
                .map(history -> {
                    if (history.getDiagnosisResult() != null) {
                        return history.getDiagnosisResult().getImageUrl();
                    }
                    return null;
                })
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<Reservation> getReservationsByDate(Long companyId, LocalDate date) {
        return reservationRepo.findByCompanyAndDate(companyId, date);
    }

    @Transactional(readOnly = true)
    public ReservationDetailResponse getDetail(Long reservationId, Long companyId) {
        Reservation reservation = reservationRepo.findById(reservationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "예약을 찾을 수 없습니다."));

        if (!reservation.getCompany().getId().equals(companyId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "예약을 조회할 권한이 없습니다.");
        }

        String statusName = reservation.getStatus() != null
                ? reservation.getStatus().name()
                : null;

        boolean canViewContact =
                "ACCEPTED".equals(statusName)
                        || "DONE".equals(statusName);

        String phone = reservation.getPhoneNumber();
        String customerEmail = null;

        if (!canViewContact && phone != null) {
            phone = phone.replaceAll("(\\d{3})\\d{4}(\\d{4})", "$1****$2");
        }

        if (canViewContact && reservation.getUser() != null) {
            customerEmail = reservation.getUser().getEmail();
        }

        String imageUrl = getDiagnosisImageUrl(reservation.getId());

        return ReservationDetailResponse.builder()
                .id(reservation.getId())
                .status(statusName)
                .customerName(reservation.getCustomerName())
                .phoneNumber(phone)
                .customerEmail(customerEmail)
                .address(reservation.getAddress())
                .issueSummary(reservation.getIssueSummary())
                .requestNote(reservation.getRequestNote())
                .visitDate(reservation.getVisitDate())
                .visitTime(reservation.getVisitTime())
                .repairCompletedDate(reservation.getRepairCompletedDate())
                .repairTotalCost(reservation.getRepairTotalCost())
                .repairSummary(reservation.getRepairSummary())
                .imageUrl(imageUrl)
                .build();
    }

    public void updateStatus(Long id, String status, Long companyId) {
        Reservation reservation = reservationRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "예약을 찾을 수 없습니다."));

        if (!reservation.getCompany().getId().equals(companyId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "예약 상태를 변경할 권한이 없습니다.");
        }

        Reservation.Status nextStatus;
        try {
            nextStatus = Reservation.Status.valueOf(status);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "잘못된 예약 상태입니다.");
        }

        if (nextStatus == Reservation.Status.DONE) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "수리 완료 처리는 완료일, 총비용, 실제 작업요약을 함께 입력해야 합니다."
            );
        }

        reservation.setStatus(nextStatus);

        if (nextStatus != Reservation.Status.REJECTED) {
            reservation.setRejectReason(null);
        }

        reservationRepo.save(reservation);
    }

    public void completeReservation(Long id, Long companyId, CompleteReservationRequest req) {
        Reservation reservation = reservationRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "예약을 찾을 수 없습니다."));

        if (!reservation.getCompany().getId().equals(companyId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "수리 완료 처리 권한이 없습니다.");
        }

        if (reservation.getStatus() == Reservation.Status.REJECTED
                || reservation.getStatus() == Reservation.Status.CANCELLED
                || reservation.getStatus() == Reservation.Status.NOSHOW) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "거절/취소/노쇼 처리된 예약은 수리 완료로 변경할 수 없습니다."
            );
        }

        if (req == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "수리 완료 정보를 입력해주세요.");
        }

        if (req.repairCompletedDate() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "수리 완료일을 입력해주세요.");
        }

        if (req.totalCost() == null || req.totalCost() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "총비용을 0원 이상으로 입력해주세요.");
        }

        String repairSummary = req.repairSummary() != null
                ? req.repairSummary().trim()
                : "";

        if (repairSummary.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "실제 작업요약을 입력해주세요.");
        }

        reservation.completeRepair(
                req.repairCompletedDate(),
                req.totalCost(),
                repairSummary
        );

        reservationRepo.save(reservation);
    }

    public void rejectReservation(Long id, Long companyId, String reason) {
        Reservation reservation = reservationRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "예약을 찾을 수 없습니다."));

        if (!reservation.getCompany().getId().equals(companyId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "예약을 거절할 권한이 없습니다.");
        }

        if (reservation.getStatus() != Reservation.Status.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "대기 중인 예약만 거절할 수 있습니다.");
        }

        String rejectReason = reason == null || reason.isBlank()
                ? "업체 사정으로 예약이 거절되었습니다."
                : reason.trim();

        reservation.setStatus(Reservation.Status.REJECTED);
        reservation.setRejectReason(rejectReason);

        reservationRepo.save(reservation);
    }

    public void cancelReservation(Long id, Authentication auth) {
        if (auth == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }

        String username = auth.getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        Reservation reservation = reservationRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "예약을 찾을 수 없습니다."));

        if (!reservation.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 예약만 취소할 수 있습니다.");
        }

        reservation.setStatus(Reservation.Status.CANCELLED);
        reservationRepo.save(reservation);
    }

    @Transactional(readOnly = true)
    public List<ReservationCalendarResponse> getMonthlyReservations(
            Long companyId,
            int year,
            int month
    ) {
        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate end = start.withDayOfMonth(start.lengthOfMonth());

        List<Reservation> list =
                reservationRepo.findByCompanyAndMonth(companyId, start, end);

        Map<LocalDate, List<Reservation>> grouped =
                list.stream().collect(Collectors.groupingBy(Reservation::getVisitDate));

        return grouped.entrySet().stream().map(entry -> {
            long pending = entry.getValue().stream()
                    .filter(r -> r.getStatus() == Reservation.Status.PENDING)
                    .count();

            long accepted = entry.getValue().stream()
                    .filter(r -> r.getStatus() == Reservation.Status.ACCEPTED)
                    .count();

            long rejected = entry.getValue().stream()
                    .filter(r -> r.getStatus() == Reservation.Status.REJECTED)
                    .count();

            return new ReservationCalendarResponse(
                    entry.getKey().toString(),
                    pending,
                    accepted,
                    rejected
            );
        }).toList();
    }

    public void markNoShow(Long id, Long companyId) {
        Reservation reservation = reservationRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "예약을 찾을 수 없습니다."));

        if (!reservation.getCompany().getId().equals(companyId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "노쇼 처리 권한이 없습니다.");
        }

        reservation.setStatus(Reservation.Status.NOSHOW);
        reservationRepo.save(reservation);
    }
}
