import { apiRequest } from "../lib/api";
import type {
  DashboardOverviewResponse,
  KategoriFilter,
  JenisPOSFilter,
} from "../types/domain";

export type DashboardOverviewQuery = {
  bulan: string;
  tahun: string;
  kategori: KategoriFilter;
  jenisPOS: JenisPOSFilter;
};

export function getDashboardOverview(
  params: DashboardOverviewQuery,
  signal?: AbortSignal,
) {
  return apiRequest<DashboardOverviewResponse>("/dashboard/overview", {
    query: {
      bulan: params.bulan,
      tahun: params.tahun,
      kategori: params.kategori === "Semua" ? undefined : params.kategori,
      jenisPos: params.jenisPOS === "Semua" ? undefined : params.jenisPOS,
    },
    signal,
  });
}
