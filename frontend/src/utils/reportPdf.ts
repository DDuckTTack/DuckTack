import * as Print from "expo-print";
import * as FileSystem from "expo-file-system/legacy";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

import { apiClient } from "../api/apiClient";
import { buildReportPdfHtml, type ReportPdfTemplateInput } from "./reportPdfTemplate";

// PDF에 넣는 사진의 최대 가로 크기(px). 원본을 그대로 base64로 넣으면
// PDF 용량이 커져 생성이 실패하므로 이 크기로 줄여서 삽입한다.
const PDF_IMAGE_MAX_WIDTH = 1000;

export type CreatedReportPdf = {
  uri: string;
  numberOfPages?: number;
};

function withTimeout<T>(
    promise: Promise<T>,
    ms: number,
    message: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(message)), ms)
    ),
  ]);
}

function guessMimeType(uri: string): string {
  const lower = uri.toLowerCase();

  if (lower.includes(".png")) return "image/png";
  if (lower.includes(".webp")) return "image/webp";
  if (lower.includes(".heic") || lower.includes(".heif")) return "image/heic";

  return "image/jpeg";
}

function getFileExt(uri: string): string {
  const clean = uri.split("?")[0].split("#")[0].toLowerCase();

  if (clean.endsWith(".png")) return ".png";
  if (clean.endsWith(".webp")) return ".webp";
  if (clean.endsWith(".jpg")) return ".jpg";
  if (clean.endsWith(".jpeg")) return ".jpeg";

  return ".jpg";
}

function isLocalImageUri(uri: string): boolean {
  return (
      uri.startsWith("file://") ||
      uri.startsWith("content://") ||
      uri.startsWith("asset://") ||
      uri.startsWith("ph://")
  );
}

function normalizeRemoteImageUrl(uri: string): string {
  const raw = String(uri || "").trim();

  if (!raw) return "";

  if (raw.startsWith("data:")) return raw;

  const baseUrl = String(apiClient.defaults.baseURL || "")
      .replace(/\/api\/?$/, "")
      .replace(/\/$/, "");

  // DB에 예전 IP가 박혀 있어도 /storage/... 경로만 뽑아서 현재 백엔드 주소로 붙임
  const storageIndex = raw.indexOf("/storage/");
  if (storageIndex >= 0 && baseUrl) {
    return `${baseUrl}${raw.slice(storageIndex)}`;
  }

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  if (raw.startsWith("/") && baseUrl) {
    return `${baseUrl}${raw}`;
  }

  if (baseUrl) {
    return `${baseUrl}/${raw}`;
  }

  return raw;
}

/**
 * 로컬 파일(file://)을 PDF_IMAGE_MAX_WIDTH로 줄이고 JPEG로 압축한 뒤
 * data URI(base64)로 변환한다. 변환 실패 시 원본을 그대로 읽는다.
 */
async function downscaledDataUri(localUri: string): Promise<string> {
  try {
    const context = ImageManipulator.manipulate(localUri).resize({
      width: PDF_IMAGE_MAX_WIDTH,
    });
    const image = await withTimeout(
        context.renderAsync(),
        12000,
        "이미지 축소 시간이 초과되었습니다."
    );
    const result = await image.saveAsync({
      compress: 0.6,
      format: SaveFormat.JPEG,
      base64: true,
    });
    if (result.base64) {
      return `data:image/jpeg;base64,${result.base64}`;
    }
  } catch {
    if (__DEV__) console.warn("[reportPdf] 이미지 축소 실패, 원본 사용");
  }

  const base64 = await withTimeout(
      FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      }),
      12000,
      "로컬 이미지 변환 시간이 초과되었습니다."
  );
  return `data:${guessMimeType(localUri)};base64,${base64}`;
}

async function localImageToBase64(uri: string): Promise<string> {
  return downscaledDataUri(uri);
}

async function remoteImageToBase64(uri: string): Promise<string> {
  const normalizedUri = normalizeRemoteImageUrl(uri);

  if (!normalizedUri) return "";

  // HEIC는 웹/PDF 렌더링에서 깨질 가능성이 높아서 PDF에는 제외
  const lower = normalizedUri.toLowerCase();
  if (lower.includes(".heic") || lower.includes(".heif")) {
    if (__DEV__) console.warn("[reportPdf] HEIC 이미지 제외됨");
    return "";
  }

  const ext = getFileExt(normalizedUri);
  const localUri =
      FileSystem.cacheDirectory +
      "report_img_" +
      Date.now() +
      "_" +
      Math.random().toString(36).slice(2) +
      ext;

  const downloadResult = await withTimeout(
      FileSystem.downloadAsync(normalizedUri, localUri),
      12000,
      "원격 이미지 다운로드 시간이 초과되었습니다."
  );

  if (downloadResult.status < 200 || downloadResult.status >= 300) {
    throw new Error(`이미지 다운로드 실패: ${downloadResult.status}`);
  }

  return downscaledDataUri(downloadResult.uri);
}

async function toPrintableImageSrc(uri: string): Promise<string> {
  if (!uri) return "";

  if (uri.startsWith("data:")) {
    return uri;
  }

  if (isLocalImageUri(uri)) {
    return localImageToBase64(uri);
  }

  if (uri.startsWith("http://") || uri.startsWith("https://") || uri.startsWith("/")) {
    return remoteImageToBase64(uri);
  }

  return uri;
}

async function prepareImages(uris: string[]): Promise<string[]> {
  const unique = Array.from(new Set((uris || []).filter(Boolean)));
  const result: string[] = [];

  for (const uri of unique) {
    try {
      const converted = await toPrintableImageSrc(uri);

      if (converted) {
        result.push(converted);
      }
    } catch {
      if (__DEV__) console.warn("[reportPdf] 이미지 변환 실패");
      // 이미지 하나 실패했다고 PDF 전체 생성이 멈추면 안 됨
    }
  }

  return result;
}

export async function createDesignedReportPdf(
    input: ReportPdfTemplateInput
): Promise<CreatedReportPdf> {
  const [beforeImages, afterImages] = await withTimeout(
      Promise.all([
        prepareImages(input.beforeImages),
        prepareImages(input.afterImages),
      ]),
      30000,
      "PDF 이미지 준비 시간이 초과되었습니다."
  );

  const html = buildReportPdfHtml({
    ...input,
    beforeImages,
    afterImages,
  });

  const result = await withTimeout(
      Print.printToFileAsync({ html }),
      30000,
      "PDF 파일 생성 시간이 초과되었습니다."
  );

  return {
    uri: result.uri,
    numberOfPages: result.numberOfPages,
  };
}