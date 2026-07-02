package com.example.backend1.common;

public class ApiException extends RuntimeException {
  private final ErrorCode errorCode;

  public ApiException(ErrorCode errorCode) {
    super(errorCode.message());
    this.errorCode = errorCode;
  }

  public ApiException(ErrorCode errorCode, String message) {
    super(message);
    this.errorCode = errorCode;
  }

  public ErrorCode errorCode() { return errorCode; }
}
