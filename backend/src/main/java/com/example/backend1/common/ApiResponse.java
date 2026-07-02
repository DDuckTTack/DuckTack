package com.example.backend1.common;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class ApiResponse<T> {

  private boolean success;
  private String code;
  private String message;
  private T data;
  private String timestamp;

  public ApiResponse() {
    this.timestamp = LocalDateTime.now()
            .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
  }

  public static <T> ApiResponse<T> ok(T data) {
    ApiResponse<T> res = new ApiResponse<>();
    res.success = true;
    res.data = data;
    return res;
  }

  public static <T> ApiResponse<T> ok(String message, T data) {
    ApiResponse<T> res = new ApiResponse<>();
    res.success = true;
    res.message = message;
    res.data = data;
    return res;
  }

  public static <T> ApiResponse<T> error(String code, String message) {
    ApiResponse<T> res = new ApiResponse<>();
    res.success = false;
    res.code = code;
    res.message = message;
    return res;
  }

  public boolean isSuccess() {
    return success;
  }

  public String getCode() {
    return code;
  }

  public String getMessage() {
    return message;
  }

  public T getData() {
    return data;
  }

  public String getTimestamp() {
    return timestamp;
  }
}