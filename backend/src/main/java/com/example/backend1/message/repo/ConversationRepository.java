package com.example.backend1.message.repo;

import com.example.backend1.message.domain.Conversation;
import com.example.backend1.user.domain.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    Optional<Conversation> findByUser1IdAndUser2Id(Long user1Id, Long user2Id);

    @Query("""
        select c from Conversation c
        where (c.user1.id = :myId or c.user2.id = :myId)
          and (:role is null
               or (c.user1.id = :myId and c.user2.role = :role)
               or (c.user2.id = :myId and c.user1.role = :role))
        """)
    Page<Conversation> findMyConversations(
            @Param("myId") Long myId,
            @Param("role") UserRole role,
            Pageable pageable
    );
}
