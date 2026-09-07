package com.example.backend1.message.repo;

import com.example.backend1.message.domain.Message;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

    List<Message> findByConversationIdOrderByIdDesc(Long conversationId, Pageable pageable);

    List<Message> findByConversationIdAndIdGreaterThanOrderByIdAsc(Long conversationId, Long afterId);

    long countByConversationIdAndSenderIdNotAndCreatedAtAfter(
            Long conversationId, Long senderId, OffsetDateTime after
    );

    long countByConversationIdAndSenderIdNot(Long conversationId, Long senderId);

    /**
     * 쪽지함 목록용 안읽음 개수 일괄 집계.
     * 대화마다 count 쿼리를 날리면 목록 1페이지에 N번 쿼리가 나가서 한 번에 묶는다.
     * lastReadAt이 null(한 번도 안 읽은 대화)인 경우도 포함하기 위해 대화별 기준 시각을 함께 비교한다.
     */
    @Query("""
        select m.conversation.id, count(m) from Message m
        where m.conversation.id in :conversationIds
          and m.sender.id <> :myId
          and (
            (m.conversation.user1.id = :myId and (m.conversation.user1LastReadAt is null or m.createdAt > m.conversation.user1LastReadAt))
            or (m.conversation.user2.id = :myId and (m.conversation.user2LastReadAt is null or m.createdAt > m.conversation.user2LastReadAt))
          )
        group by m.conversation.id
        """)
    List<Object[]> countUnreadByConversationIds(
            @Param("conversationIds") List<Long> conversationIds,
            @Param("myId") Long myId
    );
}
