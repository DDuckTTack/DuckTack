package com.example.backend1.reservation.domain;

import com.example.backend1.company.domain.Company;
import com.example.backend1.user.domain.User;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity
public class Reservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 예약 대상 업체
    @ManyToOne(fetch = FetchType.LAZY)
    private Company company;

    // 예약 신청 사용자
    @ManyToOne(fetch = FetchType.LAZY)
    private User user;

    private LocalDate visitDate;
    private LocalTime visitTime;

    private String customerName;
    private String phoneNumber;
    private String address;
    private String issueSummary;
    private String requestNote;

    // 업체가 예약을 거절할 때 입력하는 사유
    @Column(columnDefinition = "TEXT")
    private String rejectReason;

    /**
     * 업체가 수리 완료 처리 시 입력하는 실제 완료일.
     * 이후 앱 PDF 작성 화면에서 자동 반영할 값이다.
     */
    private LocalDate repairCompletedDate;

    /**
     * 업체가 입력한 최종 총 비용.
     * 재료비/인건비를 분리하지 않고 총 비용만 저장한다.
     */
    private Integer repairTotalCost;

    /**
     * 업체가 입력한 실제 작업 요약.
     */
    @Column(columnDefinition = "TEXT")
    private String repairSummary;

    @Enumerated(EnumType.STRING)
    private Status status = Status.PENDING;

    public enum Status {
        PENDING,    // 예약 신청 완료 / 전문가 수락 대기중
        ACCEPTED,   // 전문가 수락 완료 / 방문 대기
        REJECTED,   // 업체 거절
        DONE,       // 해결 완료
        CANCELLED,  // 사용자/업체 취소
        NOSHOW      // 노쇼
    }

    // ===== getter =====
    public Long getId() { return id; }
    public Company getCompany() { return company; }
    public User getUser() { return user; }

    public LocalDate getVisitDate() { return visitDate; }
    public LocalTime getVisitTime() { return visitTime; }

    public String getCustomerName() { return customerName; }
    public String getPhoneNumber() { return phoneNumber; }
    public String getAddress() { return address; }
    public String getIssueSummary() { return issueSummary; }
    public String getRequestNote() { return requestNote; }
    public String getRejectReason() { return rejectReason; }

    public LocalDate getRepairCompletedDate() { return repairCompletedDate; }
    public Integer getRepairTotalCost() { return repairTotalCost; }
    public String getRepairSummary() { return repairSummary; }

    public Status getStatus() { return status; }

    // ===== setter =====
    public void setCompany(Company company) { this.company = company; }
    public void setUser(User user) { this.user = user; }

    public void setVisitDate(LocalDate visitDate) { this.visitDate = visitDate; }
    public void setVisitTime(LocalTime visitTime) { this.visitTime = visitTime; }

    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
    public void setAddress(String address) { this.address = address; }
    public void setIssueSummary(String issueSummary) { this.issueSummary = issueSummary; }
    public void setRequestNote(String requestNote) { this.requestNote = requestNote; }
    public void setRejectReason(String rejectReason) { this.rejectReason = rejectReason; }

    public void setRepairCompletedDate(LocalDate repairCompletedDate) {
        this.repairCompletedDate = repairCompletedDate;
    }

    public void setRepairTotalCost(Integer repairTotalCost) {
        this.repairTotalCost = repairTotalCost;
    }

    public void setRepairSummary(String repairSummary) {
        this.repairSummary = repairSummary;
    }

    public void setStatus(Status status) { this.status = status; }

    public void completeRepair(LocalDate repairCompletedDate, Integer repairTotalCost, String repairSummary) {
        this.repairCompletedDate = repairCompletedDate;
        this.repairTotalCost = repairTotalCost;
        this.repairSummary = repairSummary;
        this.status = Status.DONE;
        this.rejectReason = null;
    }
}
