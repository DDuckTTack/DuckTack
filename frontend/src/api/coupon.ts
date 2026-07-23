import { apiClient } from "./apiClient";

export type CouponStatus = "AVAILABLE" | "USED";

export type CouponItem = {
  couponId: number;
  companyId: number;
  companyName: string;
  discountPercent: number;
  status: CouponStatus;
  issuedAt: string | null;
  usedAt: string | null;
};

function unwrapData<T>(raw: any): T {
  return raw?.data ?? raw;
}

export async function listMyCoupons(): Promise<CouponItem[]> {
  const res = await apiClient.get("/api/coupons");
  const data = unwrapData<any>(res.data);
  return Array.isArray(data) ? data : [];
}

export async function useCoupon(couponId: number | string): Promise<CouponItem> {
  const res = await apiClient.post(`/api/coupons/${couponId}/use`);
  return unwrapData<CouponItem>(res.data);
}
