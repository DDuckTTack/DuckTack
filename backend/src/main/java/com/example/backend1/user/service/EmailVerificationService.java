package com.example.backend1.user.service;

import com.example.backend1.common.ApiException;
import com.example.backend1.common.ErrorCode;
import com.example.backend1.user.domain.EmailVerification;
import com.example.backend1.user.repo.EmailVerificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;

@Service
public class EmailVerificationService {

    private static final Logger log = LoggerFactory.getLogger(EmailVerificationService.class);
    private static final SecureRandom random = new SecureRandom();

    private final EmailVerificationRepository emailVerificationRepository;
    private final JavaMailSender mailSender;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Value("${app.email.from:no-reply@example.com}")
    private String fromEmail;

    @Value("${spring.mail.host:}")
    private String mailHost;

    @Value("${spring.mail.port:0}")
    private int mailPort;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${app.email.verification.ttl-minutes:10}")
    private long ttlMinutes;

    public EmailVerificationService(
            EmailVerificationRepository emailVerificationRepository,
            JavaMailSender mailSender,
            org.springframework.security.crypto.password.PasswordEncoder passwordEncoder
    ) {
        this.emailVerificationRepository = emailVerificationRepository;
        this.mailSender = mailSender;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public void sendCode(String email) {
        String normalizedEmail = normalizeEmail(email);

        String code = generate6DigitCode();
        String hash = passwordEncoder.encode(code);
        OffsetDateTime expiresAt = OffsetDateTime.now().plusMinutes(ttlMinutes);

        emailVerificationRepository.save(
                new EmailVerification(normalizedEmail, hash, expiresAt)
        );

        log.info(
                "[EmailVerification] code saved email={} expiresAt={} mailHost={} mailPort={} mailUsernameSet={} from={}",
                normalizedEmail,
                expiresAt,
                blankToDash(mailHost),
                mailPort,
                mailUsername != null && !mailUsername.isBlank(),
                blankToDash(fromEmail)
        );

        if (mailHost == null || mailHost.isBlank()) {
            log.warn(
                    "[EmailVerification] MAIL_HOST not set. Dev code for {} is {}",
                    normalizedEmail,
                    code
            );
            return;
        }

        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(fromEmail);
            msg.setTo(normalizedEmail);
            msg.setSubject("[DduckTack] 인증 코드 안내");
            msg.setText(
                    "DduckTack 인증 코드입니다.\n\n" +
                            "인증 코드: " + code + "\n" +
                            "유효 시간: " + ttlMinutes + "분\n\n" +
                            "본인이 요청하지 않았다면 이 메일을 무시해주세요."
            );

            mailSender.send(msg);

            log.info("[EmailVerification] email sent successfully to={}", normalizedEmail);
        } catch (Exception e) {
            log.error("[EmailVerification] failed to send email to={}", normalizedEmail, e);
            throw new ApiException(ErrorCode.EMAIL_SEND_FAILED);
        }
    }

    @Transactional
    public boolean verifyCode(String email, String code) {
        String normalizedEmail = normalizeEmail(email);
        String normalizedCode = code == null ? "" : code.trim();

        EmailVerification latest = emailVerificationRepository
                .findTopByEmailOrderByCreatedAtDesc(normalizedEmail)
                .orElseThrow(() -> new ApiException(ErrorCode.EMAIL_VERIFICATION_INVALID));

        OffsetDateTime now = OffsetDateTime.now();

        if (latest.isVerified()) {
            return true;
        }

        if (latest.isExpired(now)) {
            throw new ApiException(ErrorCode.EMAIL_VERIFICATION_EXPIRED);
        }

        if (!passwordEncoder.matches(normalizedCode, latest.getCodeHash())) {
            throw new ApiException(ErrorCode.EMAIL_VERIFICATION_INVALID);
        }

        latest.markVerified(now);

        return true;
    }

    @Transactional(readOnly = true)
    public boolean isVerified(String email) {
        String normalizedEmail = normalizeEmail(email);

        return emailVerificationRepository
                .findTopByEmailOrderByCreatedAtDesc(normalizedEmail)
                .filter(EmailVerification::isVerified)
                .filter(v -> !v.isExpired(OffsetDateTime.now()))
                .isPresent();
    }

    private static String generate6DigitCode() {
        int n = random.nextInt(1_000_000);
        return String.format("%06d", n);
    }

    private static String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    private static String blankToDash(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }
}