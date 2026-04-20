import { apiDownload, apiRequest } from "../lib/api";
import type {
  KategoriFilter,
  WajibPajakDetailData,
  WajibPajakListResponse,
  WajibPajakPayload,
} from "../types/domain";

export type WajibPajakListQuery = {
  search: string;
  kategori: KategoriFilter;
  page: number;
  pageSize: number;
};

export function getWajibPajakList(
  params: WajibPajakListQuery,
  signal?: AbortSignal,
) {
  return apiRequest<WajibPajakListResponse>("/wajib-pajak", {
    query: {
      search: params.search || undefined,
      kategori: params.kategori === "Semua" ? undefined : params.kategori,
      page: params.page,
      pageSize: params.pageSize,
    },
    signal,
  });
}

export function getWajibPajakDetail(id: string | number, signal?: AbortSignal) {
  return apiRequest<WajibPajakDetailData>(`/wajib-pajak/${id}`, {
    signal,
  });
}

export function createWajibPajak(
  payload: WajibPajakPayload,
  signal?: AbortSignal,
) {
  return apiRequest<WajibPajakDetailData>("/wajib-pajak", {
    method: "POST",
    body: payload,
    signal,
  });
}

export function updateWajibPajak(
  id: string | number,
  payload: WajibPajakPayload,
  signal?: AbortSignal,
) {
  return apiRequest<WajibPajakDetailData>(`/wajib-pajak/${id}`, {
    method: "PUT",
    body: payload,
    signal,
  });
}

export function deleteWajibPajak(id: string | number, signal?: AbortSignal) {
  return apiRequest<null>(`/wajib-pajak/${id}`, {
    method: "DELETE",
    signal,
  });
}

export function downloadWajibPajakCsv(
  params: Pick<WajibPajakListQuery, "search" | "kategori">,
  signal?: AbortSignal,
) {
  return apiDownload("/wajib-pajak/export", {
    query: {
      format: "csv",
      search: params.search || undefined,
      kategori: params.kategori === "Semua" ? undefined : params.kategori,
    },
    signal,
  });
}

export function downloadWajibPajakDeviceInfo(signal?: AbortSignal) {
  return apiDownload("/wajib-pajak/device-information/export", {
    query: { format: "txt" },
    signal,
  });
}
