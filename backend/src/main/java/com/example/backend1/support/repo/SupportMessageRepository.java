package com.example.backend1.support.repo;

import com.example.backend1.support.domain.SenderRole;
import com.example.backend1.support.domain.SupportMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.List;

public interface SupportMessageRepository extends JpaRepository<SupportMessage, Long> {

    List<SupportMessage> findByThreadIdOrderByIdDesc(Long threadId, Pageable pageable);

    List<SupportMessage> findByThreadIdAndIdGreaterThanOrderByIdAsc(Long threadId, Long afterId);

    long countByThreadIdAndSenderRoleAndCreatedAtAfter(Long threadId, SenderRole senderRole, OffsetDateTime after);

    long countByThreadIdAndSenderRole(Long threadId, SenderRole senderRole);
}
