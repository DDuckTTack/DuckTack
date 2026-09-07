package com.example.backend1.realtime;

import com.example.backend1.message.dto.MessageDtos;
import com.example.backend1.message.service.MessageService;
import com.example.backend1.security.JwtTokenProvider;
import com.example.backend1.user.domain.User;
import com.example.backend1.user.repo.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.lang.NonNull;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 실제 STOMP 연결을 맺어 웹소켓 경로 전체를 검증한다.
 * - JWT 없이는 연결이 거부되는지
 * - 쪽지를 보내면 상대에게 /user/queue/events 로 이벤트가 실제로 도착하는지
 *
 * 폴링을 웹소켓으로 바꾼 뒤로는 이 경로가 끊기면 앱이 갱신을 아예 못 받으므로,
 * 설정(인증/prefix/트랜잭션 커밋 후 발행)이 깨지지 않았는지 지키는 테스트다.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class RealtimeWebSocketTest {

    @LocalServerPort private int port;

    @Autowired private UserRepository userRepository;
    @Autowired private JwtTokenProvider jwtTokenProvider;
    @Autowired private MessageService messageService;
    @Autowired private org.springframework.transaction.support.TransactionTemplate transactionTemplate;

    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;

    private final BlockingQueue<RealtimeEvent> received = new LinkedBlockingQueue<>();
    private final List<Long> createdUserIds = new ArrayList<>();
    private StompSession session;

    /**
     * 이 테스트는 실제 서버 스레드가 별도 커넥션으로 커밋하므로 트랜잭션 롤백이 통하지 않는다.
     * 개발 DB에 찌꺼기가 남지 않도록 만든 데이터를 직접 지운다.
     */
    @AfterEach
    void tearDown() {
        if (session != null && session.isConnected()) session.disconnect();
        if (createdUserIds.isEmpty()) return;

        transactionTemplate.executeWithoutResult(status -> {
            entityManager.createQuery(
                            "delete from Message m where m.sender.id in :ids")
                    .setParameter("ids", createdUserIds).executeUpdate();
            entityManager.createQuery(
                            "delete from Conversation c where c.user1.id in :ids or c.user2.id in :ids")
                    .setParameter("ids", createdUserIds).executeUpdate();
            entityManager.createQuery(
                            "delete from User u where u.id in :ids")
                    .setParameter("ids", createdUserIds).executeUpdate();
        });
        createdUserIds.clear();
    }

    private WebSocketStompClient newClient() {
        WebSocketStompClient client = new WebSocketStompClient(new StandardWebSocketClient());
        client.setMessageConverter(new MappingJackson2MessageConverter());
        return client;
    }

    private String url() {
        return "ws://localhost:" + port + "/ws";
    }

    private User createUser(String prefix) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        User user = userRepository.save(new User(prefix + suffix, "hash", "010" + suffix.substring(0, 8)));
        createdUserIds.add(user.getId());
        return user;
    }

    private String tokenFor(User user) {
        return jwtTokenProvider.createAccessToken(null, user.getId(), user.getUsername());
    }

    private StompHeaders authHeaders(String token) {
        StompHeaders headers = new StompHeaders();
        headers.add("Authorization", "Bearer " + token);
        return headers;
    }

    @Test
    void 토큰_없이는_웹소켓_연결이_거부된다() {
        // 유효한 토큰으로는 연결이 되는지 먼저 확인해서, 아래 실패가 "서버가 안 떠서"가 아님을 보장한다.
        assertThatCode(() -> {
            StompSession ok = newClient().connectAsync(
                    url(), new WebSocketHttpHeadersNoop(),
                    authHeaders(tokenFor(createUser("ws_ok_"))),
                    new StompSessionHandlerAdapter() {}).get(5, TimeUnit.SECONDS);
            ok.disconnect();
        }).doesNotThrowAnyException();

        // 같은 엔드포인트에 인증 헤더만 빼면 연결이 끊겨야 한다.
        assertThatThrownBy(() ->
                newClient().connectAsync(url(), new StompSessionHandlerAdapter() {})
                        .get(5, TimeUnit.SECONDS))
                .as("인증 헤더 없는 CONNECT는 성공하면 안 된다")
                .isInstanceOf(java.util.concurrent.ExecutionException.class);
    }

    @Test
    void 쪽지를_보내면_상대에게_실시간_이벤트가_도착한다() throws Exception {
        User receiver = createUser("ws_rcv_");
        User sender = createUser("ws_snd_");

        // 수신자가 자기 개인 큐를 구독한 상태로 대기한다.
        session = newClient().connectAsync(
                url(),
                new WebSocketHttpHeadersNoop(),
                authHeaders(tokenFor(receiver)),
                new StompSessionHandlerAdapter() {}
        ).get(5, TimeUnit.SECONDS);

        session.subscribe("/user/queue/events", new StompFrameHandler() {
            @Override public @NonNull Type getPayloadType(@NonNull StompHeaders headers) {
                return RealtimeEvent.class;
            }
            @Override public void handleFrame(@NonNull StompHeaders headers, Object payload) {
                received.add((RealtimeEvent) payload);
            }
        });

        // 구독이 브로커에 등록될 시간을 준다.
        Thread.sleep(300);

        MessageDtos.ConversationItem conversation = messageService.getOrCreateConversation(
                sender.getUsername(),
                new MessageDtos.CreateConversationRequest(receiver.getId(), null));

        messageService.sendMessage(
                sender.getUsername(),
                conversation.conversationId(),
                new MessageDtos.SendMessageRequest("실시간 전달 확인"));

        RealtimeEvent event = received.poll(5, TimeUnit.SECONDS);

        assertThat(event).as("쪽지 전송 후 5초 안에 이벤트가 도착해야 한다").isNotNull();
        assertThat(event.type()).isEqualTo("MESSAGE_CREATED");
        assertThat(event.resourceId()).isEqualTo(conversation.conversationId());
    }

    /** connectAsync 오버로드 선택을 위한 빈 핸드셰이크 헤더. */
    private static class WebSocketHttpHeadersNoop extends org.springframework.web.socket.WebSocketHttpHeaders {}
}
