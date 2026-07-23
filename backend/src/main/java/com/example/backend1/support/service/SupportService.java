package com.example.backend1.support.service;

import com.example.backend1.common.ApiException;
import com.example.backend1.common.ErrorCode;
import com.example.backend1.support.domain.SenderRole;
import com.example.backend1.support.domain.SupportMessage;
import com.example.backend1.support.domain.SupportThread;
import com.example.backend1.support.dto.SupportDtos;
import com.example.backend1.support.repo.SupportMessageRepository;
import com.example.backend1.support.repo.SupportThreadRepository;
import com.example.backend1.user.domain.User;
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
public class SupportService {

    private static final int PREVIEW_MAX_LENGTH = 200;
    private static final int CONTENT_MAX_LENGTH = 2000;

    private final SupportThreadRepository supportThreadRepository;
    private final SupportMessageRepository supportMessageRepository;
    private final UserRepository userRepository;

    public SupportService(
            SupportThreadRepository supportThreadRepository,
            SupportMessageRepository supportMessageRepository,
            UserRepository userRepository
    ) {
        this.supportThreadRepository = supportThreadRepository;
        this.supportMessageRepository = supportMessageRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public SupportDtos.ThreadItem getOrCreateMyThread(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

        SupportThread thread = supportThreadRepository.findByUserId(user.getId())
                .orElseGet(() -> supportThreadRepository.save(new SupportThread(user)));

        return toThreadItem(thread);
    }

    @Transactional
    public List<SupportDtos.MessageItem> listMyMessages(String username, Long afterId, Pageable pageable) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

        SupportThread thread = supportThreadRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ApiException(ErrorCode.SUPPORT_THREAD_NOT_FOUND));

        List<SupportMessage> messages = loadMessages(thread.getId(), afterId, pageable);

        thread.markReadByUser();

        return messages.stream().map(m -> toMessageItem(m, user.getId())).toList();
    }

    @Transactional
    public SupportDtos.MessageItem sendMyMessage(String username, SupportDtos.SendMessageRequest req) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

        SupportThread thread = supportThreadRepository.findByUserId(user.getId())
                .orElseGet(() -> supportThreadRepository.save(new SupportThread(user)));

        SupportMessage message = saveMessage(thread, user, SenderRole.USER, req.content());

        return toMessageItem(message, user.getId());
    }

    @Transactional(readOnly = true)
    public Page<SupportDtos.AdminThreadItem> listThreadsForAdmin(String statusFilter, Pageable pageable) {
        SenderRole roleFilter = parseStatusFilter(statusFilter);

        Page<SupportThread> page = roleFilter != null
                ? supportThreadRepository.findByLastSenderRoleOrderByLastMessageAtDesc(roleFilter, pageable)
                : supportThreadRepository.findAllByOrderByLastMessageAtDesc(pageable);

        return page.map(this::toAdminThreadItem);
    }

    private SenderRole parseStatusFilter(String statusFilter) {
        if (statusFilter == null || statusFilter.isBlank()) return null;

        return switch (statusFilter.trim().toUpperCase()) {
            case "PENDING" -> SenderRole.USER;
            case "ANSWERED" -> SenderRole.ADMIN;
            default -> null;
        };
    }

    @Transactional(readOnly = true)
    public SupportDtos.AdminThreadItem getThreadForAdmin(Long threadId) {
        SupportThread thread = supportThreadRepository.findById(threadId)
                .orElseThrow(() -> new ApiException(ErrorCode.SUPPORT_THREAD_NOT_FOUND));

        return toAdminThreadItem(thread);
    }

    @Transactional
    public List<SupportDtos.MessageItem> listMessagesForAdmin(Long threadId, Long afterId, Pageable pageable) {
        SupportThread thread = supportThreadRepository.findById(threadId)
                .orElseThrow(() -> new ApiException(ErrorCode.SUPPORT_THREAD_NOT_FOUND));

        List<SupportMessage> messages = loadMessages(thread.getId(), afterId, pageable);

        return messages.stream().map(m -> toMessageItem(m, null)).toList();
    }

    @Transactional
    public SupportDtos.MessageItem sendAdminMessage(String adminUsername, Long threadId, SupportDtos.SendMessageRequest req) {
        User admin = userRepository.findByUsername(adminUsername)
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

        SupportThread thread = supportThreadRepository.findById(threadId)
                .orElseThrow(() -> new ApiException(ErrorCode.SUPPORT_THREAD_NOT_FOUND));

        SupportMessage message = saveMessage(thread, admin, SenderRole.ADMIN, req.content());

        return toMessageItem(message, null);
    }

    private List<SupportMessage> loadMessages(Long threadId, Long afterId, Pageable pageable) {
        if (afterId != null) {
            return supportMessageRepository.findByThreadIdAndIdGreaterThanOrderByIdAsc(threadId, afterId);
        }

        List<SupportMessage> latestDesc = supportMessageRepository.findByThreadIdOrderByIdDesc(threadId, pageable);
        List<SupportMessage> messages = new ArrayList<>(latestDesc);
        Collections.reverse(messages);
        return messages;
    }

    private SupportMessage saveMessage(SupportThread thread, User sender, SenderRole senderRole, String rawContent) {
        String content = rawContent == null ? "" : rawContent.trim();

        if (content.isEmpty() || content.length() > CONTENT_MAX_LENGTH) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "메시지 내용은 1~" + CONTENT_MAX_LENGTH + "자여야 합니다.");
        }

        SupportMessage message = new SupportMessage(thread, sender, senderRole, content);
        supportMessageRepository.save(message);

        String preview = content.length() > PREVIEW_MAX_LENGTH ? content.substring(0, PREVIEW_MAX_LENGTH) : content;
        thread.recordMessage(preview, message.getCreatedAt(), senderRole);

        return message;
    }

    private SupportDtos.ThreadItem toThreadItem(SupportThread thread) {
        OffsetDateTime lastReadAt = thread.getUserLastReadAt();
        long unreadCount = lastReadAt == null
                ? supportMessageRepository.countByThreadIdAndSenderRole(thread.getId(), SenderRole.ADMIN)
                : supportMessageRepository.countByThreadIdAndSenderRoleAndCreatedAtAfter(thread.getId(), SenderRole.ADMIN, lastReadAt);

        return new SupportDtos.ThreadItem(
                thread.getId(),
                deriveStatus(thread.getLastSenderRole()),
                thread.getLastMessagePreview(),
                thread.getLastMessageAt(),
                unreadCount
        );
    }

    private SupportDtos.AdminThreadItem toAdminThreadItem(SupportThread thread) {
        User user = thread.getUser();

        return new SupportDtos.AdminThreadItem(
                thread.getId(),
                user.getId(),
                user.getUsername(),
                user.getPhoneNumber(),
                user.getEmail(),
                user.getAddress(),
                deriveStatus(thread.getLastSenderRole()),
                thread.getLastMessagePreview(),
                thread.getLastMessageAt(),
                thread.getCreatedAt()
        );
    }

    private String deriveStatus(SenderRole lastSenderRole) {
        return lastSenderRole == SenderRole.ADMIN ? "ANSWERED" : "PENDING";
    }

    private SupportDtos.MessageItem toMessageItem(SupportMessage message, Long myUserId) {
        return new SupportDtos.MessageItem(
                message.getId(),
                message.getThread().getId(),
                message.getSender().getId(),
                message.getSender().getUsername(),
                message.getSenderRole().name(),
                myUserId != null && message.getSender().getId().equals(myUserId),
                message.getContent(),
                message.getCreatedAt()
        );
    }
}
