package com.example.backend1.user.controller;

import com.example.backend1.common.ApiResponse;
import com.example.backend1.user.dto.AuthDtos;
import com.example.backend1.user.service.EmailVerificationService;
import com.example.backend1.user.service.UserService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final UserService userService;
  private final EmailVerificationService emailVerificationService;

  public AuthController(UserService userService, EmailVerificationService emailVerificationService) {
    this.userService = userService;
    this.emailVerificationService = emailVerificationService;
  }

  @PostMapping("/signup")
  public ApiResponse<Void> signup(@RequestBody @Valid AuthDtos.SignupRequest req) {
    userService.signup(req);
    return ApiResponse.ok("signed up", null);
  }

  @PostMapping("/login")
  public ApiResponse<AuthDtos.TokenResponse> login(@RequestBody @Valid AuthDtos.LoginRequest req) {
    return ApiResponse.ok(userService.login(req));
  }

  @PostMapping("/refresh")
  public ApiResponse<AuthDtos.TokenResponse> refresh(@RequestBody @Valid AuthDtos.RefreshRequest req) {
    return ApiResponse.ok(userService.refresh(req));
  }

  @PostMapping("/logout")
  public ApiResponse<Void> logout(
          Authentication authentication,
          @RequestBody @Valid AuthDtos.LogoutRequest req
  ) {
    userService.logout(authentication.getName(), req);
    return ApiResponse.ok("logged out", null);
  }




  @GetMapping("/check-username")
  public ApiResponse<AuthDtos.UsernameCheckResponse> checkUsername(@RequestParam String username) {
    return ApiResponse.ok(
            new AuthDtos.UsernameCheckResponse(
                    userService.isUsernameAvailable(username)
            )
    );
  }

  @GetMapping("/check-email")
  public ApiResponse<AuthDtos.EmailCheckResponse> checkEmail(@RequestParam String email) {
    return ApiResponse.ok(new AuthDtos.EmailCheckResponse(userService.isEmailAvailable(email)));
  }

  @GetMapping("/check-phone")
  public ApiResponse<AuthDtos.PhoneCheckResponse> checkPhone(@RequestParam String phoneNumber) {
    return ApiResponse.ok(new AuthDtos.PhoneCheckResponse(userService.isPhoneAvailable(phoneNumber)));
  }

  @PostMapping("/email/send-code")
  public ApiResponse<Void> sendEmailCode(@RequestBody @Valid AuthDtos.SendEmailCodeRequest req) {
    emailVerificationService.sendCode(req.email());
    return ApiResponse.ok("sent", null);
  }

  @PostMapping("/email/verify-code")
  public ApiResponse<AuthDtos.VerifyEmailCodeResponse> verifyEmailCode(@RequestBody @Valid AuthDtos.VerifyEmailCodeRequest req) {
    boolean verified = emailVerificationService.verifyCode(req.email(), req.code());
    return ApiResponse.ok(new AuthDtos.VerifyEmailCodeResponse(verified));
  }
  @PostMapping("/password/send-reset-code")
  public ApiResponse<Void> sendPasswordResetCode(
          @RequestBody @Valid AuthDtos.SendEmailCodeRequest req
  ) {
    emailVerificationService.sendCode(req.email());
    return ApiResponse.ok("password reset code sent", null);
  }
  @PostMapping("/password/verify-reset-code")
  public ApiResponse<AuthDtos.VerifyEmailCodeResponse> verifyPasswordResetCode(
          @RequestBody @Valid AuthDtos.VerifyEmailCodeRequest req
  ) {
    boolean verified = emailVerificationService.verifyCode(req.email(), req.code());
    return ApiResponse.ok(new AuthDtos.VerifyEmailCodeResponse(verified));
  }
  @PostMapping("/password/reset")
  public ApiResponse<Void> resetPassword(
          @RequestBody @Valid AuthDtos.ResetPasswordRequest req
  ) {
    userService.resetPassword(req);
    return ApiResponse.ok("password reset", null);
  }
}
