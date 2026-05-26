import { apiRequest } from "../lib/api";
import {
  createEmptyDashboardOverview,
  normalizeBulan,
  normalizeDashboardKategori,
  normalizeJenisPOS,
} from "../types/domain";
import type {
  DashboardKategori,
  DashboardOverviewResponse,
  DashboardRevenueItem,
  DashboardTopPayerItem,
  JenisPOSFilter,
  KategoriFilter,
} from "../types/domain";

type RawTransaction = Record<string, unknown>;

export type DashboardOverviewQuery = {
  bulan: string;
  tahun: string;
  kategori: KategoriFilter;
  jenisPOS: JenisPOSFilter;
};

function getString(value: unknown, fallback = "") {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function getNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
}

function getNestedObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
}

function getArrayFromResponse(response: unknown): RawTransaction[] {
  const root = getNestedObject(response);

  if (!root) return [];

  const data = root.data;

  if (Array.isArray(data)) {
    return data as RawTransaction[];
  }

  const dataObj = getNestedObject(data);

  if (dataObj) {
    if (Array.isArray(dataObj.data)) return dataObj.data as RawTransaction[];
    if (Array.isArray(dataObj.items)) return dataObj.items as RawTransaction[];
    if (Array.isArray(dataObj.rows)) return dataObj.rows as RawTransaction[];
  }

  if (Array.isArray(root.items)) return root.items as RawTransaction[];
  if (Array.isArray(root.rows)) return root.rows as RawTransaction[];

  return [];
}

function getBusinessTypeName(item: RawTransaction) {
  const taxPayer =
    getNestedObject(item.tax_payer) ?? getNestedObject(item.taxPayer);
  const businessType =
    getNestedObject(item.business_type) ??
    getNestedObject(item.businessType) ??
    getNestedObject(taxPayer?.business_type) ??
    getNestedObject(taxPayer?.businessType);

  return (
    getString(businessType?.name) ||
    getString(item.business_type_name) ||
    getString(item.businessTypeName) ||
    getString(taxPayer?.business_type_name) ||
    getString(taxPayer?.businessTypeName) ||
    getString(item.kategori) ||
    getString(item.tipeUsaha) ||
    getString(item.business_type) ||
    getString(item.businessType) ||
    "Restaurant"
  );
}

function getKategori(item: RawTransaction): DashboardKategori {
  return normalizeDashboardKategori(getBusinessTypeName(item));
}

function getPosName(item: RawTransaction) {
  const taxPayer =
    getNestedObject(item.tax_payer) ?? getNestedObject(item.taxPayer);
  const posType =
    getNestedObject(item.pos_type) ??
    getNestedObject(item.posType) ??
    getNestedObject(taxPayer?.pos_type) ??
    getNestedObject(taxPayer?.posType);

  return (
    getString(posType?.name) ||
    getString(item.pos_type_name) ||
    getString(item.posTypeName) ||
    getString(taxPayer?.pos_type_name) ||
    getString(taxPayer?.posTypeName) ||
    getString(item.jenisPOS) ||
    getString(item.jenisPos) ||
    getString(item.pos_type) ||
    getString(item.posType) ||
    "Advan Tab VX Neo"
  );
}

function getJenisPOS(item: RawTransaction) {
  return normalizeJenisPOS(getPosName(item));
}

function getPajak(item: RawTransaction) {
  return (
    getNumber(item.tax) ||
    getNumber(item.pajak) ||
    getNumber(item.total_tax) ||
    getNumber(item.totalTax) ||
    Math.round(getPendapatanKotor(item) * 0.1)
  );
}

function getPendapatanKotor(item: RawTransaction) {
  return (
    getNumber(item.transaction_amount) ||
    getNumber(item.transactionAmount) ||
    getNumber(item.pendapatanKotor) ||
    getNumber(item.jumlah) ||
    getNumber(item.amount) ||
    0
  );
}

function getTransactionDate(item: RawTransaction) {
  return (
    getString(item.transaction_time) ||
    getString(item.transactionTime) ||
    getString(item.created_at) ||
    getString(item.createdAt) ||
    ""
  );
}

function getBulan(item: RawTransaction) {
  const rawMonth = getString(item.bulan);

  if (rawMonth) return normalizeBulan(rawMonth);

  const date = getTransactionDate(item);

  if (!date) return "Januari";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "Januari";

  const monthIndex = parsed.getMonth();

  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ] as const;

  return months[monthIndex];
}

function getTahun(item: RawTransaction) {
  const rawYear = getString(item.tahun);

  if (rawYear) return rawYear;

  const date = getTransactionDate(item);

  if (!date) return String(new Date().getFullYear());

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return String(new Date().getFullYear());

  return String(parsed.getFullYear());
}

function getId(item: RawTransaction, index: number) {
  return (
    getString(item.id) ||
    getString(item.transaction_id) ||
    getString(item.transactionId) ||
    index + 1
  );
}

function getNpwpd(item: RawTransaction) {
  const taxPayer =
    getNestedObject(item.tax_payer) ?? getNestedObject(item.taxPayer);

  return (
    getString(taxPayer?.npwpd) ||
    getString(item.npwpd) ||
    getString(item.taxpayer_npwpd) ||
    getString(item.taxPayerNpwpd) ||
    ""
  );
}

function getNamaUsaha(item: RawTransaction) {
  const taxPayer =
    getNestedObject(item.tax_payer) ?? getNestedObject(item.taxPayer);

  return (
    getString(taxPayer?.business_name) ||
    getString(taxPayer?.businessName) ||
    getString(taxPayer?.namaUsaha) ||
    getString(item.business_name) ||
    getString(item.businessName) ||
    getString(item.namaUsaha) ||
    getString(item.nama) ||
    "Nama Usaha"
  );
}

function buildRevenueByMonth(rows: RawTransaction[]): DashboardRevenueItem[] {
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  const years = Array.from(new Set(rows.map((item) => getTahun(item))));

  const usedYears =
    years.length > 0 ? years : [String(new Date().getFullYear())];

  const result: DashboardRevenueItem[] = [];

  for (const tahun of usedYears) {
    for (const bulan of months) {
      for (const kategori of [
        "Restaurant",
        "Hotel",
        "Hiburan & Kesenian",
        "Jasa Parkir",
      ] as DashboardKategori[]) {
        const total = rows
          .filter((item) => getTahun(item) === tahun)
          .filter((item) => getBulan(item) === bulan)
          .filter((item) => getKategori(item) === kategori)
          .reduce((sum, item) => sum + getPajak(item), 0);

        result.push({
          bulan,
          tahun,
          kategori,
          total,
        });
      }
    }
  }

  return result;
}

function buildDashboardOverview(
  rows: RawTransaction[],
  query: DashboardOverviewQuery,
): DashboardOverviewResponse {
  const filteredByMonth = rows
    .filter((item) => getBulan(item) === query.bulan)
    .filter((item) => getTahun(item) === query.tahun)
    .filter((item) =>
      query.kategori === "Semua" ? true : getKategori(item) === query.kategori,
    )
    .filter((item) =>
      query.jenisPOS === "Semua" ? true : getJenisPOS(item) === query.jenisPOS,
    );

  const totalRestaurant = filteredByMonth
    .filter((item) => getKategori(item) === "Restaurant")
    .reduce((total, item) => total + getPajak(item), 0);

  const totalHotel = filteredByMonth
    .filter((item) => getKategori(item) === "Hotel")
    .reduce((total, item) => total + getPajak(item), 0);

  const totalHiburan = filteredByMonth
    .filter((item) => getKategori(item) === "Hiburan & Kesenian")
    .reduce((total, item) => total + getPajak(item), 0);

  const totalJasaParkir = filteredByMonth
    .filter((item) => getKategori(item) === "Jasa Parkir")
    .reduce((total, item) => total + getPajak(item), 0);

  const totalSemua =
    totalRestaurant + totalHotel + totalHiburan + totalJasaParkir;

  const revenueByMonth = buildRevenueByMonth(rows);

  const topPayers: DashboardTopPayerItem[] = filteredByMonth
    .map((item, index) => ({
      id: getId(item, index),
      npwpd: getNpwpd(item),
      tipeUsaha: getKategori(item),
      kategori: getKategori(item),
      namaUsaha: getNamaUsaha(item),
      nama: getNamaUsaha(item),
      jenisPOS: getJenisPOS(item),
      jenisPOC: getJenisPOS(item),
      pendapatanKotor: getPendapatanKotor(item),
      jumlah: getPendapatanKotor(item),
      bulan: getBulan(item),
      tahun: getTahun(item),
    }))
    .sort((a, b) => (b.pendapatanKotor ?? 0) - (a.pendapatanKotor ?? 0))
    .slice(0, 10);

  const availableYears = Array.from(
    new Set([
      String(new Date().getFullYear()),
      String(new Date().getFullYear() - 1),
      String(new Date().getFullYear() - 2),
      ...rows.map((item) => getTahun(item)),
    ]),
  ).sort((a, b) => Number(b) - Number(a));

  return {
    summary: {
      totalRestaurant,
      totalHotel,
      totalHiburan,
      totalJasaParkir,
      totalSemua,
    },
    revenueByMonth,
    topPayers,
    availableYears,
  };
}

export async function getDashboardOverview(
  query: DashboardOverviewQuery,
  signal?: AbortSignal,
): Promise<DashboardOverviewResponse> {
  try {
    const response = await apiRequest<unknown>("/transaction", {
      query: {
        page: 1,
        size: 1000,
      },
      signal,
    });

    const rows = getArrayFromResponse(response);

    return buildDashboardOverview(rows, query);
  } catch (error) {
    if (signal?.aborted) {
      return createEmptyDashboardOverview();
    }

    throw error;
  }
}
