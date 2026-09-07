package com.example.backend1.message;

import com.example.backend1.message.domain.Conversation;
import com.example.backend1.message.domain.Message;
import com.example.backend1.message.repo.ConversationRepository;
import com.example.backend1.message.repo.MessageRepository;
import com.example.backend1.user.domain.User;
import com.example.backend1.user.repo.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.TestPropertySource;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 쪽지함 목록의 안읽음 개수를 대화별 count 쿼리(기존)에서 일괄 집계 쿼리(신규)로 바꿨다.
 * 두 방식이 동일한 결과를 내는지 실제 DB에서 검증한다.
 *
 * @DataJpaTest는 각 테스트를 트랜잭션으로 감싸고 끝나면 롤백하므로 개발 DB에 데이터가 남지 않는다.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = "spring.jpa.hibernate.ddl-auto=none")
class UnreadCountQueryTest {

    @Autowired private UserRepository userRepository;
    @Autowired private ConversationRepository conversationRepository;
    @Autowired private MessageRepository messageRepository;

    private User newUser() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        return userRepository.save(new User("t_" + suffix, "hash", "010" + suffix.substring(0, 8)));
    }

    /** 기존 구현과 동일한 방식으로 안읽음 개수를 센다. */
    private long legacyUnread(Conversation conversation, Long myId) {
        OffsetDateTime lastReadAt = conversation.myLastReadAt(myId);
        return lastReadAt == null
                ? messageRepository.countByConversationIdAndSenderIdNot(conversation.getId(), myId)
                : messageRepository.countByConversationIdAndSenderIdNotAndCreatedAtAfter(
                        conversation.getId(), myId, lastReadAt);
    }

    private Map<Long, Long> batchUnread(List<Long> conversationIds, Long myId) {
        Map<Long, Long> counts = new HashMap<>();
        for (Object[] row : messageRepository.countUnreadByConversationIds(conversationIds, myId)) {
            counts.put(((Number) row[0]).longValue(), ((Number) row[1]).longValue());
        }
        return counts;
    }

    private void send(Conversation conversation, User sender, String content) {
        messageRepository.saveAndFlush(new Message(conversation, sender, content));
    }

    @Test
    void 일괄집계가_기존_대화별_집계와_동일한_결과를_낸다() throws Exception {
        User me = newUser();
        User partnerA = newUser();
        User partnerB = newUser();
        User partnerC = newUser();

        // 1) 한 번도 안 읽은 대화: 상대가 2건, 내가 1건 보냄 -> 안읽음 2
        Conversation neverRead = conversationRepository.saveAndFlush(new Conversation(me, partnerA));
        send(neverRead, partnerA, "a1");
        send(neverRead, partnerA, "a2");
        send(neverRead, me, "내가 보낸 건 안읽음에 포함되면 안 됨");

        // 2) 중간에 읽은 대화: 읽은 뒤 상대가 1건 더 보냄 -> 안읽음 1
        Conversation partiallyRead = conversationRepository.saveAndFlush(new Conversation(me, partnerB));
        send(partiallyRead, partnerB, "읽기 전");
        Thread.sleep(10);
        partiallyRead.markRead(me.getId());
        conversationRepository.saveAndFlush(partiallyRead);
        Thread.sleep(10);
        send(partiallyRead, partnerB, "읽은 뒤 도착");

        // 3) 전부 읽은 대화 -> 안읽음 0
        Conversation fullyRead = conversationRepository.saveAndFlush(new Conversation(me, partnerC));
        send(fullyRead, partnerC, "c1");
        Thread.sleep(10);
        fullyRead.markRead(me.getId());
        conversationRepository.saveAndFlush(fullyRead);

        List<Conversation> conversations = List.of(neverRead, partiallyRead, fullyRead);
        List<Long> ids = conversations.stream().map(Conversation::getId).toList();

        Map<Long, Long> batch = batchUnread(ids, me.getId());

        // 기대값이 실제로 의도한 시나리오인지 먼저 고정한다.
        assertThat(batch.getOrDefault(neverRead.getId(), 0L)).isEqualTo(2L);
        assertThat(batch.getOrDefault(partiallyRead.getId(), 0L)).isEqualTo(1L);
        assertThat(batch.getOrDefault(fullyRead.getId(), 0L)).isEqualTo(0L);

        // 그리고 기존 구현과 완전히 동일한지 대조한다.
        for (Conversation c : conversations) {
            assertThat(batch.getOrDefault(c.getId(), 0L))
                    .as("대화 %d 의 안읽음 개수가 기존 방식과 달라짐", c.getId())
                    .isEqualTo(legacyUnread(c, me.getId()));
        }
    }

    @Test
    void 상대방_관점에서도_동일하게_동작한다() {
        User me = newUser();
        User partner = newUser();

        // user1/user2 정규화 때문에 내가 user2가 되는 경우도 검증해야 한다.
        Conversation conversation = conversationRepository.saveAndFlush(new Conversation(me, partner));
        send(conversation, me, "내가 보냄");
        send(conversation, partner, "상대가 보냄");

        List<Long> ids = List.of(conversation.getId());

        assertThat(batchUnread(ids, me.getId()).getOrDefault(conversation.getId(), 0L))
                .isEqualTo(legacyUnread(conversation, me.getId()))
                .isEqualTo(1L);

        assertThat(batchUnread(ids, partner.getId()).getOrDefault(conversation.getId(), 0L))
                .isEqualTo(legacyUnread(conversation, partner.getId()))
                .isEqualTo(1L);
    }
}
