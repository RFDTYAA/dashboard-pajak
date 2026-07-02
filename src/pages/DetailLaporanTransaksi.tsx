import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Coins,
  Download,
  TrendingUp,
  Users,
} from "lucide-react";
import { apiRequest } from "../lib/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type RawTransaction = Record<string, unknown>;

const THEME = {
  pageBg: "#F2F7FF",
  headerBg: "#0B2E6B",
  headerBorder: "rgba(255,255,255,0.14)",
  border: "rgba(15, 23, 42, 0.10)",
  muted: "#64748B",
  text: "#0F172A",
  accent: "#1E63D6",
};

function getString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function getNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function getObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value))
    return value as Record<string, unknown>;
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

function getWajibPajakId(item: RawTransaction): string {
  const taxPayer = getTaxPayer(item);
  return (
    getString(taxPayer?.id) ||
    getString(item.taxpayer_id) ||
    getString(item.id) ||
    getNamaWajibPajak(item)
  );
}

function getNamaWajibPajak(item: RawTransaction): string {
  const taxPayer = getTaxPayer(item);
  return (
    getString(taxPayer?.business_name) ||
    getString(taxPayer?.namaUsaha) ||
    getString(item.business_name) ||
    getString(item.namaUsaha) ||
    getString(item.nama) ||
    "Wajib Pajak"
  );
}

function getPendapatan(item: RawTransaction): number {
  return (
    getNumber(item.transaction_amount) ||
    getNumber(item.amount) ||
    getNumber(item.jumlah) ||
    0
  );
}

function getPajak(item: RawTransaction): number {
  return (
    getNumber(item.tax) ||
    getNumber(item.pajak) ||
    getNumber(item.total_tax) ||
    Math.round(getPendapatan(item) * 0.1)
  );
}

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

function formatTanggal(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(date);
}

function isDateInRange(dateStr: string, start: string, end: string): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T23:59:59`);
  return date >= startDate && date <= endDate;
}

type TransactionRow = {
  id: number;
  tanggal: string;
  rawDate: string;
  subtotal: number;
  totalTransaksiPajak: number;
  pajak: number;
  biayaLayanan: number;
};

export default function DetailLaporanTransaksi() {
  const navigate = useNavigate();
  const { id: urlId } = useParams();

  const [loading, setLoading] = useState(true);
  const [namaUsaha, setNamaUsaha] = useState("");
  const [allTransactions, setAllTransactions] = useState<TransactionRow[]>([]);

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [startDate, setStartDate] = useState(
    firstDay.toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState(lastDay.toISOString().split("T")[0]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      try {
        setLoading(true);
        const response = await apiRequest<unknown>("/transaction", {
          query: { page: 1, size: 1000 },
          signal: controller.signal,
        });

        const all = getArrayFromResponse(response);
        const filteredRaw = all.filter(
          (item) => getWajibPajakId(item) === urlId,
        );

        if (filteredRaw.length > 0) {
          setNamaUsaha(getNamaWajibPajak(filteredRaw[0]));
        } else {
          setNamaUsaha("Wajib Pajak");
        }

        const mapped: TransactionRow[] = filteredRaw.map((item, index) => {
          const pendapatan = getPendapatan(item);
          const pajak = getPajak(item);
          const biayaLayanan = 0;
          const subtotal = pendapatan + pajak + biayaLayanan;
          const rawDate =
            getString(item.transaction_time) || getString(item.created_at);

          return {
            id: index + 1,
            tanggal: formatTanggal(rawDate),
            rawDate,
            subtotal,
            totalTransaksiPajak: pendapatan + pajak,
            pajak,
            biayaLayanan,
          };
        });

        setAllTransactions(mapped);
      } catch {
        setAllTransactions([]);
      } finally {
        setLoading(false);
      }
    }

    if (urlId) void loadData();
    return () => controller.abort();
  }, [urlId]);

  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((t) =>
      isDateInRange(t.rawDate, startDate, endDate),
    );
  }, [allTransactions, startDate, endDate]);

  const totalTransaksi = filteredTransactions.length;
  const totalSubtotal = useMemo(
    () => filteredTransactions.reduce((sum, t) => sum + t.subtotal, 0),
    [filteredTransactions],
  );
  const totalPajak = useMemo(
    () => filteredTransactions.reduce((sum, t) => sum + t.pajak, 0),
    [filteredTransactions],
  );

  function downloadPDF() {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Laporan Transaksi - ${namaUsaha}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Periode: ${startDate} s/d ${endDate}`, 14, 27);
    doc.text(
      `Tanggal Cetak: ${new Date().toLocaleDateString("id-ID")}`,
      14,
      33,
    );

    autoTable(doc, {
      startY: 42,
      head: [
        [
          "No",
          "Tanggal Transaksi",
          "Subtotal Transaksi",
          "Total + Pajak",
          "Total Pajak",
          "Biaya Layanan",
        ],
      ],
      body: filteredTransactions.map((row, i) => [
        i + 1,
        row.tanggal,
        formatRupiah(row.subtotal),
        formatRupiah(row.totalTransaksiPajak),
        formatRupiah(row.pajak),
        formatRupiah(row.biayaLayanan),
      ]),
      theme: "grid",
      headStyles: { fillColor: [11, 46, 107], textColor: 255, fontSize: 9 },
      styles: { fontSize: 9 },
    });

    doc.save(`Detail-Transaksi-${namaUsaha}.pdf`);
  }

  return (
    <div
      className="-m-6 min-h-[calc(100vh-0px)] font-sans flex flex-col"
      style={{ backgroundColor: THEME.pageBg, color: THEME.text }}
    >
      {/* Header */}
      <header
        className="w-full"
        style={{
          backgroundColor: THEME.headerBg,
          borderBottom: `1px solid ${THEME.headerBorder}`,
        }}
      >
        <div className="px-6 md:px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/laporan")}
              className="text-white/90 hover:text-white transition"
            >
              <ArrowLeft className="w-7 h-7" />
            </button>
            <div>
              <div className="text-white text-2xl md:text-[28px] font-bold truncate">
                {namaUsaha}
              </div>
              <div className="text-white/80 text-sm">
                Detail Riwayat Transaksi Wajib Pajak
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl text-white text-sm">
            <CalendarDays className="w-4 h-4" />
            <span>
              {formatTanggal(startDate)} — {formatTanggal(endDate)}
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 md:px-6 py-6 flex flex-col gap-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            className="bg-white rounded-2xl p-5 shadow-sm border flex items-center gap-4"
            style={{ borderColor: THEME.border }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: "#DBEAFE", color: "#2563EB" }}
            >
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-extrabold text-slate-500">
                JUMLAH TRANSAKSI
              </p>
              <p className="text-3xl font-extrabold text-slate-900 mt-1">
                {totalTransaksi}
              </p>
            </div>
          </div>

          <div
            className="bg-white rounded-2xl p-5 shadow-sm border flex items-center gap-4"
            style={{ borderColor: THEME.border }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: "#DCFCE7", color: "#16A34A" }}
            >
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-extrabold text-slate-500">
                TOTAL SUBTOTAL
              </p>
              <p className="text-3xl font-extrabold text-slate-900 mt-1">
                {formatRupiah(totalSubtotal)}
              </p>
            </div>
          </div>

          <div
            className="bg-white rounded-2xl p-5 shadow-sm border flex items-center gap-4"
            style={{ borderColor: THEME.border }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: "#F3E8FF", color: "#9333EA" }}
            >
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-extrabold text-slate-500">
                TOTAL PAJAK
              </p>
              <p className="text-3xl font-extrabold text-slate-900 mt-1">
                {formatRupiah(totalPajak)}
              </p>
            </div>
          </div>
        </div>

        {/* Riwayat Transaksi */}
        <div
          className="bg-white rounded-2xl shadow-sm border overflow-hidden"
          style={{ borderColor: THEME.border }}
        >
          <div
            className="px-5 py-4 border-b flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
            style={{ borderColor: THEME.border }}
          >
            <h3 className="font-extrabold text-lg">Riwayat Transaksi</h3>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-3 min-w-85">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border rounded-xl px-4 py-2.5 text-sm flex-1"
                  style={{ borderColor: THEME.border }}
                />
                <span className="text-slate-400">—</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border rounded-xl px-4 py-2.5 text-sm flex-1"
                  style={{ borderColor: THEME.border }}
                />
              </div>

              <button
                onClick={downloadPDF}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B2E6B] text-white text-sm font-semibold hover:bg-[#0a2859] transition w-full sm:w-auto justify-center"
              >
                <Download className="w-4 h-4" /> Unduh Laporan
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin h-8 w-8 border-b-2 border-[#0B2E6B] rounded-full" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              Tidak ada data transaksi pada periode ini
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="text-left px-5 py-3 font-extrabold">NO</th>
                    <th className="text-left px-5 py-3 font-extrabold">
                      TANGGAL TRANSAKSI
                    </th>
                    <th className="text-left px-5 py-3 font-extrabold">
                      SUBTOTAL TRANSAKSI
                    </th>
                    <th className="text-left px-5 py-3 font-extrabold">
                      TOTAL TRANSAKSI + PAJAK
                    </th>
                    <th className="text-left px-5 py-3 font-extrabold">
                      TOTAL PAJAK
                    </th>
                    <th className="text-left px-5 py-3 font-extrabold">
                      BIAYA LAYANAN
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((row, index) => (
                    <tr
                      key={row.id}
                      className="border-t hover:bg-slate-50"
                      style={{ borderColor: THEME.border }}
                    >
                      <td className="px-5 py-3.5 text-slate-600">
                        {index + 1}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-700">
                        {row.tanggal}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-700">
                        {formatRupiah(row.subtotal)}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-700">
                        {formatRupiah(row.totalTransaksiPajak)}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-[#0B2E6B]">
                        {formatRupiah(row.pajak)}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-700">
                        {formatRupiah(row.biayaLayanan)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="py-4 text-center text-xs" style={{ color: "#94A3B8" }}>
        © 2026 Kabupaten Aceh Tengah • PT. Biner Teknologi Indonesia
      </div>
    </div>
  );
}
