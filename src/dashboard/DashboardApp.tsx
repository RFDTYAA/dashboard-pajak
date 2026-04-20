import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
import { ChevronDown } from "lucide-react";
import { getDashboardOverview } from "../services/dashboard";
import {
  createEmptyDashboardOverview,
  normalizeBulan,
  normalizeDashboardKategori,
  normalizeJenisPOS,
  normalizeNpwpd,
} from "../types/domain";
import type {
  DashboardKategori as Kategori,
  DashboardOverviewResponse,
  DashboardRevenueItem as PendapatanRow,
  DashboardTopPayerItem as TopPembayarRaw,
  JenisPOS,
  JenisPOSFilter,
  KategoriFilter,
} from "../types/domain";

type TopPembayarRow = {
  id: number | string;
  npwpd: string;
  tipeUsaha: Kategori;
  namaUsaha: string;
  jenisPOS: Exclude<JenisPOS, "Semua">;
  pendapatanKotor: number;
  bulan: string;
  tahun: string;
};

type ChartAll = {
  bulan: string;
  Restaurant: number;
  Hotel: number;
  "Hiburan & Kesenian": number;
};

type ChartSingle = {
  bulan: string;
  total: number;
};

type ChartTren = {
  bulan: string;
  total: number;
};

const BRAND = {
  title: "Dashboard Sistem Monitoring Pajak Daerah",
  subtitle: "Kabupaten Aceh Tengah",
};

const THEME = {
  pageBg: "#F2F7FF",
  headerBg: "#0B2E6B",
  headerBorder: "rgba(255,255,255,0.14)",
  accent: "#1E63D6",
  border: "rgba(15, 23, 42, 0.10)",
  muted: "#64748B",
  text: "#0F172A",
};

const BULAN_ORDER = [
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

const DEFAULT_YEAR_OPTIONS = [
  String(new Date().getFullYear()),
  String(new Date().getFullYear() - 1),
  String(new Date().getFullYear() - 2),
] as const;

const KATEGORI_LIST: Kategori[] = ["Restaurant", "Hotel", "Hiburan & Kesenian"];

const kategoriColor: Record<Kategori, string> = {
  Restaurant: "#3B82F6",
  Hotel: "#F59E0B",
  "Hiburan & Kesenian": "#10B981",
};

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

const normalizeKategori = (value: string): Kategori =>
  normalizeDashboardKategori(value);

const normalizePOS = (value: string | undefined): Exclude<JenisPOS, "Semua"> =>
  normalizeJenisPOS(value);

const padNPWPD = (idLike: number | string | undefined) =>
  normalizeNpwpd(idLike);

const kategoriChipStyle = (k: Kategori) => {
  if (k === "Restaurant") return { bg: "#DBEAFE", fg: "#1D4ED8" };
  if (k === "Hotel") return { bg: "#FEF3C7", fg: "#B45309" };
  return { bg: "#DCFCE7", fg: "#047857" };
};

const posChipStyle = (pos: Exclude<JenisPOS, "Semua">) => {
  if (pos === "Tab") return { bg: "#E0F2FE", fg: "#0369A1" };
  return { bg: "#F1F5F9", fg: "#0F172A" };
};

const normalizeTopPembayar = (
  raw: TopPembayarRaw,
  idx: number,
): TopPembayarRow => {
  const id = raw.id ?? idx + 1;
  const bulan = normalizeBulan(String(raw.bulan ?? "Januari"));
  const tahun = String(raw.tahun ?? DEFAULT_YEAR_OPTIONS[0]);

  const tipe = raw.tipeUsaha ?? raw.kategori ?? "Restaurant";
  const nama = raw.namaUsaha ?? raw.nama ?? "Nama Usaha";

  const pendapatan =
    typeof raw.pendapatanKotor === "number"
      ? raw.pendapatanKotor
      : typeof raw.jumlah === "number"
        ? raw.jumlah
        : 0;

  return {
    id,
    npwpd: raw.npwpd ? normalizeNpwpd(raw.npwpd) : padNPWPD(id),
    tipeUsaha: normalizeKategori(String(tipe)),
    namaUsaha: String(nama),
    jenisPOS: normalizePOS(raw.jenisPOS ?? raw.jenisPOC),
    pendapatanKotor: pendapatan,
    bulan,
    tahun,
  };
};

function CustomSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (ref.current && !ref.current.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="w-full" ref={ref}>
      <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wide mb-1">
        {label}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full inline-flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border bg-white hover:bg-slate-50 transition text-sm"
          style={{
            borderColor: THEME.border,
            color: THEME.text,
            fontWeight: 400,
          }}
        >
          <span className="truncate">{value}</span>
          <ChevronDown
            className="w-4 h-4 transition-transform shrink-0"
            style={{
              color: THEME.muted,
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </button>

        {open && (
          <div
            className="absolute left-0 top-full mt-2 rounded-2xl bg-white z-50 overflow-hidden"
            style={{
              width: "100%",
              border: `1px solid ${THEME.border}`,
              boxShadow: "0 18px 40px rgba(15, 23, 42, 0.12)",
            }}
          >
            {options.map((item, index) => {
              const selected = item === value;

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    onChange(item);
                    setOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 transition"
                  style={{
                    color: selected ? THEME.accent : THEME.text,
                    fontWeight: selected ? 500 : 400,
                    backgroundColor: selected
                      ? "rgba(30,99,214,0.06)"
                      : "#FFFFFF",
                    borderBottom:
                      index === options.length - 1
                        ? "none"
                        : `1px solid ${THEME.border}`,
                  }}
                >
                  {item}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardApp() {
  const navigate = useNavigate();

  const [bulanFilter, setBulanFilter] =
    useState<(typeof BULAN_ORDER)[number]>("Januari");
  const [tahunOptions, setTahunOptions] = useState<string[]>(() => [
    ...DEFAULT_YEAR_OPTIONS,
  ]);
  const [tahunFilter, setTahunFilter] = useState<string>(
    () => DEFAULT_YEAR_OPTIONS[0],
  );
  const [kategoriFilter, setKategoriFilter] = useState<KategoriFilter>("Semua");
  const [jenisPOSFilter, setJenisPOSFilter] = useState<JenisPOSFilter>("Semua");
  const [overview, setOverview] = useState<DashboardOverviewResponse>(() =>
    createEmptyDashboardOverview(),
  );

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;

    const run = async () => {
      try {
        const response = await getDashboardOverview(
          {
            bulan: bulanFilter,
            tahun: tahunFilter,
            kategori: kategoriFilter,
            jenisPOS: jenisPOSFilter,
          },
          controller.signal,
        );

        if (!alive) return;

        if (response.availableYears && response.availableYears.length > 0) {
          setTahunOptions(response.availableYears);

          if (!response.availableYears.includes(tahunFilter)) {
            setTahunFilter(response.availableYears[0]);
            return;
          }
        }

        setOverview(response);
      } catch {
        if (!alive || controller.signal.aborted) return;
        setOverview(createEmptyDashboardOverview());
      }
    };

    void run();

    return () => {
      alive = false;
      controller.abort();
    };
  }, [bulanFilter, tahunFilter, kategoriFilter, jenisPOSFilter]);

  const chartPendapatan = useMemo(() => {
    const rows = (overview.revenueByMonth as PendapatanRow[]).filter(
      (r) => r.tahun === tahunFilter,
    );

    const mapped = rows.map((r) => ({
      ...r,
      kategori: normalizeKategori(String(r.kategori)),
      bulan: normalizeBulan(r.bulan),
    })) as Array<{
      bulan: string;
      total: number;
      tahun: string;
      kategori: Kategori;
    }>;

    if (kategoriFilter === "Semua") {
      const base = new Map<string, ChartAll>(
        BULAN_ORDER.map((b) => [
          b,
          { bulan: b, Restaurant: 0, Hotel: 0, "Hiburan & Kesenian": 0 },
        ]),
      );

      for (const r of mapped) {
        if (!base.has(r.bulan)) continue;
        base.get(r.bulan)![r.kategori] += r.total;
      }

      return BULAN_ORDER.map((b) => base.get(b)!);
    }

    const baseSingle = new Map<string, ChartSingle>(
      BULAN_ORDER.map((b) => [b, { bulan: b, total: 0 }]),
    );

    for (const r of mapped) {
      if (r.kategori !== kategoriFilter) continue;
      if (!baseSingle.has(r.bulan)) continue;
      baseSingle.get(r.bulan)!.total += r.total;
    }

    return BULAN_ORDER.map((b) => baseSingle.get(b)!);
  }, [overview.revenueByMonth, tahunFilter, kategoriFilter]);

  const chartTren: ChartTren[] = useMemo(() => {
    if (kategoriFilter === "Semua") {
      return (chartPendapatan as ChartAll[]).map((d) => ({
        bulan: d.bulan,
        total: d.Restaurant + d.Hotel + d["Hiburan & Kesenian"],
      }));
    }

    return (chartPendapatan as ChartSingle[]).map((d) => ({
      bulan: d.bulan,
      total: d.total,
    }));
  }, [chartPendapatan, kategoriFilter]);

  const ringkasanBulan = overview.summary;

  const normalizedTop = useMemo(() => {
    return (overview.topPayers as TopPembayarRaw[]).map((row, index) =>
      normalizeTopPembayar(row, index),
    );
  }, [overview.topPayers]);

  const filteredTop = useMemo(() => {
    const rows = normalizedTop.filter((item) => {
      const matchBulan = item.bulan === bulanFilter;
      const matchTahun = item.tahun === tahunFilter;
      const matchKategori =
        kategoriFilter === "Semua" ? true : item.tipeUsaha === kategoriFilter;
      const matchJenisPOS =
        jenisPOSFilter === "Semua" ? true : item.jenisPOS === jenisPOSFilter;

      return matchBulan && matchTahun && matchKategori && matchJenisPOS;
    });

    return rows
      .sort((a, b) => b.pendapatanKotor - a.pendapatanKotor)
      .slice(0, 10);
  }, [normalizedTop, bulanFilter, tahunFilter, kategoriFilter, jenisPOSFilter]);

  const topRows = useMemo(() => {
    return filteredTop.map((u, idx) => {
      const pajakTerhitung = Math.round(u.pendapatanKotor * 0.1);
      return { ...u, no: idx + 1, pajakTerhitung };
    });
  }, [filteredTop]);

  const periodeLabel = `${bulanFilter} ${tahunFilter}`;

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
            <div
              className="text-white/80 text-sm mt-1"
              style={{ fontWeight: 400 }}
            >
              {BRAND.subtitle}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 md:px-6 py-4 flex flex-col gap-6">
        <div
          className="bg-white rounded-3xl shadow-sm p-5 md:p-6"
          style={{ border: `1px solid ${THEME.border}` }}
        >
          <div className="text-lg font-extrabold text-slate-800 mb-4">
            Filter Periode & Kategori
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end gap-3">
            <div className="flex items-end gap-3 flex-1">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mb-px"
                style={{
                  backgroundColor: "rgba(30,99,214,0.06)",
                  border: `1px solid ${THEME.border}`,
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  style={{ color: THEME.muted }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 flex-1">
                <CustomSelect
                  label="Periode Bulan"
                  value={bulanFilter}
                  options={BULAN_ORDER}
                  onChange={setBulanFilter}
                />
                <CustomSelect
                  label="Periode Tahun"
                  value={tahunFilter}
                  options={tahunOptions}
                  onChange={setTahunFilter}
                />
              </div>
            </div>

            <div className="flex-1">
              <CustomSelect
                label="Jenis POS"
                value={jenisPOSFilter}
                options={["Semua", "Tab", "T-107"]}
                onChange={setJenisPOSFilter}
              />
            </div>

            <div className="flex-1">
              <CustomSelect
                label="Kategori Pajak"
                value={kategoriFilter}
                options={["Semua", ...KATEGORI_LIST]}
                onChange={setKategoriFilter}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <Card className="col-span-12 md:col-span-6 lg:col-span-3 border-none shadow-xl shadow-slate-200/50 rounded-3xl">
            <CardBody className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-slate-500 text-sm font-semibold h-10 flex items-end">
                    Total Pajak Restaurant ({periodeLabel})
                  </p>
                  <p className="text-slate-900 text-2xl font-extrabold leading-none h-9 flex items-end">
                    {formatRupiah(ringkasanBulan.totalRestaurant)}
                  </p>
                </div>

                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: "#DBEAFE" }}
                >
                  <span style={{ color: "#1D4ED8" }} className="text-xl">
                    🍽️
                  </span>
                </div>
              </div>

              <div
                className="mt-4 h-1 rounded-full"
                style={{ backgroundColor: "#DBEAFE" }}
              >
                <div
                  className="h-1 rounded-full"
                  style={{
                    width: "100%",
                    backgroundColor: kategoriColor.Restaurant,
                  }}
                />
              </div>
            </CardBody>
          </Card>

          <Card className="col-span-12 md:col-span-6 lg:col-span-3 border-none shadow-xl shadow-slate-200/50 rounded-3xl">
            <CardBody className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-slate-500 text-sm font-semibold h-10 flex items-end">
                    Total Pajak Hotel ({periodeLabel})
                  </p>
                  <p className="text-slate-900 text-2xl font-extrabold leading-none h-9 flex items-end">
                    {formatRupiah(ringkasanBulan.totalHotel)}
                  </p>
                </div>

                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: "#E0E7FF" }}
                >
                  <span style={{ color: "#1E3A8A" }} className="text-xl">
                    🏨
                  </span>
                </div>
              </div>

              <div
                className="mt-4 h-1 rounded-full"
                style={{ backgroundColor: "#E0E7FF" }}
              >
                <div
                  className="h-1 rounded-full"
                  style={{
                    width: "100%",
                    backgroundColor: kategoriColor.Hotel,
                  }}
                />
              </div>
            </CardBody>
          </Card>

          <Card className="col-span-12 md:col-span-6 lg:col-span-3 border-none shadow-xl shadow-slate-200/50 rounded-3xl">
            <CardBody className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-slate-500 text-sm font-semibold h-10 flex items-end">
                    Total Pajak Hiburan & Kesenian ({periodeLabel})
                  </p>
                  <p className="text-slate-900 text-2xl font-extrabold leading-none h-9 flex items-end">
                    {formatRupiah(ringkasanBulan.totalHiburan)}
                  </p>
                </div>

                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: "#EEF2FF" }}
                >
                  <span style={{ color: "#1E3A8A" }} className="text-xl">
                    🎭
                  </span>
                </div>
              </div>

              <div
                className="mt-4 h-1 rounded-full"
                style={{ backgroundColor: "#EEF2FF" }}
              >
                <div
                  className="h-1 rounded-full"
                  style={{
                    width: "100%",
                    backgroundColor: kategoriColor["Hiburan & Kesenian"],
                  }}
                />
              </div>
            </CardBody>
          </Card>

          <Card className="col-span-12 md:col-span-6 lg:col-span-3 border-none shadow-xl shadow-slate-200/50 rounded-3xl">
            <CardBody className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-slate-500 text-sm font-semibold h-10 flex items-end">
                    Total Pajak Semua ({periodeLabel})
                  </p>
                  <p className="text-slate-900 text-2xl font-extrabold leading-none h-9 flex items-end">
                    {formatRupiah(ringkasanBulan.totalSemua)}
                  </p>
                </div>

                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: "#E2E8F0" }}
                >
                  <span style={{ color: "#0F172A" }} className="text-xl">
                    📊
                  </span>
                </div>
              </div>

              <div
                className="mt-4 h-1 rounded-full"
                style={{ backgroundColor: "#E2E8F0" }}
              >
                <div
                  className="h-1 rounded-full"
                  style={{ width: "100%", backgroundColor: "#334155" }}
                />
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="grid grid-cols-12 gap-8">
          <Card className="col-span-12 border-none shadow-xl shadow-slate-200/50 rounded-3xl">
            <CardBody className="p-8">
              <div className="mb-8">
                <h3 className="text-xl font-bold text-slate-800">
                  Pendapatan Bulanan
                </h3>
                <p className="text-slate-400 text-xs">
                  Total penerimaan per tahun ({tahunFilter})
                </p>
              </div>

              <div className="h-97.5 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartPendapatan}
                    margin={{ top: 16, right: 28, left: 8, bottom: 26 }}
                    barCategoryGap="18%"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#E8EEFF"
                    />
                    <XAxis
                      dataKey="bulan"
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      angle={0}
                      textAnchor="middle"
                      height={64}
                      tickMargin={16}
                      padding={{ left: 16, right: 16 }}
                      tick={{ fill: "#64748B", fontSize: 12, fontWeight: 600 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 12 }}
                      tickFormatter={(val) => `Rp${val / 1000000}jt`}
                    />
                    <Tooltip
                      cursor={{ fill: "#F2F7FF" }}
                      formatter={(value: unknown, name: unknown) => [
                        formatRupiah(Number(value)),
                        kategoriFilter === "Semua"
                          ? String(name)
                          : "Pendapatan",
                      ]}
                      contentStyle={{
                        borderRadius: "16px",
                        border: "none",
                        boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
                      }}
                    />

                    {kategoriFilter === "Semua" && (
                      <Legend
                        verticalAlign="top"
                        align="right"
                        iconType="circle"
                        wrapperStyle={{
                          paddingBottom: 10,
                          fontSize: 12,
                          color: "#64748b",
                        }}
                      />
                    )}

                    {kategoriFilter === "Semua" ? (
                      <>
                        <Bar
                          dataKey="Restaurant"
                          stackId="a"
                          fill={kategoriColor.Restaurant}
                          radius={[0, 0, 0, 0]}
                          barSize={28}
                        />
                        <Bar
                          dataKey="Hotel"
                          stackId="a"
                          fill={kategoriColor.Hotel}
                          radius={[0, 0, 0, 0]}
                          barSize={28}
                        />
                        <Bar
                          dataKey="Hiburan & Kesenian"
                          stackId="a"
                          fill={kategoriColor["Hiburan & Kesenian"]}
                          radius={[8, 8, 0, 0]}
                          barSize={28}
                        />
                      </>
                    ) : (
                      <Bar
                        dataKey="total"
                        fill={kategoriColor[kategoriFilter]}
                        radius={[8, 8, 0, 0]}
                        barSize={28}
                      />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="grid grid-cols-12 gap-8">
          <Card className="col-span-12 border-none shadow-xl shadow-slate-200/50 rounded-3xl">
            <CardBody className="p-8">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">
                    Top 10 Pembayar Tertib
                  </h3>
                  <p className="text-slate-400 text-sm">
                    Periode: {periodeLabel} • Kategori: {kategoriFilter} • Jenis
                    POS: {jenisPOSFilter}
                  </p>
                </div>
                <div className="text-sm font-extrabold text-slate-700">
                  {topRows.length} data
                </div>
              </div>

              <div className="w-full overflow-auto rounded-2xl border border-slate-200">
                <Table
                  aria-label="Tabel Top 10 Pembayar"
                  removeWrapper
                  className={[
                    "min-w-full",
                    "**:data-[slot=thead]:sticky",
                    "**:data-[slot=thead]:top-0",
                    "**:data-[slot=thead]:z-10",
                    "**:data-[slot=thead]:bg-white",
                  ].join(" ")}
                >
                  <TableHeader>
                    <TableColumn className="bg-transparent text-slate-500 font-extrabold text-[11px] uppercase text-center min-w-16">
                      No
                    </TableColumn>
                    <TableColumn className="bg-transparent text-slate-500 font-extrabold text-[11px] uppercase text-center min-w-65">
                      NPWPD (16 Digit)
                    </TableColumn>
                    <TableColumn className="bg-transparent text-slate-500 font-extrabold text-[11px] uppercase text-center min-w-55">
                      Tipe Usaha
                    </TableColumn>
                    <TableColumn className="bg-transparent text-slate-500 font-extrabold text-[11px] uppercase text-center min-w-60">
                      Nama Usaha
                    </TableColumn>
                    <TableColumn className="bg-transparent text-slate-500 font-extrabold text-[11px] uppercase text-center min-w-42.5">
                      Jenis POS
                    </TableColumn>
                    <TableColumn className="bg-transparent text-slate-500 font-extrabold text-[11px] uppercase text-center min-w-60">
                      Total Pendapatan Kotor
                    </TableColumn>
                    <TableColumn className="bg-transparent text-slate-500 font-extrabold text-[11px] uppercase text-center min-w-60">
                      Total Pajak Terhitung
                    </TableColumn>
                  </TableHeader>

                  <TableBody>
                    {topRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <span className="text-sm font-semibold">
                              Data tidak ditemukan
                            </span>
                            <span className="text-xs mt-1">
                              Silakan ubah filter untuk melihat data
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      topRows.map((u) => {
                        const kStyle = kategoriChipStyle(u.tipeUsaha);
                        const pStyle = posChipStyle(u.jenisPOS);
                        const pajakTerhitung = Math.round(
                          u.pendapatanKotor * 0.1,
                        );

                        return (
                          <TableRow
                            key={String(u.id)}
                            className="border-b border-slate-50 last:border-none hover:bg-slate-50 transition-colors"
                          >
                            <TableCell className="text-center px-4 py-4">
                              <span className="text-slate-700 font-extrabold text-sm">
                                {u.no}
                              </span>
                            </TableCell>

                            <TableCell className="text-center px-4 py-4">
                              <span className="font-extrabold text-slate-700 tracking-wider">
                                {u.npwpd}
                              </span>
                            </TableCell>

                            <TableCell className="text-center px-4 py-4">
                              <Chip
                                size="sm"
                                variant="flat"
                                className="text-xs font-extrabold px-3 py-1"
                                style={{
                                  backgroundColor: kStyle.bg,
                                  color: kStyle.fg,
                                }}
                              >
                                {u.tipeUsaha}
                              </Chip>
                            </TableCell>

                            <TableCell className="text-center px-4 py-4">
                              <span
                                className="font-bold text-slate-700 text-sm leading-snug inline-block"
                                style={{
                                  maxWidth: 360,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                                title={u.namaUsaha}
                              >
                                {u.namaUsaha}
                              </span>
                            </TableCell>

                            <TableCell className="text-center px-4 py-4">
                              <Chip
                                size="sm"
                                variant="flat"
                                className="text-xs font-extrabold px-3 py-1"
                                style={{
                                  backgroundColor: pStyle.bg,
                                  color: pStyle.fg,
                                }}
                              >
                                {u.jenisPOS}
                              </Chip>
                            </TableCell>

                            <TableCell className="text-center px-4 py-4">
                              <Chip
                                size="sm"
                                variant="flat"
                                className="font-extrabold text-xs px-3 py-1"
                                style={{
                                  backgroundColor: "#EEF2FF",
                                  color: "#1E3A8A",
                                }}
                              >
                                {formatRupiah(u.pendapatanKotor)}
                              </Chip>
                            </TableCell>

                            <TableCell className="text-center px-4 py-4">
                              <Chip
                                size="sm"
                                variant="flat"
                                className="font-extrabold text-xs px-3 py-1"
                                style={{
                                  backgroundColor: "#DBEAFE",
                                  color: "#1E40AF",
                                }}
                              >
                                {formatRupiah(pajakTerhitung)}
                              </Chip>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="grid grid-cols-12 gap-8">
          <Card className="col-span-12 border-none shadow-xl shadow-slate-200/50 rounded-3xl">
            <CardBody className="p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">
                    Analisis Tren Pajak
                  </h3>
                  <p className="text-slate-400 text-sm">
                    Tren total pendapatan ({tahunFilter})
                  </p>
                </div>

                <button
                  onClick={() => navigate("/analisis")}
                  className="px-4 py-2 text-sm font-extrabold rounded-xl transition"
                  style={{
                    border: `2px solid ${THEME.accent}`,
                    color: THEME.accent,
                    backgroundColor: "transparent",
                  }}
                  onMouseEnter={(e) => {
                    (
                      e.currentTarget as HTMLButtonElement
                    ).style.backgroundColor = "rgba(30,99,214,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    (
                      e.currentTarget as HTMLButtonElement
                    ).style.backgroundColor = "transparent";
                  }}
                >
                  Lihat Detail
                </button>
              </div>

              <div className="h-87.5">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartTren}
                    margin={{ top: 16, right: 36, left: 20, bottom: 28 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#E8EEFF"
                    />
                    <XAxis
                      dataKey="bulan"
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      angle={0}
                      textAnchor="middle"
                      height={66}
                      tickMargin={16}
                      padding={{ left: 28, right: 28 }}
                      tick={{ fill: "#64748B", fontSize: 12, fontWeight: 600 }}
                    />
                    <YAxis hide />
                    <Tooltip
                      formatter={(value: unknown) => [
                        formatRupiah(Number(value)),
                        "Total",
                      ]}
                      contentStyle={{
                        borderRadius: "16px",
                        border: "none",
                        boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke={THEME.accent}
                      strokeWidth={5}
                      dot={{
                        r: 6,
                        fill: THEME.accent,
                        strokeWidth: 3,
                        stroke: "#fff",
                      }}
                      activeDot={{ r: 8, strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        </div>

        <div
          className="pt-2 text-center text-xs"
          style={{ color: THEME.muted }}
        >
          © {new Date().getFullYear()} {BRAND.subtitle} • PT. Biner Teknologi
          Indonesia
        </div>
      </div>
    </div>
  );
}
