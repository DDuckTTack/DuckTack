import { apiClient } from "./apiClient";

export type ResidenceType =
    | "ONE_ROOM"
    | "OFFICETEL"
    | "APT"
    | "VILLA"
    | "HOUSE"
    | "ETC";

export type RentType = "NONE" | "MONTHLY" | "JEONSE" | "SALE";

export type Me = {
  username: string;
  email?: string;
  phoneNumber?: string;
  residenceType: ResidenceType;
  rentType: RentType;
  address: string;
  roadAddress?: string;
  addressDetail?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
};

export type UpdateMeRequest = {
  residenceType: ResidenceType;
  rentType: RentType;
  address: string;
  roadAddress?: string;
  addressDetail?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
};

function normalizeMe(data: any): Me {
  return {
    username: data?.username ?? data?.loginId ?? "",
    email: data?.email ? String(data.email) : "",
    phoneNumber: data?.phoneNumber ? String(data.phoneNumber) : "",
    residenceType: data?.residenceType,
    rentType: data?.rentType,
    address: data?.address ?? "",
    roadAddress: data?.roadAddress ?? "",
    addressDetail: data?.addressDetail ?? "",
    postalCode: data?.postalCode ?? "",
    latitude: data?.latitude == null ? undefined : Number(data.latitude),
    longitude: data?.longitude == null ? undefined : Number(data.longitude),
  };
}

export async function getMe(): Promise<Me> {
  const res = await apiClient.get("/api/users/me");
  const body = res.data;
  const data = body?.data ?? body;
  return normalizeMe(data);
}

export async function updateMe(req: UpdateMeRequest): Promise<Me> {
  const res = await apiClient.put("/api/users/me", {
    residenceType: req.residenceType,
    rentType: req.rentType,
    address: req.address.trim(),
    roadAddress: req.roadAddress?.trim(),
    addressDetail: req.addressDetail?.trim(),
    postalCode: req.postalCode?.trim(),
    latitude: req.latitude,
    longitude: req.longitude,
  });
  const body = res.data;
  const data = body?.data ?? body;
  return normalizeMe(data);
}
