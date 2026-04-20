import { apiRequest } from "../lib/api";
import type {
  AnalisisOverviewResponse,
  KecamatanFilter,
  KategoriFilter,
  PeriodeAnalisis,
} from "../types/domain";

export type AnalisisOverviewQuery = {
  periode: PeriodeAnalisis;
  kategori: KategoriFilter;
  kecamatan: KecamatanFilter;
};

export function getAnalisisOverview(
  params: AnalisisOverviewQuery,
  signal?: AbortSignal,
) {
  return apiRequest<AnalisisOverviewResponse>("/analisis/overview", {
    query: {
      periode: params.periode,
      kategori: params.kategori === "Semua" ? undefined : params.kategori,
      kecamatan: params.kecamatan === "Semua" ? undefined : params.kecamatan,
    },
    signal,
  });
}
