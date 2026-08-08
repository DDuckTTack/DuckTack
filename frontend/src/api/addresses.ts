import {apiClient} from "./apiClient";

export type AddressResult = {
  roadAddress:string;
  jibunAddress:string;
  postalCode:string;
  latitude:number;
  longitude:number;
};

export async function searchAddresses(query:string):Promise<AddressResult[]> {
  const response = await apiClient.get("/api/addresses/search", {params:{query:query.trim()}});
  const data = response.data?.data ?? response.data;
  return Array.isArray(data) ? data : [];
}
