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
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Select,
  SelectItem,
} from "@heroui/react";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ChevronDown,
  Download,
  Eye,
  Search,
  Wallet,
  Coins,
} from "lucide-react";
import { apiRequest } from "../lib/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type RawTransaction = Record<string, unknown>;

type ReportRow = {
  id: string;
  nama: string;
  kategori: string;
  jumlahTransaksi: number;
  totalPendapatanPajak: number;
  totalPajak: number;
};

type SortKey =
  | "highestRevenue"
  | "lowestRevenue"
  | "highestTax"
  | "mostTransactions"
  | "nameAsc";

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
  title: "Laporan Transaksi Wajib Pajak",
  subtitle: "Daftar transaksi seluruh wajib pajak.",
};

const PAGE_SIZE = 10;

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "highestRevenue", label: "Pendapatan Tertinggi" },
  { key: "lowestRevenue", label: "Pendapatan Terendah" },
  { key: "highestTax", label: "Pajak Tertinggi" },
  { key: "mostTransactions", label: "Transaksi Terbanyak" },
  { key: "nameAsc", label: "Nama A-Z" },
];

const KATEGORI_OPTIONS = [
  { key: "semua", label: "Semua Kategori" },
  { key: "restoran", label: "Restaurant (Restoran)" },
  { key: "hotel", label: "Hotel" },
  { key: "hiburan", label: "Hiburan & Kesenian" },
  { key: "parkir", label: "Jasa Parkir" },
];

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

function getObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
}

function getArrayFromResponse(response: unknown): RawTransaction[] {
  const root = getObject(response);
  if (!root) return [];

  if (Array.isArray(root.data)) return root.data as RawTransaction[];
  if (Array.isArray(root.items)) return root.items as RawTransaction[];
  if (Array.isArray(root.rows)) return root.rows as RawTransaction[];

  const dataObj = getObject(root.data);

  if (dataObj) {
    if (Array.isArray(dataObj.data)) return dataObj.data as RawTransaction[];
    if (Array.isArray(dataObj.items)) return dataObj.items as RawTransaction[];
    if (Array.isArray(dataObj.rows)) return dataObj.rows as RawTransaction[];
  }

  return [];
}

function getTaxPayer(item: RawTransaction) {
  return getObject(item.tax_payer) ?? getObject(item.taxPayer);
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

function getNamaWajibPajak(item: RawTransaction) {
  const taxPayer = getTaxPayer(item);

  return (
    getString(taxPayer?.business_name) ||
    getString(taxPayer?.businessName) ||
    getString(taxPayer?.namaUsaha) ||
    getString(item.business_name) ||
    getString(item.businessName) ||
    getString(item.namaUsaha) ||
    getString(item.nama) ||
    "Nama Wajib Pajak"
  );
}

function getWajibPajakId(item: RawTransaction) {
  const taxPayer = getTaxPayer(item);

  return (
    getString(taxPayer?.id) ||
    getString(item.taxpayer_id) ||
    getString(item.taxPayerId) ||
    getString(item.tax_payer_id) ||
    getString(item.id) ||
    getNamaWajibPajak(item)
  );
}

function getKategori(item: RawTransaction) {
  const taxPayer = getTaxPayer(item);
  return (
    getString(taxPayer?.category) ||
    getString(taxPayer?.kategori) ||
    getString(item.category) ||
    getString(item.kategori) ||
    "-"
  );
}

function getPendapatan(item: RawTransaction) {
  return (
    getNumber(item.transaction_amount) ||
    getNumber(item.transactionAmount) ||
    getNumber(item.pendapatanKotor) ||
    getNumber(item.amount) ||
    getNumber(item.jumlah) ||
    0
  );
}

function getPajak(item: RawTransaction) {
  return (
    getNumber(item.tax) ||
    getNumber(item.pajak) ||
    getNumber(item.total_tax) ||
    getNumber(item.totalTax) ||
    Math.round(getPendapatan(item) * 0.1)
  );
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatTanggalIndonesia(value: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function isDateInRange(dateValue: string, start: string, end: string) {
  const date = new Date(dateValue);
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T23:59:59`);

  if (Number.isNaN(date.getTime())) return false;

  return date >= startDate && date <= endDate;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
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

  for (let page = start; page <= end; page++) {
    pages.push(page);
  }

  return { start, end, pages };
}

function SummaryCard({
  label,
  title,
  value,
  sub,
  icon,
  iconBg,
  iconColor,
}: {
  label: string;
  title: string;
  value?: string;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Card className="h-full border-none rounded-2xl bg-white shadow-md shadow-slate-200/60">
      <CardBody className="p-5 h-full">
        <div className="flex items-start justify-between gap-4 h-full">
          <div className="min-w-0 flex flex-col h-full flex-1">
            <p className="text-[11px] uppercase tracking-wide font-extrabold text-slate-500 shrink-0 truncate">
              {label}
            </p>

            <div className="flex-1 flex flex-col justify-center py-1 min-w-0">
              <h3 className="text-lg font-extrabold text-slate-900 truncate">
                {title}
              </h3>

              {value && (
                <p
                  className="mt-1 text-sm font-bold truncate"
                  style={{ color: iconColor }}
                >
                  {value}
                </p>
              )}
            </div>

            {sub && (
              <p className="text-xs text-slate-400 font-semibold shrink-0 mt-auto truncate">
                {sub}
              </p>
            )}
          </div>

          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: iconBg, color: iconColor }}
          >
            {icon}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export default function Laporan() {
  const [transactions, setTransactions] = useState<RawTransaction[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("highestRevenue");
  const [openSort, setOpenSort] = useState(false);
  const [page, setPage] = useState(1);

  // State untuk Pop-up Modal Unduh
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("semua");
  const [exportFormat, setExportFormat] = useState<string>("pdf");

  const today = new Date();
  const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayThisMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
  );

  const [startDate, setStartDate] = useState(
    formatDateInput(firstDayThisMonth),
  );
  const [endDate, setEndDate] = useState(formatDateInput(lastDayThisMonth));

  const sortRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (sortRef.current && !sortRef.current.contains(target)) {
        setOpenSort(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;

    async function loadData() {
      try {
        const response = await apiRequest<unknown>("/transaction", {
          query: {
            page: 1,
            size: 1000,
          },
          signal: controller.signal,
        });

        if (!alive) return;

        setTransactions(getArrayFromResponse(response));
      } catch {
        if (!alive || controller.signal.aborted) return;
        setTransactions([]);
      }
    }

    void loadData();

    return () => {
      alive = false;
      controller.abort();
    };
  }, []);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((item) =>
      isDateInRange(getTransactionDate(item), startDate, endDate),
    );
  }, [transactions, startDate, endDate]);

  const rows = useMemo<ReportRow[]>(() => {
    const map = new Map<string, ReportRow>();

    for (const item of filteredTransactions) {
      const id = getWajibPajakId(item);
      const nama = getNamaWajibPajak(item);
      const kategori = getKategori(item);
      const pendapatan = getPendapatan(item);
      const pajak = getPajak(item);
      const totalPendapatanPajak = pendapatan + pajak;

      const existing = map.get(id);

      if (existing) {
        existing.jumlahTransaksi += 1;
        existing.totalPendapatanPajak += totalPendapatanPajak;
        existing.totalPajak += pajak;
      } else {
        map.set(id, {
          id,
          nama,
          kategori,
          jumlahTransaksi: 1,
          totalPendapatanPajak,
          totalPajak: pajak,
        });
      }
    }

    const keyword = search.trim().toLowerCase();

    const result = Array.from(map.values()).filter((item) =>
      keyword ? item.nama.toLowerCase().includes(keyword) : true,
    );

    result.sort((a, b) => {
      if (sortBy === "lowestRevenue") {
        return a.totalPendapatanPajak - b.totalPendapatanPajak;
      }

      if (sortBy === "highestTax") {
        return b.totalPajak - a.totalPajak;
      }

      if (sortBy === "mostTransactions") {
        return b.jumlahTransaksi - a.jumlahTransaksi;
      }

      if (sortBy === "nameAsc") {
        return a.nama.localeCompare(b.nama);
      }

      return b.totalPendapatanPajak - a.totalPendapatanPajak;
    });

    return result;
  }, [filteredTransactions, search, sortBy]);

  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = clamp(page, 1, totalPages);

  const pageRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, safePage]);

  const showingStart = totalItems === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const showingEnd = Math.min(safePage * PAGE_SIZE, totalItems);

  const pagination = useMemo(
    () => paginationRange(safePage, totalPages),
    [safePage, totalPages],
  );

  const recap = useMemo(() => {
    const highest = rows[0];
    const lowest = [...rows].sort(
      (a, b) => a.totalPendapatanPajak - b.totalPendapatanPajak,
    )[0];

    const totalPendapatanPajak = rows.reduce(
      (sum, item) => sum + item.totalPendapatanPajak,
      0,
    );

    const totalPajak = rows.reduce((sum, item) => sum + item.totalPajak, 0);

    return {
      highest,
      lowest,
      totalPendapatanPajak,
      totalPajak,
    };
  }, [rows]);

  const sortLabel =
    SORT_OPTIONS.find((item) => item.key === sortBy)?.label ??
    "Urutkan Berdasarkan";

  // FUNGSI UTAMA UNDUH
  function executeDownload() {
    let dataToExport = rows;

    // 1. Filter Kategori
    if (selectedCategory !== "semua") {
      dataToExport = rows.filter((r) => {
        const cat = r.kategori.toLowerCase();
        if (selectedCategory === "restoran")
          return cat.includes("restoran") || cat.includes("restaurant");
        if (selectedCategory === "hotel") return cat.includes("hotel");
        if (selectedCategory === "hiburan")
          return cat.includes("hiburan") || cat.includes("kesenian");
        if (selectedCategory === "parkir") return cat.includes("parkir");
        return true;
      });
    }

    if (exportFormat === "csv") {
      // PROSES DOWNLOAD CSV
      const header = [
        "No",
        "Nama",
        "Jumlah Transaksi",
        "Total Pendapatan + Pajak",
        "Total Pajak",
      ];
      const body = dataToExport.map((item, index) => [
        index + 1,
        item.nama,
        item.jumlahTransaksi,
        item.totalPendapatanPajak,
        item.totalPajak,
      ]);

      const csvContent = [header, ...body]
        .map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
        )
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `laporan-transaksi-${startDate}-sampai-${endDate}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      // PROSES DOWNLOAD PDF MODERN (DASHBOARD STYLE)
      const doc = new jsPDF("p", "mm", "a4");

      // HEADER
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("PEMERINTAH KABUPATEN ACEH TENGAH", 105, 16, {
        align: "center",
      });
      doc.setFontSize(12);
      doc.text("BADAN PENGELOLAAN KEUANGAN DAERAH", 105, 22, {
        align: "center",
      });

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(
        "Pusat Perkantoran Pemerintah Kab. Aceh Tengah, Takengon",
        105,
        27,
        { align: "center" },
      );

      // GARIS PEMISAH HEADER
      doc.setLineWidth(0.5);
      doc.line(14, 31, 196, 31);

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("LAPORAN RINGKASAN TRANSAKSI WAJIB PAJAK", 105, 41, {
        align: "center",
      });

      const selectedLabel =
        KATEGORI_OPTIONS.find((k) => k.key === selectedCategory)?.label ?? "-";

      // INFO LAPORAN
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Periode Transaksi", 14, 51);
      doc.text(
        `: ${formatTanggalIndonesia(startDate)} - ${formatTanggalIndonesia(endDate)}`,
        45,
        51,
      );
      doc.text("Kategori Usaha", 14, 56);
      doc.text(`: ${selectedLabel}`, 45, 56);
      doc.text("Tanggal Cetak", 14, 61);
      doc.text(`: ${new Date().toLocaleString("id-ID")}`, 45, 61);

      // DISCLAIMER
      doc.setFontSize(7);
      doc.setTextColor(120);
      const disclaimer =
        "Disclaimer: Dokumen ini mencantumkan data wajib pajak sesuai filter kategori dan periode yang dipilih. Harap diperhatikan bahwa informasi ini bersifat rahasia dan penggunaannya diatur oleh kebijakan privasi dan keamanan data yang berlaku.";
      const splitDisclaimer = doc.splitTextToSize(disclaimer, 182);
      doc.text(splitDisclaimer, 14, 68);

      // ==========================================
      // KOTAK RINGKASAN GAYA DASHBOARD (SUPER RAPI)
      // ==========================================
      const totalTransaksi = dataToExport.reduce(
        (sum, item) => sum + item.jumlahTransaksi,
        0,
      );
      const totalPendapatan = dataToExport.reduce(
        (sum, item) => sum + item.totalPendapatanPajak,
        0,
      );
      const totalPjk = dataToExport.reduce(
        (sum, item) => sum + item.totalPajak,
        0,
      );

      doc.setDrawColor(200);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 80, 182, 18, 2, 2, "FD"); // Background Kotak

      // Garis Pemisah Vertikal di Dalam Kotak
      doc.setDrawColor(226, 232, 240);
      doc.line(55, 80, 55, 98);
      doc.line(100, 80, 100, 98);
      doc.line(155, 80, 155, 98);

      // Teks Label Atas (Warna Abu)
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.setFont("helvetica", "bold");
      doc.text("Wajib Pajak", 34.5, 86, { align: "center" });
      doc.text("Jumlah Transaksi", 77.5, 86, { align: "center" });
      doc.text("Total Pendapatan + Pajak", 127.5, 86, { align: "center" });
      doc.text("Total Pajak", 175.5, 86, { align: "center" });

      // Teks Value Bawah (Warna Hitam)
      doc.setFontSize(9);
      doc.setTextColor(0);
      doc.text(`${dataToExport.length} WP`, 34.5, 94, { align: "center" });
      doc.text(`${totalTransaksi}`, 77.5, 94, { align: "center" });
      doc.text(`${formatRupiah(totalPendapatan)}`, 127.5, 94, {
        align: "center",
      });
      doc.text(`${formatRupiah(totalPjk)}`, 175.5, 94, { align: "center" });

      // ==========================================
      // TABEL TRANSAKSI
      // ==========================================
      autoTable(doc, {
        startY: 105,
        head: [
          [
            "No",
            "Nama Wajib Pajak",
            "Kategori",
            "Jumlah Transaksi",
            "Total Pend. + Pajak",
            "Total Pajak",
          ],
        ],
        body: dataToExport.map((item, index) => [
          index + 1,
          item.nama,
          selectedCategory === "semua" ? item.kategori : selectedLabel,
          item.jumlahTransaksi,
          formatRupiah(item.totalPendapatanPajak),
          formatRupiah(item.totalPajak),
        ]),
        theme: "grid",
        headStyles: {
          fillColor: [11, 46, 107],
          textColor: 255,
          fontSize: 8,
          fontStyle: "bold",
          halign: "center",
        },
        bodyStyles: { fontSize: 8, textColor: 50 },
        columnStyles: {
          0: { halign: "center", cellWidth: 10 },
          1: { halign: "left" },
          2: { halign: "center", cellWidth: 25 },
          3: { halign: "center", cellWidth: 25 },
          4: { halign: "right", cellWidth: 35 },
          5: { halign: "right", cellWidth: 35 },
        },
        styles: { cellPadding: 3 },
      });

      doc.save(`Laporan-Ringkasan-Transaksi.pdf`);
    }

    setIsDownloadModalOpen(false); // Tutup Modal setelah selesai unduh
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
        <div className="px-6 md:px-8 py-7 md:py-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
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
                className="text-white text-2xl md:text-[30px] leading-tight truncate"
                style={{ fontWeight: 700 }}
              >
                {BRAND.title}
              </div>

              <div className="text-white/80 text-sm mt-1">{BRAND.subtitle}</div>
            </div>
          </div>

          <div
            className="flex items-center gap-3 px-5 py-3 rounded-2xl shrink-0 overflow-x-auto"
            style={{
              backgroundColor: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.14)",
            }}
          >
            <CalendarDays className="w-5 h-5 text-white/80 shrink-0" />
            <div className="text-white text-sm font-bold whitespace-nowrap">
              {formatTanggalIndonesia(startDate)} -{" "}
              {formatTanggalIndonesia(endDate)}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 md:px-6 py-6 flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <SummaryCard
            label="Transaksi Tertinggi"
            title={recap.highest?.nama ?? "-"}
            value={formatRupiah(recap.highest?.totalPendapatanPajak ?? 0)}
            sub={`${recap.highest?.jumlahTransaksi ?? 0} transaksi`}
            icon={<ArrowUp className="w-5 h-5" />}
            iconBg="#DCFCE7"
            iconColor="#16A34A"
          />

          <SummaryCard
            label="Transaksi Terendah"
            title={recap.lowest?.nama ?? "-"}
            value={formatRupiah(recap.lowest?.totalPendapatanPajak ?? 0)}
            sub={`${recap.lowest?.jumlahTransaksi ?? 0} transaksi`}
            icon={<ArrowDown className="w-5 h-5" />}
            iconBg="#FEE2E2"
            iconColor="#DC2626"
          />

          <SummaryCard
            label="Total Pendapatan + Pajak"
            title={formatRupiah(recap.totalPendapatanPajak)}
            sub={`${formatTanggalIndonesia(startDate)} - ${formatTanggalIndonesia(endDate)}`}
            icon={<Wallet className="w-5 h-5" />}
            iconBg="#DBEAFE"
            iconColor="#2563EB"
          />

          <SummaryCard
            label="Total Pajak"
            title={formatRupiah(recap.totalPajak)}
            sub={`${formatTanggalIndonesia(startDate)} - ${formatTanggalIndonesia(endDate)}`}
            icon={<Coins className="w-5 h-5" />}
            iconBg="#F3E8FF"
            iconColor="#9333EA"
          />
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
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Cari wajib pajak..."
                    className="w-full bg-slate-50 rounded-xl pl-10 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    style={{
                      border: `1px solid ${THEME.border}`,
                      color: THEME.text,
                    }}
                  />
                </div>
              </div>

              <div className="w-full xl:w-64">
                <div className="relative" ref={sortRef}>
                  <button
                    type="button"
                    onClick={() => setOpenSort((value) => !value)}
                    className="w-full inline-flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border bg-white hover:bg-slate-50 transition text-sm"
                    style={{
                      borderColor: THEME.border,
                      color: THEME.text,
                    }}
                  >
                    <span className="truncate">{sortLabel}</span>
                    <ChevronDown
                      className="w-4 h-4 transition-transform shrink-0"
                      style={{
                        color: THEME.muted,
                        transform: openSort ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    />
                  </button>

                  {openSort && (
                    <div
                      className="absolute left-0 top-full mt-2 rounded-2xl bg-white z-50 overflow-hidden"
                      style={{
                        width: "100%",
                        border: `1px solid ${THEME.border}`,
                        boxShadow: "0 18px 40px rgba(15, 23, 42, 0.12)",
                      }}
                    >
                      {SORT_OPTIONS.map((item, index) => {
                        const selected = item.key === sortBy;

                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => {
                              setSortBy(item.key);
                              setPage(1);
                              setOpenSort(false);
                            }}
                            className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 transition"
                            style={{
                              color: selected ? THEME.accent : THEME.text,
                              fontWeight: selected ? 600 : 400,
                              backgroundColor: selected
                                ? "rgba(30,99,214,0.06)"
                                : "#FFFFFF",
                              borderBottom:
                                index === SORT_OPTIONS.length - 1
                                  ? "none"
                                  : `1px solid ${THEME.border}`,
                            }}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <CalendarDays
                    className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: THEME.muted }}
                  />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => {
                      setStartDate(event.target.value);
                      setPage(1);
                    }}
                    className="w-full bg-white rounded-xl pl-10 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    style={{
                      border: `1px solid ${THEME.border}`,
                      color: THEME.text,
                    }}
                  />
                </div>

                <div className="relative">
                  <CalendarDays
                    className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: THEME.muted }}
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => {
                      setEndDate(event.target.value);
                      setPage(1);
                    }}
                    className="w-full bg-white rounded-xl pl-10 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    style={{
                      border: `1px solid ${THEME.border}`,
                      color: THEME.text,
                    }}
                  />
                </div>
              </div>

              {/* TOMBOL BUKA MODAL */}
              <button
                type="button"
                onClick={() => setIsDownloadModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition text-sm shrink-0 font-bold"
                style={{
                  backgroundColor: THEME.headerBg,
                  color: "#FFFFFF",
                }}
              >
                <Download className="w-4 h-4" />
                Unduh Ringkasan
              </button>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <Table aria-label="Laporan Transaksi Wajib Pajak" removeWrapper>
              <TableHeader>
                <TableColumn className="bg-transparent text-slate-500 font-extrabold text-[11px] uppercase text-center w-16">
                  No
                </TableColumn>
                <TableColumn className="bg-transparent text-slate-500 font-extrabold text-[11px] uppercase text-left min-w-72">
                  Nama
                </TableColumn>
                <TableColumn className="bg-transparent text-slate-500 font-extrabold text-[11px] uppercase text-center min-w-52">
                  Jumlah Transaksi
                </TableColumn>
                <TableColumn className="bg-transparent text-slate-500 font-extrabold text-[11px] uppercase text-left min-w-60">
                  Total Pendapatan + Pajak
                </TableColumn>
                <TableColumn className="bg-transparent text-slate-500 font-extrabold text-[11px] uppercase text-left min-w-52">
                  Total Pajak
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
                          Coba ubah pencarian atau rentang tanggal
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((item, index) => (
                    <TableRow
                      key={item.id}
                      className="border-b border-slate-50 last:border-none hover:bg-slate-50 transition-colors"
                    >
                      <TableCell className="text-center px-4 py-4">
                        {(safePage - 1) * PAGE_SIZE + index + 1}
                      </TableCell>

                      <TableCell className="text-left px-4 py-4">
                        <span className="font-semibold text-slate-700">
                          {item.nama}
                        </span>
                      </TableCell>

                      <TableCell className="text-center px-4 py-4">
                        <Chip
                          size="sm"
                          variant="flat"
                          className="text-xs px-3 py-1"
                          style={{
                            backgroundColor: "#F1F5F9",
                            color: "#334155",
                            fontWeight: 600,
                          }}
                        >
                          {item.jumlahTransaksi} Transaksi
                        </Chip>
                      </TableCell>

                      <TableCell className="text-left px-4 py-4">
                        <span className="font-extrabold text-slate-700">
                          {formatRupiah(item.totalPendapatanPajak)}
                        </span>
                      </TableCell>

                      <TableCell className="text-left px-4 py-4">
                        <span className="font-extrabold text-slate-700">
                          {formatRupiah(item.totalPajak)}
                        </span>
                      </TableCell>

                      <TableCell className="text-center px-4 py-4">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold hover:underline"
                          style={{ color: THEME.accent }}
                          onClick={() =>
                            alert(
                              `${item.nama}\n\nJumlah transaksi: ${
                                item.jumlahTransaksi
                              }\nTotal pendapatan + pajak: ${formatRupiah(
                                item.totalPendapatanPajak,
                              )}\nTotal pajak: ${formatRupiah(item.totalPajak)}`,
                            )
                          }
                        >
                          <Eye className="w-4 h-4" />
                          Detail
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
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
                className="w-10 h-10 rounded-xl border bg-white hover:bg-slate-50 transition disabled:opacity-50"
                style={{ borderColor: THEME.border }}
                onClick={() =>
                  setPage((value) => clamp(value - 1, 1, totalPages))
                }
                disabled={safePage <= 1}
              >
                {"<"}
              </button>

              {pagination.start > 1 && (
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

              {pagination.pages.map((item) => {
                const active = item === safePage;

                return (
                  <button
                    type="button"
                    key={item}
                    className="w-10 h-10 rounded-xl border transition"
                    style={{
                      borderColor: THEME.border,
                      backgroundColor: active ? "rgba(30,99,214,0.10)" : "#fff",
                      color: active ? THEME.accent : THEME.text,
                      fontWeight: 600,
                    }}
                    onClick={() => setPage(item)}
                  >
                    {item}
                  </button>
                );
              })}

              {pagination.end < totalPages && (
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
                className="w-10 h-10 rounded-xl border bg-white hover:bg-slate-50 transition disabled:opacity-50"
                style={{ borderColor: THEME.border }}
                onClick={() =>
                  setPage((value) => clamp(value + 1, 1, totalPages))
                }
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
          ©️ 2026 Kabupaten Aceh Tengah • PT. Biner Teknologi Indonesia
        </div>
      </div>

      {/* ========================================== */}
      {/* POP-UP MODAL UNDUH PREMIUM                 */}
      {/* ========================================== */}
      <Modal
        isOpen={isDownloadModalOpen}
        onOpenChange={setIsDownloadModalOpen}
        placement="center"
        size="md"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-800">
                  Unduh Laporan Ringkasan
                </h2>
                <p className="text-sm font-normal text-slate-500">
                  Sesuaikan parameter laporan yang ingin Anda unduh.
                </p>
              </ModalHeader>

              <ModalBody className="py-6 flex flex-col gap-5">
                {/* PILIH KATEGORI */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Kategori Wajib Pajak
                  </label>
                  <Select
                    placeholder="Pilih Kategori"
                    selectedKeys={[selectedCategory]}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full"
                    variant="bordered"
                  >
                    {KATEGORI_OPTIONS.map((cat) => (
                      <SelectItem key={cat.key}>{cat.label}</SelectItem>
                    ))}
                  </Select>
                </div>

                {/* PILIH FORMAT FILE */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Format Laporan
                  </label>
                  <Select
                    placeholder="Pilih Format"
                    selectedKeys={[exportFormat]}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="w-full"
                    variant="bordered"
                  >
                    <SelectItem
                      key="pdf"
                      startContent={
                        <span className="text-red-500 font-bold mr-1">PDF</span>
                      }
                    >
                      Dokumen Cetak Resmi (.pdf)
                    </SelectItem>
                    <SelectItem
                      key="csv"
                      startContent={
                        <span className="text-green-600 font-bold mr-1">
                          CSV
                        </span>
                      }
                    >
                      Data Excel Spreadsheet (.csv)
                    </SelectItem>
                  </Select>
                </div>

                {/* INFO PERIODE (READ-ONLY) */}
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3 mt-1">
                  <CalendarDays className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">
                      Periode Laporan Terpilih
                    </p>
                    <p className="text-xs font-medium text-blue-700 mt-1">
                      {formatTanggalIndonesia(startDate)} -{" "}
                      {formatTanggalIndonesia(endDate)}
                    </p>
                  </div>
                </div>
              </ModalBody>

              <ModalFooter className="border-t border-slate-100 pt-4">
                <Button
                  color="danger"
                  variant="light"
                  onPress={onClose}
                  className="font-semibold"
                >
                  Batal
                </Button>
                <Button
                  color="primary"
                  onPress={executeDownload}
                  style={{ backgroundColor: THEME.headerBg, color: "#fff" }}
                  className="font-semibold shadow-md"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Unduh Sekarang
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
