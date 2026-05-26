import { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardBody,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import {
  ChevronDown,
  Download,
  Eye,
  HardDrive,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { deleteWajibPajak, getWajibPajakList } from "../services/wajibPajak";
import {
  downloadPerangkatWajibPajakPdf,
  downloadWajibPajakPdf,
} from "../utils/wajibPajakPdf";
import {
  createEmptyWajibPajakListResponse,
  normalizeDashboardKategori,
  normalizeJenisPOS,
  normalizeNpwpd,
} from "../types/domain";
import type {
  DashboardKategori as Kategori,
  JenisPOS,
  KategoriFilter,
  WajibPajakListResponse,
} from "../types/domain";

type WajibPajakRow = {
  id: number | string;
  npwpd: string;
  namaUsaha: string;
  tipeUsaha: Kategori;
  jenisPOS: JenisPOS;
};

const THEME = {
  pageBg: "#F2F7FF",
  headerBg: "#0B2E6B",
  headerBorder: "rgba(255,255,255,0.14)",
  border: "rgba(15, 23, 42, 0.10)",
  muted: "#64748B",
  text: "#0F172A",
  accent: "#1E63D6",
};

const BRAND = {
  title: "Daftar Wajib Pajak",
  subtitle: "Kabupaten Aceh Tengah",
};

const PAGE_SIZE = 10;

function tipeChipStyle(k: Kategori) {
  if (k === "Restaurant") return { bg: "#DBEAFE", fg: "#1D4ED8" };
  if (k === "Hotel") return { bg: "#FEF3C7", fg: "#B45309" };
  if (k === "Hiburan & Kesenian") return { bg: "#DCFCE7", fg: "#047857" };
  if (k === "Jasa Parkir") return { bg: "#F3E8FF", fg: "#7E22CE" };

  return { bg: "#F1F5F9", fg: "#0F172A" };
}

function posChipStyle(pos: JenisPOS) {
  if (pos === "Advan Tab VX Neo") return { bg: "#E0F2FE", fg: "#0369A1" };
  return { bg: "#F1F5F9", fg: "#0F172A" };
}

function statStyle(
  kind: "total" | "hotel" | "restaurant" | "hiburan" | "parkir",
) {
  if (kind === "total") {
    return {
      label: "Total Wajib Pajak",
      icon: "👥",
      iconBg: "#DBEAFE",
      iconColor: "#1D4ED8",
      barBg: "#DBEAFE",
      barFg: "#334155",
    };
  }

  if (kind === "hotel") {
    return {
      label: "Kategori Hotel",
      icon: "🏨",
      iconBg: "#FEF3C7",
      iconColor: "#B45309",
      barBg: "#FEF3C7",
      barFg: "#F59E0B",
    };
  }

  if (kind === "restaurant") {
    return {
      label: "Kategori Restaurant",
      icon: "🍽️",
      iconBg: "#DBEAFE",
      iconColor: "#1D4ED8",
      barBg: "#DBEAFE",
      barFg: "#3B82F6",
    };
  }

  if (kind === "parkir") {
    return {
      label: "Kategori Jasa Parkir",
      icon: "🅿️",
      iconBg: "#F3E8FF",
      iconColor: "#7E22CE",
      barBg: "#F3E8FF",
      barFg: "#9333EA",
    };
  }

  return {
    label: "Kategori Hiburan & Kesenian",
    icon: "🎭",
    iconBg: "#DCFCE7",
    iconColor: "#047857",
    barBg: "#DCFCE7",
    barFg: "#10B981",
  };
}

function SummaryCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  barBg,
  barFg,
}: {
  label: string;
  value: number;
  icon: string;
  iconBg: string;
  iconColor: string;
  barBg: string;
  barFg: string;
}) {
  return (
    <Card className="h-full border-none shadow-md shadow-slate-200/60 rounded-2xl bg-white">
      <CardBody className="h-full p-5 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p
              className="text-slate-500 text-[11px] uppercase tracking-wide font-extrabold leading-snug"
              style={{ minHeight: 36 }}
            >
              {label}
            </p>

            <p className="text-slate-900 text-2xl font-extrabold leading-none mt-2">
              {value}
            </p>
          </div>

          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: iconBg }}
          >
            <span style={{ color: iconColor }} className="text-lg">
              {icon}
            </span>
          </div>
        </div>

        <div
          className="mt-5 h-1.5 rounded-full"
          style={{ backgroundColor: barBg }}
        >
          <div
            className="h-1.5 rounded-full"
            style={{
              width: "100%",
              backgroundColor: barFg,
            }}
          />
        </div>
      </CardBody>
    </Card>
  );
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function paginationRange(current: number, total: number) {
  const visible = 5;
  const half = Math.floor(visible / 2);

  let start = current - half;
  let end = current + half;

  if (start < 1) {
    start = 1;
    end = Math.min(total, visible);
  }

  if (end > total) {
    end = total;
    start = Math.max(1, total - visible + 1);
  }

  const pages: number[] = [];
  for (let p = start; p <= end; p++) pages.push(p);

  return { start, end, pages };
}

export default function WajibPajak() {
  const navigate = useNavigate();

  const [response, setResponse] = useState<WajibPajakListResponse>(() =>
    createEmptyWajibPajakListResponse(1, PAGE_SIZE),
  );

  const [reloadKey, setReloadKey] = useState(0);
  const [q, setQ] = useState("");
  const [kategori, setKategori] = useState<KategoriFilter>("Semua");
  const [page, setPage] = useState(1);
  const [openUnduh, setOpenUnduh] = useState(false);
  const [openKategori, setOpenKategori] = useState(false);

  const unduhRef = useRef<HTMLDivElement | null>(null);
  const kategoriRef = useRef<HTMLDivElement | null>(null);
  const pageSize = PAGE_SIZE;

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (unduhRef.current && !unduhRef.current.contains(target)) {
        setOpenUnduh(false);
      }

      if (kategoriRef.current && !kategoriRef.current.contains(target)) {
        setOpenKategori(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;

    const run = async () => {
      try {
        const result = await getWajibPajakList(
          {
            search: q.trim(),
            kategori,
            page,
            pageSize,
          },
          controller.signal,
        );

        if (!alive) return;
        setResponse(result);
      } catch {
        if (!alive || controller.signal.aborted) return;
        setResponse(createEmptyWajibPajakListResponse(page, pageSize));
      }
    };

    void run();

    return () => {
      alive = false;
      controller.abort();
    };
  }, [q, kategori, page, pageSize, reloadKey]);

  const pageRows = useMemo<WajibPajakRow[]>(() => {
    return response.items.map((item) => ({
      id: item.id,
      npwpd: normalizeNpwpd(item.npwpd),
      namaUsaha: item.namaUsaha,
      tipeUsaha: normalizeDashboardKategori(item.tipeUsaha),
      jenisPOS: normalizeJenisPOS(item.jenisPOS ?? item.jenisPos),
    }));
  }, [response.items]);

  const counts = useMemo(() => {
    const rows = response.items.map((item) =>
      normalizeDashboardKategori(item.tipeUsaha),
    );

    return {
      total: response.summary.total,
      hotel: rows.filter((item) => item === "Hotel").length,
      restaurant: rows.filter((item) => item === "Restaurant").length,
      hiburan: rows.filter((item) => item === "Hiburan & Kesenian").length,
      parkir: rows.filter((item) => item === "Jasa Parkir").length,
    };
  }, [response.items, response.summary.total]);

  const totalItems = response.pagination.totalItems;
  const totalPages = Math.max(
    1,
    response.pagination.totalPages || Math.ceil(totalItems / pageSize) || 1,
  );
  const safePage = clamp(page, 1, totalPages);

  const showingStart = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const showingEnd = Math.min(safePage * pageSize, totalItems);

  const { pages, start, end } = useMemo(
    () => paginationRange(safePage, totalPages),
    [safePage, totalPages],
  );

  const kategoriOptions: KategoriFilter[] = [
    "Semua",
    "Hotel",
    "Restaurant",
    "Hiburan & Kesenian",
    "Jasa Parkir",
  ];

  async function getAllRowsForPdf() {
    const result = await getWajibPajakList({
      search: q.trim(),
      kategori,
      page: 1,
      pageSize: 1000,
    });

    return result.items;
  }

  async function handleDownloadDeviceInfo() {
    try {
      const rows = await getAllRowsForPdf();
      downloadPerangkatWajibPajakPdf(rows);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Gagal mengunduh PDF informasi perangkat.",
      );
    }
  }

  async function handleDownloadWajibPajak() {
    try {
      const rows = await getAllRowsForPdf();
      downloadWajibPajakPdf(rows);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Gagal mengunduh PDF daftar wajib pajak.",
      );
    }
  }

  return (
    <div
      className="-m-6 min-h-[calc(100vh-0px)] font-sans flex flex-col"
      style={{ backgroundColor: THEME.pageBg, color: THEME.text }}
    >
      <header
        className="w-full"
        style={{
          backgroundColor: THEME.headerBg,
          borderBottom: `1px solid ${THEME.headerBorder}`,
        }}
      >
        <div className="px-6 md:px-8 py-6 md:py-7 flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              backgroundColor: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.14)",
            }}
          >
            <img
              src="/images/Logo.png"
              alt="Logo Kabupaten Aceh Tengah"
              className="w-8 h-8 object-contain"
            />
          </div>

          <div className="min-w-0">
            <div
              className="text-white text-2xl md:text-[30px] leading-none truncate"
              style={{ fontWeight: 700 }}
            >
              {BRAND.title}
            </div>
            <div className="text-white/80 text-sm mt-1">{BRAND.subtitle}</div>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 md:px-6 py-4 flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-stretch">
          {(["total", "hotel", "restaurant", "hiburan", "parkir"] as const).map(
            (kind) => {
              const style = statStyle(kind);
              const value = counts[kind];

              return (
                <SummaryCard
                  key={kind}
                  label={style.label}
                  value={value}
                  icon={style.icon}
                  iconBg={style.iconBg}
                  iconColor={style.iconColor}
                  barBg={style.barBg}
                  barFg={style.barFg}
                />
              );
            },
          )}
        </div>

        <div
          className="bg-white rounded-2xl shadow-sm overflow-visible"
          style={{ border: `1px solid ${THEME.border}` }}
        >
          <div className="px-5 py-4">
            <div className="flex flex-col xl:flex-row xl:items-center gap-3">
              <div className="w-full xl:flex-1">
                <div className="relative w-full">
                  <Search
                    className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: THEME.muted }}
                  />
                  <input
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Cari NPWPD, Nama Usaha, Tipe Usaha..."
                    className="w-full bg-slate-50 rounded-xl pl-10 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    style={{
                      border: `1px solid ${THEME.border}`,
                      color: THEME.text,
                    }}
                  />
                </div>
              </div>

              <div className="w-full xl:w-59">
                <div className="relative" ref={kategoriRef}>
                  <button
                    type="button"
                    onClick={() => setOpenKategori((v) => !v)}
                    className="w-full inline-flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border bg-white hover:bg-slate-50 transition text-sm"
                    style={{
                      borderColor: THEME.border,
                      color: THEME.text,
                    }}
                  >
                    <span className="truncate">
                      {kategori === "Semua" ? "Semua Kategori" : kategori}
                    </span>
                    <ChevronDown
                      className="w-4 h-4 transition-transform shrink-0"
                      style={{
                        color: THEME.muted,
                        transform: openKategori
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                      }}
                    />
                  </button>

                  {openKategori && (
                    <div
                      className="absolute left-0 top-full mt-2 rounded-2xl bg-white z-50 overflow-hidden"
                      style={{
                        width: "100%",
                        border: `1px solid ${THEME.border}`,
                        boxShadow: "0 18px 40px rgba(15, 23, 42, 0.12)",
                      }}
                    >
                      {kategoriOptions.map((item, index) => {
                        const selected = item === kategori;

                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              setKategori(item);
                              setPage(1);
                              setOpenKategori(false);
                            }}
                            className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 transition"
                            style={{
                              color: selected ? THEME.accent : THEME.text,
                              fontWeight: selected ? 600 : 400,
                              backgroundColor: selected
                                ? "rgba(30,99,214,0.06)"
                                : "#FFFFFF",
                              borderBottom:
                                index === kategoriOptions.length - 1
                                  ? "none"
                                  : `1px solid ${THEME.border}`,
                            }}
                          >
                            {item === "Semua" ? "Semua Kategori" : item}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 xl:ml-auto">
                <div className="relative" ref={unduhRef}>
                  <button
                    type="button"
                    onClick={() => setOpenUnduh((v) => !v)}
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border bg-white hover:bg-slate-50 transition text-sm"
                    style={{
                      borderColor: THEME.border,
                      color: THEME.text,
                      minWidth: 140,
                    }}
                  >
                    <Download
                      className="w-4 h-4"
                      style={{ color: THEME.muted }}
                    />
                    Unduh
                    <ChevronDown
                      className="w-4 h-4 transition-transform"
                      style={{
                        color: THEME.muted,
                        transform: openUnduh
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                      }}
                    />
                  </button>

                  {openUnduh && (
                    <div
                      className="absolute right-0 top-full mt-2 rounded-2xl bg-white z-50 overflow-hidden"
                      style={{
                        width: 320,
                        border: `1px solid ${THEME.border}`,
                        boxShadow: "0 18px 40px rgba(15, 23, 42, 0.12)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          void handleDownloadDeviceInfo();
                          setOpenUnduh(false);
                        }}
                        className="w-full text-left px-4 py-3.5 hover:bg-slate-50 transition"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ backgroundColor: "#EEF2FF" }}
                          >
                            <HardDrive
                              className="w-5 h-5"
                              style={{ color: "#4F46E5" }}
                            />
                          </div>
                          <div>
                            <div className="text-sm font-semibold">
                              Informasi Data Perangkat
                            </div>
                            <div className="text-xs mt-1 text-slate-500">
                              Unduh laporan perangkat PDF
                            </div>
                          </div>
                        </div>
                      </button>

                      <div
                        style={{ height: 1, backgroundColor: THEME.border }}
                      />

                      <button
                        type="button"
                        onClick={() => {
                          void handleDownloadWajibPajak();
                          setOpenUnduh(false);
                        }}
                        className="w-full text-left px-4 py-3.5 hover:bg-slate-50 transition"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ backgroundColor: "#DBEAFE" }}
                          >
                            <Users
                              className="w-5 h-5"
                              style={{ color: "#1D4ED8" }}
                            />
                          </div>
                          <div>
                            <div className="text-sm font-semibold">
                              Informasi Data Wajib Pajak
                            </div>
                            <div className="text-xs mt-1 text-slate-500">
                              Unduh daftar wajib pajak PDF
                            </div>
                          </div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition text-sm hover:-translate-y-0.5"
                  style={{
                    backgroundColor: THEME.accent,
                    color: "#FFFFFF",
                    border: "1px solid rgba(30,99,214,0.35)",
                    boxShadow: "0 12px 26px rgba(30,99,214,0.18)",
                    fontWeight: 600,
                  }}
                  onClick={() => navigate("/wajib-pajak/tambah")}
                >
                  <Plus className="w-4 h-4" />
                  Tambah Wajib Pajak
                </button>
              </div>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <Table aria-label="Daftar Wajib Pajak" removeWrapper>
              <TableHeader>
                <TableColumn className="bg-transparent text-slate-500 font-extrabold text-[11px] uppercase text-center w-16">
                  No
                </TableColumn>
                <TableColumn className="bg-transparent text-slate-500 font-extrabold text-[11px] uppercase text-center min-w-64">
                  NPWPD
                </TableColumn>
                <TableColumn className="bg-transparent text-slate-500 font-extrabold text-[11px] uppercase text-left min-w-72">
                  Nama Usaha
                </TableColumn>
                <TableColumn className="bg-transparent text-slate-500 font-extrabold text-[11px] uppercase text-center min-w-48">
                  Kategori
                </TableColumn>
                <TableColumn className="bg-transparent text-slate-500 font-extrabold text-[11px] uppercase text-center min-w-40">
                  Jenis POS
                </TableColumn>
                <TableColumn className="bg-transparent text-slate-500 font-extrabold text-[11px] uppercase text-center w-32">
                  Aksi
                </TableColumn>
              </TableHeader>

              <TableBody>
                {pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <div className="flex flex-col items-center justify-center py-14 text-slate-400">
                        <span className="text-sm font-semibold">
                          Data tidak ditemukan
                        </span>
                        <span className="text-xs mt-1">
                          Coba ubah filter atau kata kunci pencarian
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((r, idx) => {
                    const t = tipeChipStyle(r.tipeUsaha);
                    const p = posChipStyle(r.jenisPOS);

                    return (
                      <TableRow
                        key={String(r.id)}
                        className="border-b border-slate-50 last:border-none hover:bg-slate-50 transition-colors"
                      >
                        <TableCell className="text-center px-4 py-4">
                          {(safePage - 1) * pageSize + idx + 1}
                        </TableCell>

                        <TableCell className="text-center px-4 py-4">
                          <span className="font-semibold tracking-wider">
                            {r.npwpd}
                          </span>
                        </TableCell>

                        <TableCell className="text-left px-4 py-4">
                          <span className="font-semibold">{r.namaUsaha}</span>
                        </TableCell>

                        <TableCell className="text-center px-4 py-4">
                          <Chip
                            size="sm"
                            variant="flat"
                            className="text-xs px-3 py-1"
                            style={{
                              backgroundColor: t.bg,
                              color: t.fg,
                              fontWeight: 600,
                            }}
                          >
                            {r.tipeUsaha}
                          </Chip>
                        </TableCell>

                        <TableCell className="text-center px-4 py-4">
                          <Chip
                            size="sm"
                            variant="flat"
                            className="text-xs px-3 py-1"
                            style={{
                              backgroundColor: p.bg,
                              color: p.fg,
                              fontWeight: 600,
                            }}
                          >
                            {r.jenisPOS}
                          </Chip>
                        </TableCell>

                        <TableCell className="text-center px-4 py-4">
                          <div className="flex items-center justify-center gap-4">
                            <button
                              type="button"
                              className="w-9 h-9 rounded-xl flex items-center justify-center border hover:bg-slate-50 transition"
                              style={{ borderColor: THEME.border }}
                              title="Lihat"
                              onClick={() => navigate(`/wajib-pajak/${r.id}`)}
                            >
                              <Eye
                                className="w-4 h-4"
                                style={{ color: THEME.accent }}
                              />
                            </button>

                            <button
                              type="button"
                              className="w-9 h-9 rounded-xl flex items-center justify-center border hover:bg-rose-50 transition"
                              style={{ borderColor: THEME.border }}
                              title="Hapus"
                              onClick={() => {
                                const ok = confirm(`Hapus "${r.namaUsaha}"?`);
                                if (!ok) return;

                                void (async () => {
                                  try {
                                    await deleteWajibPajak(r.id);
                                    setReloadKey((value) => value + 1);
                                  } catch (error) {
                                    alert(
                                      error instanceof Error
                                        ? error.message
                                        : "Gagal menghapus data.",
                                    );
                                  }
                                })();
                              }}
                            >
                              <Trash2
                                className="w-4 h-4"
                                style={{ color: "#EF4444" }}
                              />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="text-sm" style={{ color: THEME.muted }}>
              Menampilkan <b style={{ color: THEME.text }}>{showingStart}</b>
              {" - "}
              <b style={{ color: THEME.text }}>{showingEnd}</b> dari{" "}
              <b style={{ color: THEME.text }}>{totalItems}</b> data
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                className="w-10 h-10 rounded-xl border bg-white hover:bg-slate-50 transition"
                style={{ borderColor: THEME.border }}
                onClick={() => setPage((p) => clamp(p - 1, 1, totalPages))}
                disabled={safePage <= 1}
              >
                {"<"}
              </button>

              {start > 1 && (
                <>
                  <button
                    type="button"
                    className="w-10 h-10 rounded-xl border bg-white"
                    style={{ borderColor: THEME.border }}
                    onClick={() => setPage(1)}
                  >
                    1
                  </button>
                  <span className="px-1 text-slate-400">…</span>
                </>
              )}

              {pages.map((p) => {
                const active = p === safePage;

                return (
                  <button
                    type="button"
                    key={p}
                    className="w-10 h-10 rounded-xl border transition"
                    style={{
                      borderColor: THEME.border,
                      backgroundColor: active ? "rgba(30,99,214,0.10)" : "#fff",
                      color: active ? THEME.accent : THEME.text,
                      fontWeight: 600,
                    }}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                );
              })}

              {end < totalPages && (
                <>
                  <span className="px-1 text-slate-400">…</span>
                  <button
                    type="button"
                    className="w-10 h-10 rounded-xl border bg-white"
                    style={{ borderColor: THEME.border }}
                    onClick={() => setPage(totalPages)}
                  >
                    {totalPages}
                  </button>
                </>
              )}

              <button
                type="button"
                className="w-10 h-10 rounded-xl border bg-white hover:bg-slate-50 transition"
                style={{ borderColor: THEME.border }}
                onClick={() => setPage((p) => clamp(p + 1, 1, totalPages))}
                disabled={safePage >= totalPages}
              >
                {">"}
              </button>
            </div>
          </div>
        </div>

        <div
          className="pt-1 text-center text-xs"
          style={{ color: THEME.muted }}
        >
          ©️ {new Date().getFullYear()} {BRAND.subtitle} • PT. Biner Teknologi
          Indonesia
        </div>
      </div>
    </div>
  );
}
