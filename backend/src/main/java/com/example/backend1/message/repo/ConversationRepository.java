package com.example.backend1.message.repo;

import com.example.backend1.message.domain.Conversation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    Optional<Conversation> findByUser1IdAndUser2Id(Long user1Id, Long user2Id);

    /**
     * companyOnly = true  -> 상대가 COMPANY 계정인 대화만 (업체 탭)
     * companyOnly = false -> 상대가 COMPANY가 아닌 대화 (사용자 탭 — USER/ADMIN 등 전부 포함)
     * companyOnly = null  -> 필터 없음
     *
     * 상대 role이 정확히 USER인지로 비교하면 ADMIN 같은 role은 어느 탭에도 안 걸려 대화가
     * 통째로 안 보이는 문제가 있어, "사용자" 탭은 "COMPANY가 아님"으로 넓게 잡는다.
     */
    @Query(countQuery = """
        select count(c) from Conversation c
        where (c.user1.id = :myId or c.user2.id = :myId)
          and (
            :companyOnly is null
            or (:companyOnly = true and (
                  (c.user1.id = :myId and c.user2.role = com.example.backend1.user.domain.UserRole.COMPANY)
               or (c.user2.id = :myId and c.user1.role = com.example.backend1.user.domain.UserRole.COMPANY)
            ))
            or (:companyOnly = false and (
                  (c.user1.id = :myId and c.user2.role <> com.example.backend1.user.domain.UserRole.COMPANY)
               or (c.user2.id = :myId and c.user1.role <> com.example.backend1.user.domain.UserRole.COMPANY)
            ))
          )
        """, value = """
        select c from Conversation c
        join fetch c.user1 u1
        left join fetch u1.company
        join fetch c.user2 u2
        left join fetch u2.company
        where (c.user1.id = :myId or c.user2.id = :myId)
          and (
            :companyOnly is null
            or (:companyOnly = true and (
                  (c.user1.id = :myId and c.user2.role = com.example.backend1.user.domain.UserRole.COMPANY)
               or (c.user2.id = :myId and c.user1.role = com.example.backend1.user.domain.UserRole.COMPANY)
            ))
            or (:companyOnly = false and (
                  (c.user1.id = :myId and c.user2.role <> com.example.backend1.user.domain.UserRole.COMPANY)
               or (c.user2.id = :myId and c.user1.role <> com.example.backend1.user.domain.UserRole.COMPANY)
            ))
          )
        """)
    Page<Conversation> findMyConversations(
            @Param("myId") Long myId,
            @Param("companyOnly") Boolean companyOnly,
            Pageable pageable
    );
}
