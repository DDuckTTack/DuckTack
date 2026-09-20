import { apiClient } from "./apiClient";

export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken?: string;
  refreshExpiresAtEpochSeconds?: number;
};

export type ResidenceType =
    | "ONE_ROOM"
    | "OFFICETEL"
    | "APT"
    | "VILLA"
    | "HOUSE"
    | "ETC";

export type RentType = "NONE" | "MONTHLY" | "JEONSE" | "SALE";

export type SignupRequest = {
  username: string;
  email: string;
  password: string;
  phoneNumber: string;
  residenceType: ResidenceType;
  rentType: RentType;
  address?: string;
  emailVerified?: boolean;
};

export type ResetPasswordRequest = {
  email: string;
  code: string;
  newPassword: string;
};

function normalizePhone(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function pickBooleanAvailable(body: any): boolean {
  const data = body?.data ?? body;

  if (typeof data === "boolean") return data;

  const positiveKeys = [
    "available",
    "isAvailable",
    "emailAvailable",
    "usernameAvailable",
    "phoneAvailable",
    "phoneNumberAvailable",
  ];

  for (const key of positiveKeys) {
    if (typeof data?.[key] === "boolean") return data[key];
    if (typeof body?.[key] === "boolean") return body[key];
  }

  const negativeKeys = [
    "duplicated",
    "duplicate",
    "exists",
    "alreadyExists",
    "used",
    "taken",
  ];

  for (const key of negativeKeys) {
    if (typeof data?.[key] === "boolean") return !data[key];
    if (typeof body?.[key] === "boolean") return !body[key];
  }

  if (__DEV__) console.warn("[auth] 중복검사 응답 형식을 해석할 수 없음");
  throw new Error("INVALID_AVAILABLE_RESPONSE");
}

function pickBooleanFlag(body: any, fieldName: string): boolean {
  const data = body?.data ?? body;

  if (typeof data === "boolean") return data;

  const value = data?.[fieldName] ?? body?.[fieldName];

  if (typeof value !== "boolean") {
    if (__DEV__) console.warn(`[auth] ${fieldName} 응답 형식을 해석할 수 없음`);
    throw new Error(`INVALID_${fieldName.toUpperCase()}_RESPONSE`);
  }

  return value;
}

export async function login(req: LoginRequest): Promise<LoginResponse> {
  const res = await apiClient.post("/api/auth/login", {
    username: req.username.trim(),
    password: req.password,
  });

  const body = res.data;
  const data = body?.data ?? body;
  const token = data?.accessToken;

  if (!token) {
    throw new Error("NO_ACCESS_TOKEN");
  }

  return {
    accessToken: token,
    refreshToken: data?.refreshToken,
    refreshExpiresAtEpochSeconds: data?.refreshExpiresAtEpochSeconds,
  };
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const trimmed = username.trim();
  if (!trimmed) return false;

  try {
    const res = await apiClient.get("/api/auth/check-username", {
      params: { username: trimmed },
    });
    return pickBooleanAvailable(res.data);
  } catch (error: any) {
    if (__DEV__) console.warn("[auth] 아이디 중복검사 실패", error?.response?.status);
    throw error;
  }
}

export async function checkPhoneAvailable(phoneNumber: string): Promise<boolean> {
  const normalized = normalizePhone(phoneNumber);

  if (!normalized) return false;

  try {
    const res = await apiClient.get("/api/auth/check-phone", {
      params: { phoneNumber: normalized },
    });
    return pickBooleanAvailable(res.data);
  } catch (error: any) {
    if (__DEV__) console.warn("[auth] 휴대폰 중복검사 실패", error?.response?.status);
    throw error;
  }
}

export async function checkEmailAvailable(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);

  if (!normalized) return false;

  try {
    const res = await apiClient.get("/api/auth/check-email", {
      params: { email: normalized },
    });
    return pickBooleanAvailable(res.data);
  } catch (error: any) {
    if (__DEV__) console.warn("[auth] 이메일 중복검사 실패", error?.response?.status);
    throw error;
  }
}

export async function sendEmailVerificationCode(email: string): Promise<void> {
  const normalized = normalizeEmail(email);

  try {
    await apiClient.post("/api/auth/email/send-code", {
      email: normalized,
    });
  } catch (error: any) {
    if (__DEV__) console.warn("[auth] 이메일 인증코드 발송 실패", error?.response?.status);
    throw error;
  }
}

export async function verifyEmailCode(
    email: string,
    code: string
): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email);
  const normalizedCode = code.trim();

  try {
    const res = await apiClient.post("/api/auth/email/verify-code", {
      email: normalizedEmail,
      code: normalizedCode,
    });
    return pickBooleanFlag(res.data, "verified");
  } catch (error: any) {
    if (__DEV__) console.warn("[auth] 이메일 인증 실패", error?.response?.status);
    throw error;
  }
}

export async function sendPasswordResetCode(email: string): Promise<void> {
  const normalized = normalizeEmail(email);

  try {
    await apiClient.post("/api/auth/password/send-reset-code", {
      email: normalized,
    });
  } catch (error: any) {
    if (__DEV__) console.warn("[auth] 비밀번호 재설정 코드 발송 실패", error?.response?.status);
    throw error;
  }
}

export async function verifyPasswordResetCode(
    email: string,
    code: string
): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email);
  const normalizedCode = code.trim();

  try {
    const res = await apiClient.post("/api/auth/password/verify-reset-code", {
      email: normalizedEmail,
      code: normalizedCode,
    });
    return pickBooleanFlag(res.data, "verified");
  } catch (error: any) {
    if (__DEV__) console.warn("[auth] 비밀번호 재설정 코드 확인 실패", error?.response?.status);
    throw error;
  }
}

export async function resetPassword(req: {
  username: string;
  email: string;
  code: string;
  newPassword: string;
}): Promise<void> {
  try {
    await apiClient.post("/api/auth/password/reset", {
      username: req.username.trim(),
      email: normalizeEmail(req.email),
      code: req.code.trim(),
      newPassword: req.newPassword,
    });
  } catch (error: any) {
    if (__DEV__) console.warn("[auth] 비밀번호 변경 실패", error?.response?.status);
    throw error;
  }
}

export async function signup(req: SignupRequest): Promise<void> {
  if (!req.emailVerified) {
    throw new Error("EMAIL_NOT_VERIFIED");
  }

  const normalizedPhone = normalizePhone(req.phoneNumber);
  const normalizedEmail = normalizeEmail(req.email);

  try {
    await apiClient.post("/api/auth/signup", {
      username: req.username.trim(),
      email: normalizedEmail,
      password: req.password,
      phoneNumber: normalizedPhone,
      residenceType: req.residenceType,
      rentType: req.rentType,
      address: req.address?.trim() || "",
      emailVerified: true,

      termsAgreed: true,
      privacyAgreed: true,
      marketingAgreed: false,
    });
  } catch (error: any) {
    if (__DEV__) console.warn("[auth] 회원가입 실패", error?.response?.status);
    throw error;
  }
}
