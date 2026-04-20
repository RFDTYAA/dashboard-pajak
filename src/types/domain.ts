export type DashboardKategori = "Restaurant" | "Hotel" | "Hiburan & Kesenian";
export type FormKategori = "Hotel" | "Hiburan" | "Restaurant";
export type KategoriFilter = "Semua" | DashboardKategori;
export type JenisPOS = "Tab" | "T-107";
export type JenisPOSFilter = "Semua" | JenisPOS;
export type StatusUsaha = "Aktif" | "Nonaktif";
export type PeriodeAnalisis =
  | "1 Tahun Terakhir"
  | "6 Bulan Terakhir"
  | "3 Bulan Terakhir";
export type KecamatanFilter =
  | "Semua"
  | "Bebesen"
  | "Kebayakan"
  | "Lut Tawar"
  | "Pegasing";

export type DashboardSummary = {
  totalRestaurant: number;
  totalHotel: number;
  totalHiburan: number;
  totalSemua: number;
};

export type DashboardRevenueItem = {
  bulan: string;
  total: number;
  tahun: string;
  kategori: string;
};

export type DashboardTopPayerItem = {
  id?: number | string;
  npwpd?: string;
  tipeUsaha?: string;
  namaUsaha?: string;
  jenisPOS?: string;
  jenisPOC?: string;
  pendapatanKotor?: number;
  jumlah?: number;
  bulan?: string;
  tahun?: string;
  kategori?: string;
  nama?: string;
};

export type DashboardOverviewResponse = {
  summary: DashboardSummary;
  revenueByMonth: DashboardRevenueItem[];
  topPayers: DashboardTopPayerItem[];
  availableYears?: string[];
};

export type WajibPajakListItem = {
  id: number | string;
  npwpd: string;
  namaUsaha: string;
  tipeUsaha: string;
  jenisPOS?: string;
  jenisPos?: string;
};

export type WajibPajakListResponse = {
  items: WajibPajakListItem[];
  summary: {
    total: number;
    hotel: number;
    restaurant: number;
    hiburan: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

export type WajibPajakDetailData = {
  id: number | string;
  npwpd: string;
  tipeUsaha: string;
  namaUsaha: string;
  alamat: string;
  email: string;
  telp: string;
  status?: string;
  tanggalAktivasi?: string;
  jenisPOS?: string;
  jenisPos?: string;
  jamBuka?: string | null;
  jamTutup?: string | null;
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
};

export type WajibPajakPayload = {
  npwpd: string;
  kategori: FormKategori;
  namaUsaha: string;
  telp: string;
  email: string;
  jamBuka: string | null;
  jamTutup: string | null;
  jenisPos: JenisPOS;
  alamat: string;
  latitude: number;
  longitude: number;
};

export type DensityPoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kecamatan: Exclude<KecamatanFilter, "Semua">;
  density: number;
  note: string;
};

export type SupplyRow = {
  kecamatan: Exclude<KecamatanFilter, "Semua">;
  estimasi: number;
  ikanKg: number;
  ayamEkor: number;
  berasTon: number;
};

export type AnalisisMonthlyFactor = {
  bulan: string;
  teks: string;
};

export type AnalisisOverviewResponse = {
  summary: {
    headlineKecamatan?: string;
    headlineEstimasi?: number;
    growthPercentage?: number;
    recommendation?: string;
  };
  densityPoints: DensityPoint[];
  supplyRows: SupplyRow[];
  factors: AnalisisMonthlyFactor[];
};

export function normalizeBulan(value: string) {
  return value === "Sepember" ? "September" : value;
}

export function normalizeDashboardKategori(
  value: string | null | undefined,
): DashboardKategori {
  const current = String(value ?? "").trim();

  if (current === "Hiburan" || current === "Hiburan & Kesenian") {
    return "Hiburan & Kesenian";
  }

  if (current === "Hotel") {
    return "Hotel";
  }

  return "Restaurant";
}

export function normalizeFormKategori(
  value: string | null | undefined,
): FormKategori {
  const current = normalizeDashboardKategori(value);

  if (current === "Hiburan & Kesenian") {
    return "Hiburan";
  }

  return current;
}

export function normalizeJenisPOS(value: string | null | undefined): JenisPOS {
  return String(value ?? "").trim() === "T-107" ? "T-107" : "Tab";
}

export function normalizeStatusUsaha(
  value: string | null | undefined,
): StatusUsaha {
  return String(value ?? "").trim() === "Nonaktif" ? "Nonaktif" : "Aktif";
}

export function normalizeNpwpd(value: string | number | null | undefined) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits.length) return "";
  return digits.padStart(16, "0").slice(0, 16);
}

export function createEmptyDashboardOverview(): DashboardOverviewResponse {
  return {
    summary: {
      totalRestaurant: 0,
      totalHotel: 0,
      totalHiburan: 0,
      totalSemua: 0,
    },
    revenueByMonth: [],
    topPayers: [],
  };
}

export function createEmptyWajibPajakListResponse(
  page: number,
  pageSize: number,
): WajibPajakListResponse {
  return {
    items: [],
    summary: {
      total: 0,
      hotel: 0,
      restaurant: 0,
      hiburan: 0,
    },
    pagination: {
      page,
      pageSize,
      totalItems: 0,
      totalPages: 1,
    },
  };
}

export function createEmptyWajibPajakDetail(
  id: number | string,
): WajibPajakDetailData {
  return {
    id,
    npwpd: "",
    tipeUsaha: "Restaurant",
    namaUsaha: "",
    alamat: "",
    email: "",
    telp: "",
    status: "Aktif",
    tanggalAktivasi: "",
    jenisPOS: "Tab",
    jamBuka: "",
    jamTutup: "",
    lat: 4.6276,
    lng: 96.8577,
  };
}

export function createEmptyAnalisisOverview(): AnalisisOverviewResponse {
  return {
    summary: {
      headlineKecamatan: "",
      headlineEstimasi: 0,
      growthPercentage: 0,
      recommendation: "",
    },
    densityPoints: [],
    supplyRows: [],
    factors: [],
  };
}
