import { apiDownload, apiRequest } from "../lib/api";
import type {
  KategoriFilter,
  WajibPajakDetailData,
  WajibPajakListItem,
  WajibPajakListResponse,
} from "../types/domain";
import {
  normalizeDashboardKategori,
  normalizeJenisPOS,
  normalizeNpwpd,
} from "../types/domain";

export type WajibPajakListQuery = {
  search: string;
  kategori: KategoriFilter;
  page: number;
  pageSize: number;
};

export type MasterOption = {
  id: string;
  name: string;
};

export type BusinessTypeOption = MasterOption & {
  isActive: boolean;
};

export type PosTypeOption = MasterOption;

export type CityOption = MasterOption;

export type WajibPajakBackendPayload = {
  npwpd: string;
  kategori: string;
  namaUsaha: string;
  telp: string;
  email: string;
  jamBuka: string | null;
  jamTutup: string | null;
  jenisPos: string;
  alamat: string;
  latitude: number;
  longitude: number;
  citiesId?: string;
};

type ApiListResponse<T> = {
  data?:
    | T[]
    | {
        data?: T[];
        items?: T[];
        rows?: T[];
        result?: T[];
        total?: number;
        count?: number;
        totalData?: number;
        totalItems?: number;
        page?: number;
        size?: number;
        limit?: number;
        total_page?: number;
        totalPage?: number;
      };
};

type ApiDetailResponse<T> = {
  data?: T;
};

type MasterApiItem = {
  id?: string | number;
  name?: string;
  nama?: string;
  title?: string;
  label?: string;
  is_active?: boolean;
};

type TaxPayerApiItem = {
  id?: string | number;
  taxpayer_id?: string | number;
  tax_payer_id?: string | number;

  npwpd?: string | number;
  npwp?: string | number;
  nwpd?: string | number;

  business_name?: string;
  nama_usaha?: string;
  namaUsaha?: string;
  name?: string;
  nama?: string;

  business_type?: string | MasterApiItem;
  business_type_id?: string;
  business_type_name?: string;
  kategori?: string;
  tipeUsaha?: string;
  tipe_usaha?: string;

  pos_type?: string | MasterApiItem;
  pos_type_id?: string;
  pos_type_name?: string;
  jenisPOS?: string;
  jenisPos?: string;
  jenis_pos?: string;

  address?: string;
  alamat?: string;

  phone?: string;
  no_hp?: string;
  phone_number?: string;
  telp?: string;
  email?: string;

  cities_id?: string;
  city_id?: string;
  cities?: string | MasterApiItem;
  city?: string | MasterApiItem;

  latitude?: number | string | null;
  longitude?: number | string | null;
  lat?: number | string | null;
  lng?: number | string | null;

  open_time?: string | null;
  close_time?: string | null;
  jamBuka?: string | null;
  jamTutup?: string | null;

  is_active?: boolean;
  status?: string;
  created_at?: string;
  updated_at?: string;
  activated_at?: string;

  device_id?: string | null;
  provider?: string | null;
  sim_number?: string | null;
};

type BackendTaxPayerPayload = {
  npwpd: string;
  business_type: string;
  business_name: string;
  address: string;
  email: string;
  phone: string;
  is_active: boolean;
  pos_type: string;
  cities_id?: string;
  open_time: string | null;
  close_time: string | null;
  lat: number | null;
  lng: number | null;
};

function unwrapList<T>(response: ApiListResponse<T> | T[]): T[] {
  if (Array.isArray(response)) return response;

  const data = response.data;

  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  if (data?.rows && Array.isArray(data.rows)) return data.rows;
  if (data?.result && Array.isArray(data.result)) return data.result;

  return [];
}

function getTotal<T>(response: ApiListResponse<T> | T[], rows: T[]) {
  if (Array.isArray(response)) return rows.length;

  const data = response.data;

  if (Array.isArray(data)) return data.length;

  return (
    data?.total ??
    data?.count ??
    data?.totalData ??
    data?.totalItems ??
    rows.length
  );
}

function unwrapDetail<T>(response: ApiDetailResponse<T> | T): T | undefined {
  if (response && typeof response === "object" && "data" in response) {
    return (response as ApiDetailResponse<T>).data;
  }

  return response as T;
}

function toNumberOrUndefined(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toNumberOrNull(value: unknown) {
  return toNumberOrUndefined(value) ?? null;
}

function getObjectName(value: unknown) {
  if (!value || typeof value !== "object") return undefined;

  const item = value as MasterApiItem;

  return String(
    item.name ?? item.nama ?? item.title ?? item.label ?? "",
  ).trim();
}

function getObjectId(value: unknown) {
  if (!value || typeof value !== "object") return undefined;

  const item = value as MasterApiItem;

  return item.id === undefined || item.id === null
    ? undefined
    : String(item.id);
}

function getMasterName(item: MasterApiItem) {
  return String(item.name ?? item.nama ?? item.title ?? item.label ?? "-");
}

function mapMasterItem(item: MasterApiItem): MasterOption | null {
  if (item.id === undefined || item.id === null) return null;

  return {
    id: String(item.id),
    name: getMasterName(item),
  };
}

function getNamaUsaha(item: TaxPayerApiItem) {
  return String(
    item.business_name ??
      item.nama_usaha ??
      item.namaUsaha ??
      item.name ??
      item.nama ??
      "-",
  );
}

function getTipeUsahaLabel(item: TaxPayerApiItem) {
  const value =
    getObjectName(item.business_type) ||
    item.business_type_name ||
    item.kategori ||
    item.tipeUsaha ||
    item.tipe_usaha ||
    (typeof item.business_type === "string" ? item.business_type : "");

  return normalizeDashboardKategori(value);
}

function getJenisPOSLabel(item: TaxPayerApiItem) {
  const value =
    getObjectName(item.pos_type) ||
    item.pos_type_name ||
    item.jenisPOS ||
    item.jenisPos ||
    item.jenis_pos ||
    (typeof item.pos_type === "string" ? item.pos_type : "");

  return normalizeJenisPOS(value);
}

function getStatus(item: TaxPayerApiItem) {
  if (typeof item.is_active === "boolean") {
    return item.is_active ? "Aktif" : "Nonaktif";
  }

  return item.status ?? "Aktif";
}

function mapTaxPayerToDetail(
  item: TaxPayerApiItem,
  index: number,
): WajibPajakDetailData {
  const id = item.id ?? item.taxpayer_id ?? item.tax_payer_id ?? index + 1;
  const lat = toNumberOrUndefined(item.latitude ?? item.lat);
  const lng = toNumberOrUndefined(item.longitude ?? item.lng);

  return {
    id,
    npwpd: normalizeNpwpd(item.npwpd ?? item.nwpd ?? item.npwp ?? id),
    tipeUsaha: getTipeUsahaLabel(item),
    namaUsaha: getNamaUsaha(item),
    alamat: item.alamat ?? item.address ?? "",
    email: item.email ?? "",
    telp: item.telp ?? item.phone ?? item.no_hp ?? item.phone_number ?? "",
    status: getStatus(item),
    tanggalAktivasi: item.activated_at ?? item.created_at ?? "",
    jenisPOS: getJenisPOSLabel(item),
    jenisPos: getJenisPOSLabel(item),
    jamBuka: item.jamBuka ?? item.open_time ?? null,
    jamTutup: item.jamTutup ?? item.close_time ?? null,
    lat,
    lng,
    latitude: lat,
    longitude: lng,
    businessTypeId:
      item.business_type_id ??
      getObjectId(item.business_type) ??
      (typeof item.business_type === "string" ? item.business_type : ""),
    posTypeId:
      item.pos_type_id ??
      getObjectId(item.pos_type) ??
      (typeof item.pos_type === "string" ? item.pos_type : ""),
    citiesId:
      item.cities_id ??
      item.city_id ??
      getObjectId(item.cities) ??
      getObjectId(item.city) ??
      "",
  };
}

function mapTaxPayerToListItem(
  item: TaxPayerApiItem,
  index: number,
): WajibPajakListItem {
  const detail = mapTaxPayerToDetail(item, index);

  return {
    id: detail.id,
    npwpd: detail.npwpd,
    namaUsaha: detail.namaUsaha,
    tipeUsaha: detail.tipeUsaha,
    jenisPOS: detail.jenisPOS,
    jenisPos: detail.jenisPos,
  };
}

function requireText(value: unknown, label: string) {
  const text = String(value ?? "").trim();

  if (!text) throw new Error(`${label} wajib diisi.`);

  return text;
}

function mapPayloadToBackend(
  payload: WajibPajakBackendPayload,
): BackendTaxPayerPayload {
  const result: BackendTaxPayerPayload = {
    npwpd: requireText(payload.npwpd, "NPWPD"),
    business_type: requireText(payload.kategori, "Kategori usaha"),
    business_name: requireText(payload.namaUsaha, "Nama usaha"),
    address: requireText(payload.alamat, "Alamat"),
    email: String(payload.email ?? "").trim(),
    phone: String(payload.telp ?? "").trim(),
    is_active: true,
    pos_type: requireText(payload.jenisPos, "Jenis POS"),
    open_time: payload.jamBuka,
    close_time: payload.jamTutup,
    lat: toNumberOrNull(payload.latitude),
    lng: toNumberOrNull(payload.longitude),
  };

  if (payload.citiesId) {
    result.cities_id = payload.citiesId;
  }

  return result;
}

function makeCsv(rows: WajibPajakListItem[]) {
  const headers = ["NPWPD", "Nama Usaha", "Kategori", "Jenis POS"];

  const escape = (value: unknown) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  return [
    headers.map(escape).join(","),
    ...rows.map((row) =>
      [row.npwpd, row.namaUsaha, row.tipeUsaha, row.jenisPOS ?? row.jenisPos]
        .map(escape)
        .join(","),
    ),
  ].join("\n");
}

export async function getBusinessTypes(
  signal?: AbortSignal,
): Promise<BusinessTypeOption[]> {
  const response = await apiRequest<ApiListResponse<MasterApiItem>>(
    "/business-type",
    {
      query: {
        page: 1,
        size: 100,
      },
      signal,
    },
  );

  return unwrapList(response)
    .map((item) => {
      const mapped = mapMasterItem(item);
      if (!mapped) return null;

      return {
        ...mapped,
        isActive: item.is_active ?? true,
      };
    })
    .filter((item): item is BusinessTypeOption => Boolean(item))
    .filter((item) => !item.name.toLowerCase().includes("listrik"));
}

export async function getPosTypes(
  signal?: AbortSignal,
): Promise<PosTypeOption[]> {
  const response = await apiRequest<ApiListResponse<MasterApiItem>>(
    "/pos-type",
    {
      query: {
        page: 1,
        size: 100,
      },
      signal,
    },
  );

  return unwrapList(response)
    .map(mapMasterItem)
    .filter((item): item is PosTypeOption => Boolean(item));
}

export async function getCities(signal?: AbortSignal): Promise<CityOption[]> {
  const response = await apiRequest<ApiListResponse<MasterApiItem>>("/cities", {
    query: {
      page: 1,
      size: 100,
    },
    signal,
  });

  return unwrapList(response)
    .map(mapMasterItem)
    .filter((item): item is CityOption => Boolean(item));
}

export async function getWajibPajakList(
  params: WajibPajakListQuery,
  signal?: AbortSignal,
): Promise<WajibPajakListResponse> {
  const response = await apiRequest<ApiListResponse<TaxPayerApiItem>>(
    "/tax-payer",
    {
      query: {
        page: params.page,
        size: params.pageSize,
      },
      signal,
    },
  );

  const rawRows = unwrapList(response);
  const mappedRows = rawRows.map((item, index) =>
    mapTaxPayerToListItem(item, index),
  );

  const filteredRows = mappedRows.filter((item) => {
    const keyword = params.search.trim().toLowerCase();
    const kategori = normalizeDashboardKategori(item.tipeUsaha);

    if (item.tipeUsaha.toLowerCase().includes("listrik")) return false;

    const matchSearch = keyword
      ? item.npwpd.toLowerCase().includes(keyword) ||
        item.namaUsaha.toLowerCase().includes(keyword) ||
        item.tipeUsaha.toLowerCase().includes(keyword)
      : true;

    const matchKategori =
      params.kategori === "Semua" ? true : kategori === params.kategori;

    return matchSearch && matchKategori;
  });

  const allCategoryRows = mappedRows.filter(
    (item) => !item.tipeUsaha.toLowerCase().includes("listrik"),
  );

  return {
    items: filteredRows,
    summary: {
      total: getTotal(response, rawRows),
      hotel: allCategoryRows.filter(
        (item) => normalizeDashboardKategori(item.tipeUsaha) === "Hotel",
      ).length,
      restaurant: allCategoryRows.filter(
        (item) => normalizeDashboardKategori(item.tipeUsaha) === "Restaurant",
      ).length,
      hiburan: allCategoryRows.filter(
        (item) =>
          normalizeDashboardKategori(item.tipeUsaha) === "Hiburan & Kesenian",
      ).length,
      jasaParkir: allCategoryRows.filter(
        (item) => normalizeDashboardKategori(item.tipeUsaha) === "Jasa Parkir",
      ).length,
    },
    pagination: {
      page: params.page,
      pageSize: params.pageSize,
      totalItems: filteredRows.length,
      totalPages: Math.max(1, Math.ceil(filteredRows.length / params.pageSize)),
    },
  };
}

export async function getWajibPajakDetail(
  id: string | number,
  signal?: AbortSignal,
): Promise<WajibPajakDetailData> {
  const response = await apiRequest<
    ApiDetailResponse<TaxPayerApiItem> | TaxPayerApiItem
  >(`/tax-payer/${id}`, {
    signal,
  });

  const raw = unwrapDetail(response);

  return mapTaxPayerToDetail(raw ?? { id }, 0);
}

export async function createWajibPajak(
  payload: WajibPajakBackendPayload,
  signal?: AbortSignal,
): Promise<WajibPajakDetailData> {
  const response = await apiRequest<
    ApiDetailResponse<TaxPayerApiItem> | TaxPayerApiItem
  >("/tax-payer", {
    method: "POST",
    body: mapPayloadToBackend(payload),
    signal,
  });

  const raw = unwrapDetail(response);

  return mapTaxPayerToDetail(raw ?? {}, 0);
}

export async function updateWajibPajak(
  id: string | number,
  payload: WajibPajakBackendPayload,
  signal?: AbortSignal,
): Promise<WajibPajakDetailData> {
  const response = await apiRequest<
    ApiDetailResponse<TaxPayerApiItem> | TaxPayerApiItem
  >(`/tax-payer/${id}`, {
    method: "PUT",
    body: {
      id,
      ...mapPayloadToBackend(payload),
    },
    signal,
  });

  const raw = unwrapDetail(response);

  return mapTaxPayerToDetail(raw ?? { id }, 0);
}

export function deleteWajibPajak(id: string | number, signal?: AbortSignal) {
  return apiRequest<null>(`/tax-payer/${id}`, {
    method: "DELETE",
    signal,
  });
}

export async function downloadWajibPajakCsv(
  params: Pick<WajibPajakListQuery, "search" | "kategori">,
  signal?: AbortSignal,
) {
  const result = await getWajibPajakList(
    {
      search: params.search,
      kategori: params.kategori,
      page: 1,
      pageSize: 1000,
    },
    signal,
  );

  return new Blob([makeCsv(result.items)], {
    type: "text/csv;charset=utf-8",
  });
}

export function downloadWajibPajakDeviceInfo(signal?: AbortSignal) {
  return apiDownload("/tax-payer/file", {
    query: { format: "txt" },
    signal,
  });
}
