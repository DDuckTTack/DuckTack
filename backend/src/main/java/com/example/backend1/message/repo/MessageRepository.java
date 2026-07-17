package com.example.backend1.message.repo;

import com.example.backend1.message.domain.Message;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

    List<Message> findByConversationIdOrderByIdDesc(Long conversationId, Pageable pageable);

    List<Message> findByConversationIdAndIdGreaterThanOrderByIdAsc(Long conversationId, Long afterId);

    long countByConversationIdAndSenderIdNotAndCreatedAtAfter(
            Long conversationId, Long senderId, OffsetDateTime after
    );

    long countByConversationIdAndSenderIdNot(Long conversationId, Long senderId);
}
