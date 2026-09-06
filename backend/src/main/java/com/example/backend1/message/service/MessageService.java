package com.example.backend1.message.service;

import com.example.backend1.common.ApiException;
import com.example.backend1.common.ErrorCode;
import com.example.backend1.message.domain.Conversation;
import com.example.backend1.message.domain.Message;
import com.example.backend1.message.domain.MessageReport;
import com.example.backend1.message.domain.MessageReportStatus;
import com.example.backend1.message.dto.MessageDtos;
import com.example.backend1.message.repo.ConversationRepository;
import com.example.backend1.message.repo.MessageReportRepository;
import com.example.backend1.message.repo.MessageRepository;
import com.example.backend1.realtime.RealtimeEventPublisher;
import com.example.backend1.user.domain.User;
import com.example.backend1.user.domain.UserRole;
import com.example.backend1.user.repo.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
public class MessageService {

    private static final int PREVIEW_MAX_LENGTH = 200;
    private static final int CONTENT_MAX_LENGTH = 2000;

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final MessageReportRepository messageReportRepository;
    private final UserRepository userRepository;
    private final RealtimeEventPublisher realtimeEventPublisher;

    public MessageService(
            ConversationRepository conversationRepository,
            MessageRepository messageRepository,
            MessageReportRepository messageReportRepository,
            UserRepository userRepository,
            RealtimeEventPublisher realtimeEventPublisher
    ) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.messageReportRepository = messageReportRepository;
        this.userRepository = userRepository;
        this.realtimeEventPublisher = realtimeEventPublisher;
    }

    @Transactional
    public MessageDtos.ConversationItem getOrCreateConversation(String myUsername, MessageDtos.CreateConversationRequest req) {
        User me = userRepository.findByUsername(myUsername)
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

        User target = resolveTarget(req);

        if (target.getId().equals(me.getId())) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "자기 자신에게는 쪽지를 보낼 수 없습니다.");
        }

        Long lo = Math.min(me.getId(), target.getId());
        Long hi = Math.max(me.getId(), target.getId());

        Conversation conversation = conversationRepository.findByUser1IdAndUser2Id(lo, hi)
                .orElseGet(() -> conversationRepository.save(new Conversation(me, target)));

        return toItem(conversation, me.getId());
    }

    private User resolveTarget(MessageDtos.CreateConversationRequest req) {
        if (req.targetCompanyId() != null) {
            return userRepository.findByCompanyId(req.targetCompanyId())
                    .orElseThrow(() -> new ApiException(ErrorCode.COMPANY_HAS_NO_ACCOUNT));
        }

        if (req.targetUserId() != null) {
            return userRepository.findById(req.targetUserId())
                    .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));
        }

        throw new ApiException(ErrorCode.INVALID_INPUT, "targetUserId 또는 targetCompanyId 중 하나는 필수입니다.");
    }

    @Transactional(readOnly = true)
    public Page<MessageDtos.ConversationItem> listConversations(String myUsername, String type, Pageable pageable) {
        User me = userRepository.findByUsername(myUsername)
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

        Boolean companyOnly = parseCompanyFilter(type);

        return conversationRepository.findMyConversations(me.getId(), companyOnly, pageable)
                .map(c -> toItem(c, me.getId()));
    }

    private Boolean parseCompanyFilter(String type) {
        if (type == null || type.isBlank()) return null;

        return switch (type.trim().toUpperCase()) {
            case "COMPANY" -> true;
            case "USER" -> false;
            default -> null;
        };
    }

    @Transactional(readOnly = true)
    public MessageDtos.ConversationItem getConversation(String myUsername, Long conversationId) {
        User me = userRepository.findByUsername(myUsername)
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

        Conversation conversation = loadConversation(conversationId, me.getId());

        return toItem(conversation, me.getId());
    }

    @Transactional
    public List<MessageDtos.MessageItem> listMessages(String myUsername, Long conversationId, Long afterId, Pageable pageable) {
        User me = userRepository.findByUsername(myUsername)
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

        Conversation conversation = loadConversation(conversationId, me.getId());

        List<Message> messages;

        if (afterId != null) {
            messages = messageRepository.findByConversationIdAndIdGreaterThanOrderByIdAsc(conversationId, afterId);
        } else {
            List<Message> latestDesc = messageRepository.findByConversationIdOrderByIdDesc(conversationId, pageable);
            messages = new ArrayList<>(latestDesc);
            Collections.reverse(messages);
        }

        conversation.markRead(me.getId());

        return messages.stream().map(m -> toMessageItem(m, me.getId())).toList();
    }

    @Transactional
    public MessageDtos.MessageItem sendMessage(String myUsername, Long conversationId, MessageDtos.SendMessageRequest req) {
        User me = userRepository.findByUsername(myUsername)
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

        Conversation conversation = loadConversation(conversationId, me.getId());

        String content = req.content() == null ? "" : req.content().trim();

        if (content.isEmpty() || content.length() > CONTENT_MAX_LENGTH) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "메시지 내용은 1~" + CONTENT_MAX_LENGTH + "자여야 합니다.");
        }

        Message message = new Message(conversation, me, content);
        messageRepository.save(message);

        String preview = content.length() > PREVIEW_MAX_LENGTH ? content.substring(0, PREVIEW_MAX_LENGTH) : content;
        conversation.recordMessage(preview, message.getCreatedAt());

        realtimeEventPublisher.publishToUser(conversation.getUser1().getUsername(), "MESSAGE_CREATED", conversationId);
        realtimeEventPublisher.publishToUser(conversation.getUser2().getUsername(), "MESSAGE_CREATED", conversationId);

        return toMessageItem(message, me.getId());
    }

    @Transactional
    public void reportMessage(String myUsername, MessageDtos.ReportRequest req) {
        User me = userRepository.findByUsername(myUsername)
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

        if (req.conversationId() == null) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "conversationId는 필수입니다.");
        }

        if (req.reason() == null) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "reason은 필수입니다.");
        }

        Conversation conversation = loadConversation(req.conversationId(), me.getId());

        Message reportedMessage = null;
        User reportedUser;

        if (req.messageId() != null) {
            reportedMessage = messageRepository.findById(req.messageId())
                    .orElseThrow(() -> new ApiException(ErrorCode.MESSAGE_NOT_FOUND));

            if (!reportedMessage.getConversation().getId().equals(conversation.getId())) {
                throw new ApiException(ErrorCode.INVALID_INPUT, "해당 대화의 메시지가 아닙니다.");
            }

            reportedUser = reportedMessage.getSender();

            if (reportedUser.getId().equals(me.getId())) {
                throw new ApiException(ErrorCode.INVALID_INPUT, "자기 자신의 메시지는 신고할 수 없습니다.");
            }
        } else {
            reportedUser = conversation.otherUser(me.getId());
        }

        MessageReport report = new MessageReport(me, conversation, reportedMessage, reportedUser, req.reason(), req.detail());
        messageReportRepository.save(report);
    }

    @Transactional(readOnly = true)
    public Page<MessageDtos.AdminMessageReportItem> listReports(String statusFilter, Pageable pageable) {
        MessageReportStatus status = parseStatusFilter(statusFilter);

        Page<MessageReport> page = status != null
                ? messageReportRepository.findByStatus(status, pageable)
                : messageReportRepository.findAll(pageable);

        return page.map(this::toAdminItem);
    }

    private MessageReportStatus parseStatusFilter(String statusFilter) {
        if (statusFilter == null || statusFilter.isBlank()) return null;

        try {
            return MessageReportStatus.valueOf(statusFilter.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    @Transactional
    public void resolveReport(Long reportId, MessageDtos.ResolveReportRequest req) {
        MessageReport report = messageReportRepository.findById(reportId)
                .orElseThrow(() -> new ApiException(ErrorCode.MESSAGE_REPORT_NOT_FOUND));

        MessageReportStatus newStatus = "REJECT".equalsIgnoreCase(req.action())
                ? MessageReportStatus.REJECTED
                : MessageReportStatus.RESOLVED;

        report.resolve(newStatus, req.adminMemo());
    }

    private Conversation loadConversation(Long conversationId, Long myUserId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ApiException(ErrorCode.CONVERSATION_NOT_FOUND));

        if (!conversation.isParticipant(myUserId)) {
            throw new ApiException(ErrorCode.ACCESS_DENIED);
        }

        return conversation;
    }

    private MessageDtos.ConversationItem toItem(Conversation conversation, Long myUserId) {
        User other = conversation.otherUser(myUserId);
        boolean otherIsCompany = other.getRole() == UserRole.COMPANY;
        String displayName = otherIsCompany && other.getCompany() != null
                ? other.getCompany().getName()
                : other.getUsername();

        OffsetDateTime lastReadAt = conversation.myLastReadAt(myUserId);
        long unreadCount = lastReadAt == null
                ? messageRepository.countByConversationIdAndSenderIdNot(conversation.getId(), myUserId)
                : messageRepository.countByConversationIdAndSenderIdNotAndCreatedAtAfter(conversation.getId(), myUserId, lastReadAt);

        return new MessageDtos.ConversationItem(
                conversation.getId(),
                other.getId(),
                other.getUsername(),
                otherIsCompany,
                displayName,
                conversation.getLastMessagePreview(),
                conversation.getLastMessageAt(),
                unreadCount
        );
    }

    private MessageDtos.MessageItem toMessageItem(Message message, Long myUserId) {
        return new MessageDtos.MessageItem(
                message.getId(),
                message.getConversation().getId(),
                message.getSender().getId(),
                message.getSender().getUsername(),
                message.getSender().getId().equals(myUserId),
                message.getContent(),
                message.getCreatedAt()
        );
    }

    private MessageDtos.AdminMessageReportItem toAdminItem(MessageReport report) {
        Message reportedMessage = report.getReportedMessage();

        return new MessageDtos.AdminMessageReportItem(
                report.getId(),
                report.getConversation().getId(),
                report.getReporter().getId(),
                report.getReporter().getUsername(),
                report.getReportedUser().getId(),
                report.getReportedUser().getUsername(),
                reportedMessage != null ? reportedMessage.getId() : null,
                reportedMessage != null ? reportedMessage.getContent() : null,
                report.getReason(),
                report.getDetail(),
                report.getStatus(),
                report.getAdminMemo(),
                report.getCreatedAt(),
                report.getResolvedAt()
        );
    }
}
