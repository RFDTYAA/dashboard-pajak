import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { WajibPajakListItem } from "../types/domain";

type ReportRow = WajibPajakListItem & {
  alamat?: string;
  email?: string;
  telp?: string;
  jamBuka?: string | null;
  jamTutup?: string | null;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  status?: string;
  deviceId?: string | null;
  device_id?: string | null;
  provider?: string | null;
  simProvider?: string | null;
  simNumber?: string | null;
  phoneNumber?: string | null;
  createdBy?: string | null;
  created_by?: string | null;
  addedBy?: string | null;
  posType?: string | null;
  pos_type?: string | null;
};

const BRAND = {
  daerah: "PEMERINTAH KABUPATEN ACEH TENGAH",
  instansi: "BADAN PENDAPATAN DAERAH",
  alamat: "Kabupaten Aceh Tengah",
  dicetakOleh: "Admin",
  role: "Admin",
};

function nowLabel() {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

function fileDate() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(
    d.getHours(),
  )}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

function value(v: unknown) {
  const text = String(v ?? "").trim();
  return text || "-";
}

function getCreatedBy(row: ReportRow) {
  return value(
    row.createdBy ?? row.created_by ?? row.addedBy ?? BRAND.dicetakOleh,
  );
}

function getDeviceId(row: ReportRow) {
  return value(row.deviceId ?? row.device_id ?? row.id);
}

function getPosType(row: ReportRow) {
  return value(row.posType ?? row.pos_type ?? row.jenisPOS ?? row.jenisPos);
}

function getProvider(row: ReportRow) {
  return value(row.provider ?? row.simProvider);
}

function getSimNumber(row: ReportRow) {
  return value(row.simNumber ?? row.phoneNumber);
}

function getStatus(row: ReportRow) {
  const status = String(row.status ?? "Aktif").toLowerCase();
  return status.includes("non") || status.includes("tidak")
    ? "[-] TIDAK AKTIF"
    : "[+] AKTIF";
}

function getCoordinate(row: ReportRow) {
  const lat = row.latitude ?? row.lat;
  const lng = row.longitude ?? row.lng;

  if (lat === undefined || lng === undefined || lat === null || lng === null) {
    return "-, -";
  }

  return `${lat}, ${lng}`;
}

function addHeader(doc: jsPDF, title: string) {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(BRAND.daerah, pageWidth / 2, 14, { align: "center" });

  doc.setFontSize(18);
  doc.text(BRAND.instansi, pageWidth / 2, 24, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(BRAND.alamat, pageWidth / 2, 31, { align: "center" });

  doc.setLineWidth(0.4);
  doc.line(14, 38, pageWidth - 14, 38);
  doc.setLineWidth(1);
  doc.line(14, 43, pageWidth - 14, 43);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(title, pageWidth / 2, 52, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Tanggal Cetak : ${nowLabel()}`, 14, 65);

  doc.setFillColor(248, 250, 252);
  doc.rect(14, 72, pageWidth - 28, 18, "F");

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    "Disclaimer: Dokumen ini mencantumkan data wajib pajak sesuai akses yang diberikan. Informasi ini bersifat rahasia dan penggunaannya diatur oleh kebijakan privasi dan keamanan data yang berlaku.",
    18,
    79,
    { maxWidth: pageWidth - 36 },
  );

  doc.setTextColor(15, 23, 42);
}

function addSummaryCards(
  doc: jsPDF,
  cards: Array<{ label: string; value: string }>,
  startY: number,
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const gap = 4;
  const cardWidth = (pageWidth - 28 - gap * (cards.length - 1)) / cards.length;

  cards.forEach((card, index) => {
    const x = 14 + index * (cardWidth + gap);

    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(37, 99, 235);
    doc.roundedRect(x, startY, cardWidth, 10, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(card.label, x + 4, startY + 6.5);

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, startY + 10, cardWidth, 18, 1.5, 1.5, "FD");

    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(card.value, x + 4, startY + 22);
  });
}

function addFooter(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `Takengon, ${nowLabel().split(" pukul ")[0]}`,
    pageWidth - 14,
    pageHeight - 30,
    {
      align: "right",
    },
  );
  doc.text("Dicetak Oleh,", pageWidth - 14, pageHeight - 24, {
    align: "right",
  });

  doc.setFont("helvetica", "bold");
  doc.text(BRAND.dicetakOleh.toUpperCase(), pageWidth - 14, pageHeight - 12, {
    align: "right",
  });
}

export function downloadWajibPajakPdf(rows: ReportRow[]) {
  const doc = new jsPDF("landscape", "mm", "a4");

  addHeader(doc, "LAPORAN DAFTAR WAJIB PAJAK");

  addSummaryCards(
    doc,
    [
      { label: "Total Wajib Pajak", value: `${rows.length} Wajib Pajak` },
      { label: "Dikelola Oleh", value: BRAND.dicetakOleh.toUpperCase() },
      { label: "Role Hak Akses", value: BRAND.role },
    ],
    96,
  );

  autoTable(doc, {
    startY: 132,
    head: [
      [
        "No",
        "Nama Usaha & Kategori",
        "NPWPD",
        "Jam Ops.",
        "Kontak & Alamat",
        "Akses Tapping Box",
        "Dibuat Oleh",
      ],
    ],
    body: rows.map((row, index) => [
      String(index + 1),
      `${value(row.namaUsaha)}\nKategori: ${value(row.tipeUsaha)}`,
      value(row.npwpd),
      `Buka: ${value(row.jamBuka)}\nTutup: ${value(row.jamTutup)}`,
      `Email: ${value(row.email)}\nTelp: ${value(row.telp)}\n${value(row.alamat)}`,
      `${getStatus(row)}\nKoordinat:\n${getCoordinate(row)}`,
      getCreatedBy(row),
    ]),
    styles: {
      font: "helvetica",
      fontSize: 7,
      cellPadding: 2,
      valign: "top",
      lineColor: [148, 163, 184],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [51, 65, 85],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 45 },
      2: { cellWidth: 35 },
      3: { cellWidth: 26 },
      4: { cellWidth: 65 },
      5: { cellWidth: 38 },
      6: { cellWidth: 28 },
    },
    margin: { left: 14, right: 14 },
  });

  addFooter(doc);
  doc.save(`daftar-wajib-pajak-${fileDate()}.pdf`);
}

export function downloadPerangkatWajibPajakPdf(rows: ReportRow[]) {
  const doc = new jsPDF("portrait", "mm", "a4");

  addHeader(doc, "LAPORAN PENEMPATAN PERANGKAT");

  const deviceCounts = rows.reduce<Record<string, number>>((acc, row) => {
    const type = getPosType(row);
    acc[type] = (acc[type] ?? 0) + 1;
    return acc;
  }, {});

  const cards = Object.entries(deviceCounts).map(([label, count]) => ({
    label: `Tipe: ${label}`,
    value: `${count} Perangkat`,
  }));

  addSummaryCards(
    doc,
    cards.length > 0
      ? cards.slice(0, 3)
      : [{ label: "Tipe: -", value: "0 Perangkat" }],
    96,
  );

  autoTable(doc, {
    startY: 132,
    head: [
      [
        "No",
        "Wajib Pajak",
        "ID & Tipe Perangkat",
        "Informasi SIM Card",
        "Ditambahkan Oleh",
      ],
    ],
    body: rows.map((row, index) => [
      String(index + 1),
      value(row.namaUsaha),
      `${getDeviceId(row)}\nTipe: ${getPosType(row)}`,
      `Provider: ${getProvider(row)}\nNomor: ${getSimNumber(row)}`,
      getCreatedBy(row),
    ]),
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 2,
      valign: "top",
      lineColor: [148, 163, 184],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [51, 65, 85],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 42 },
      2: { cellWidth: 50 },
      3: { cellWidth: 50 },
      4: { cellWidth: 35 },
    },
    margin: { left: 14, right: 14 },
  });

  addFooter(doc);
  doc.save(`daftar-perangkat-wajib-pajak-${fileDate()}.pdf`);
}
