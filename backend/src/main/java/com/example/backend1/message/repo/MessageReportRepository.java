package com.example.backend1.message.repo;

import com.example.backend1.message.domain.MessageReport;
import com.example.backend1.message.domain.MessageReportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageReportRepository extends JpaRepository<MessageReport, Long> {

    Page<MessageReport> findByStatus(MessageReportStatus status, Pageable pageable);
}
