package com.example.backend1.community.repo;

import com.example.backend1.community.domain.CommunityReport;
import com.example.backend1.community.domain.ReportTargetType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommunityReportRepository extends JpaRepository<CommunityReport, Long> {
    boolean existsByTargetTypeAndTargetIdAndReporterId(ReportTargetType targetType, Long targetId, Long reporterId);
    long countByTargetTypeAndTargetId(ReportTargetType targetType, Long targetId);
}
