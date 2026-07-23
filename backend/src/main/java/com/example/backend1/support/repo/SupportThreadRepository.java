package com.example.backend1.support.repo;

import com.example.backend1.support.domain.SenderRole;
import com.example.backend1.support.domain.SupportThread;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SupportThreadRepository extends JpaRepository<SupportThread, Long> {

    Optional<SupportThread> findByUserId(Long userId);

    Page<SupportThread> findAllByOrderByLastMessageAtDesc(Pageable pageable);

    Page<SupportThread> findByLastSenderRoleOrderByLastMessageAtDesc(SenderRole lastSenderRole, Pageable pageable);
}
