package com.example.backend1.user.service;

import com.example.backend1.common.ApiException;
import com.example.backend1.common.ErrorCode;
import com.example.backend1.security.JwtTokenProvider;
import com.example.backend1.user.domain.User;
import com.example.backend1.user.domain.UserRole;
import com.example.backend1.user.dto.AuthDtos;
import com.example.backend1.user.dto.UserDtos;
import com.example.backend1.user.repo.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenService refreshTokenService;
    private final EmailVerificationService emailVerificationService;
    private final AccountWithdrawalService accountWithdrawalService;

    public UserService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtTokenProvider jwtTokenProvider,
            RefreshTokenService refreshTokenService,
            EmailVerificationService emailVerificationService,
            AccountWithdrawalService accountWithdrawalService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtTokenProvider = jwtTokenProvider;
        this.refreshTokenService = refreshTokenService;
        this.emailVerificationService = emailVerificationService;
        this.accountWithdrawalService = accountWithdrawalService;
    }

    @Transactional
    public void signup(AuthDtos.SignupRequest req) {
        if (userRepository.existsByUsername(req.username())) {
            throw new ApiException(ErrorCode.USERNAME_DUPLICATE);
        }
        if (userRepository.existsByEmail(req.email())) {
            throw new ApiException(ErrorCode.EMAIL_DUPLICATE);
        }
        if (userRepository.existsByPhoneNumber(req.phoneNumber())) {
            throw new ApiException(ErrorCode.PHONE_DUPLICATE);
        }

        if (!emailVerificationService.isVerified(req.email())) {
            throw new ApiException(ErrorCode.EMAIL_VERIFICATION_REQUIRED);
        }
        if (Boolean.FALSE.equals(req.termsAgreed()) || Boolean.FALSE.equals(req.privacyAgreed())) {
            throw new ApiException(ErrorCode.INVALID_INPUT);
        }

        String hash = passwordEncoder.encode(req.password());

        userRepository.save(
                new User(
                        req.username(),
                        req.email(),
                        hash,
                        req.phoneNumber(),
                        req.residenceType(),
                        req.rentType(),
                        req.address(),
                        req.termsAgreed(),
                        req.privacyAgreed(),
                        req.marketingAgreed() != null && req.marketingAgreed()
                )
        );

        log.info("User signed up: {}", req.username());
    }

    @Transactional(readOnly = true)
    public boolean isUsernameAvailable(String username) {
        boolean exists = userRepository.existsByUsername(username);
        log.debug("isUsernameAvailable: username={} exists={}", username, exists);
        return !exists;
    }

    @Transactional
    public void resetPassword(AuthDtos.ResetPasswordRequest req) {
        boolean verified = emailVerificationService.verifyCode(req.email(), req.code());
        if (!verified) {
            throw new ApiException(ErrorCode.EMAIL_VERIFICATION_INVALID);
        }

        User user = userRepository
                .findByUsernameAndEmail(req.username(), req.email())
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));
        String hash = passwordEncoder.encode(req.newPassword());
        user.changePassword(hash);

        userRepository.saveAndFlush(user);
    }

    @Transactional(readOnly = true)
    public boolean isEmailAvailable(String email) {
        return !userRepository.existsByEmail(email);
    }

    @Transactional(readOnly = true)
    public boolean isPhoneAvailable(String phoneNumber) {
        return !userRepository.existsByPhoneNumber(phoneNumber);
    }

    @Transactional
    public AuthDtos.TokenResponse login(AuthDtos.LoginRequest req) {
        User user = userRepository.findByUsername(req.username())
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

        if (user.isBlocked()) {
            throw new ApiException(ErrorCode.USER_BLOCKED);
        }

        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.username(), req.password())
        );

        String token = jwtTokenProvider.createAccessToken(
                auth,
                user.getId(),
                user.getUsername()
        );

        var refresh = refreshTokenService.issue(user);

        log.info("User logged in: {}", req.username());

        return new AuthDtos.TokenResponse(
                token,
                refresh.refreshToken(),
                refresh.expiresAt().toEpochSecond(),
                user.getRole().name()
        );
    }

    @Transactional
    public AuthDtos.TokenResponse refresh(AuthDtos.RefreshRequest req) {
        var current = refreshTokenService.validateActive(req.refreshToken());
        if (current.getUser().isBlocked()) {
            throw new ApiException(ErrorCode.USER_BLOCKED);
        }
        var rotated = refreshTokenService.rotate(current);

        User user = current.getUser();
        Authentication auth = new UsernamePasswordAuthenticationToken(user.getUsername(), null, java.util.List.of());
        String access = jwtTokenProvider.createAccessToken(auth, user.getId(), user.getUsername());

        return new AuthDtos.TokenResponse(
                access,
                rotated.refreshToken(),
                rotated.expiresAt().toEpochSecond(),
                user.getRole().name()
        );
    }

    @Transactional
    public void logout(String username, AuthDtos.LogoutRequest req) {
        var current = refreshTokenService.validateActive(req.refreshToken());
        if (!current.getUser().getUsername().equals(username)) {
            throw new ApiException(ErrorCode.ACCESS_DENIED);
        }
        current.revoke(java.time.OffsetDateTime.now(), null);
    }

    @Transactional(readOnly = true)
    public UserDtos.MeResponse me(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

        // 병합 포인트: email 필드 추가 반환
        return new UserDtos.MeResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getAddress(),
                user.getRoadAddress(),
                user.getAddressDetail(),
                user.getPostalCode(),
                user.getLatitude(),
                user.getLongitude(),
                user.getResidenceType(),
                user.getRentType()
        );
    }

    /**
     * 회원 탈퇴. 진단 기록·파일은 {@link AccountWithdrawalService} 에서 파기하고,
     * 사용자 행은 게시글·업체 거래 기록의 FK 때문에 남기되 개인정보를 지운 로그인 불가 계정으로 전환한다.
     * 아이디가 바뀌므로 기존 액세스 토큰도 JwtAuthenticationFilter 에서 즉시 거부된다.
     */
    @Transactional
    public void withdraw(String username, UserDtos.WithdrawRequest req) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

        if (user.getRole() != UserRole.USER) {
            throw new ApiException(ErrorCode.ACCESS_DENIED, "업체·관리자 계정은 앱에서 탈퇴할 수 없습니다.");
        }
        if (req.password() == null || !passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new ApiException(ErrorCode.INVALID_INPUT, "비밀번호가 일치하지 않습니다.");
        }

        refreshTokenService.revokeAllForUser(username);
        accountWithdrawalService.purgeUserData(user);

        String suffix = java.util.UUID.randomUUID().toString().substring(0, 6);
        user.withdraw(
                "탈퇴회원_" + user.getId() + "_" + suffix,
                passwordEncoder.encode(java.util.UUID.randomUUID().toString())
        );

        log.info("User withdrawn: id={}", user.getId());
    }

    @Transactional
    public UserDtos.MeResponse updateProfile(String username, UserDtos.UpdateProfileRequest req) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

        user.updateProfile(
                req.residenceType(),
                req.rentType(),
                req.phoneNumber(),
                req.address(),
                req.roadAddress(),
                req.addressDetail(),
                req.postalCode(),
                req.latitude(),
                req.longitude()
        );

        log.info("Profile updated: {}", username);

        // 병합 포인트: 수정 후 email 포함하여 반환
        return new UserDtos.MeResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getAddress(),
                user.getRoadAddress(),
                user.getAddressDetail(),
                user.getPostalCode(),
                user.getLatitude(),
                user.getLongitude(),
                user.getResidenceType(),
                user.getRentType()
        );
    }
}
