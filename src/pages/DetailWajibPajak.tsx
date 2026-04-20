import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Info, Pencil } from "lucide-react";
import "leaflet/dist/leaflet.css";
import {
  createEmptyWajibPajakDetail,
  normalizeFormKategori,
  normalizeJenisPOS,
  normalizeNpwpd,
  normalizeStatusUsaha,
} from "../types/domain";
import type {
  FormKategori as TipeUsaha,
  JenisPOS,
  StatusUsaha,
  WajibPajakDetailData,
} from "../types/domain";
import { getWajibPajakDetail } from "../services/wajibPajak";

type LeafletMapLike = {
  remove: () => void;
};

type LeafletTileLayerLike = {
  addTo: (map: LeafletMapLike) => void;
};

type LeafletMarkerLike = {
  addTo: (map: LeafletMapLike) => LeafletMarkerLike;
  bindPopup: (html: string) => LeafletMarkerLike;
  openPopup: () => LeafletMarkerLike;
};

type LeafletIconLike = unknown;

type LeafletLike = {
  map: (
    el: HTMLElement,
    options: {
      center: [number, number];
      zoom: number;
      zoomControl: boolean;
      scrollWheelZoom: boolean;
    },
  ) => LeafletMapLike;
  tileLayer: (
    url: string,
    options: { maxZoom: number; attribution: string },
  ) => LeafletTileLayerLike;
  marker: (
    latlng: [number, number],
    options?: { icon?: LeafletIconLike },
  ) => LeafletMarkerLike;
  icon: (options: {
    iconUrl: string;
    iconRetinaUrl?: string;
    shadowUrl?: string;
    iconSize?: [number, number];
    iconAnchor?: [number, number];
    popupAnchor?: [number, number];
    shadowSize?: [number, number];
  }) => LeafletIconLike;
};

const THEME = {
  pageBg: "#F2F7FF",
  navbarBg: "#0B2E6B",
  navbarBorder: "rgba(255,255,255,0.14)",
  cardBg: "#FFFFFF",
  border: "rgba(15, 23, 42, 0.10)",
  muted: "#64748B",
  text: "#0F172A",
  accent: "#1E63D6",
};

const BRAND = {
  title: "Detail Wajib Pajak",
  subtitle: "Kabupaten Aceh Tengah",
};

function Badge({
  children,
  tone = "blue",
}: {
  children: React.ReactNode;
  tone?: "blue" | "slate" | "green";
}) {
  const style =
    tone === "blue"
      ? { bg: "#EFF6FF", fg: "#3B82F6", border: "rgba(59,130,246,0.20)" }
      : tone === "green"
        ? { bg: "#ECFDF5", fg: "#059669", border: "rgba(5,150,105,0.18)" }
        : { bg: "#F1F5F9", fg: "#334155", border: "rgba(51,65,85,0.12)" };

  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-xs"
      style={{
        backgroundColor: style.bg,
        color: style.fg,
        border: `1px solid ${style.border}`,
        fontWeight: 500,
      }}
    >
      {children}
    </span>
  );
}

function InfoRow({
  label,
  value,
  valueNode,
  noBorder,
}: {
  label: string;
  value?: string;
  valueNode?: React.ReactNode;
  noBorder?: boolean;
}) {
  return (
    <div
      className="grid grid-cols-12 gap-3 py-3.5"
      style={{ borderBottom: noBorder ? "none" : `1px solid ${THEME.border}` }}
    >
      <div
        className="col-span-12 md:col-span-4 text-sm"
        style={{ color: THEME.muted, fontWeight: 400 }}
      >
        {label}
      </div>
      <div
        className="col-span-12 md:col-span-8 text-sm"
        style={{ color: THEME.text, fontWeight: 400 }}
      >
        {valueNode ?? value}
      </div>
    </div>
  );
}

export default function DetailWajibPajak() {
  const navigate = useNavigate();
  const params = useParams();
  const rawId = Number(params.id ?? "1");
  const safeId = Number.isFinite(rawId) && rawId > 0 ? rawId : 1;

  const [data, setData] = useState<WajibPajakDetailData>(() =>
    createEmptyWajibPajakDetail(safeId),
  );

  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMapLike | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;

    const run = async () => {
      try {
        const detail = await getWajibPajakDetail(safeId, controller.signal);
        if (!alive) return;
        setData(detail);
      } catch {
        if (!alive || controller.signal.aborted) return;
        setData(createEmptyWajibPajakDetail(safeId));
      }
    };

    void run();

    return () => {
      alive = false;
      controller.abort();
    };
  }, [safeId]);

  const detailView = useMemo(() => {
    const lat =
      typeof data.latitude === "number"
        ? data.latitude
        : typeof data.lat === "number"
          ? data.lat
          : 4.6276;

    const lng =
      typeof data.longitude === "number"
        ? data.longitude
        : typeof data.lng === "number"
          ? data.lng
          : 96.8577;

    return {
      id: data.id,
      npwpd: normalizeNpwpd(data.npwpd),
      tipeUsaha: normalizeFormKategori(data.tipeUsaha) as TipeUsaha,
      namaUsaha: data.namaUsaha,
      alamat: data.alamat,
      email: data.email,
      telp: data.telp,
      status: normalizeStatusUsaha(data.status) as StatusUsaha,
      tanggalAktivasi: data.tanggalAktivasi || "-",
      jenisPOS: normalizeJenisPOS(data.jenisPOS ?? data.jenisPos) as JenisPOS,
      jamBuka: data.jamBuka || "-",
      jamTutup: data.jamTutup || "-",
      lat,
      lng,
    };
  }, [data]);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (!mapDivRef.current) return;

      const mod = (await import("leaflet")) as unknown as { default: unknown };
      const L = mod.default as LeafletLike;

      if (!alive || !mapDivRef.current) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const map = L.map(mapDivRef.current, {
        center: [detailView.lat, detailView.lng],
        zoom: 12,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(map);

      const icon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      L.marker([detailView.lat, detailView.lng], { icon })
        .addTo(map)
        .bindPopup(
          `<div style="font-family: ui-sans-serif, system-ui; font-size: 13px; line-height: 1.35;">
            <div style="font-weight: 600; margin-bottom: 4px;">${detailView.namaUsaha}</div>
            <div style="color: #64748B;">${detailView.alamat}</div>
            <div style="color: #94A3B8; margin-top: 4px;">Aceh Tengah</div>
          </div>`,
        )
        .openPopup();

      mapRef.current = map;
    };

    void run();

    return () => {
      alive = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [detailView.alamat, detailView.lat, detailView.lng, detailView.namaUsaha]);

  return (
    <div
      className="-m-6 min-h-[calc(100vh-0px)] font-sans flex flex-col"
      style={{ backgroundColor: THEME.pageBg, color: THEME.text }}
    >
      <nav
        className="w-full"
        style={{
          backgroundColor: THEME.navbarBg,
          borderBottom: `1px solid ${THEME.navbarBorder}`,
        }}
      >
        <div className="px-6 md:px-8 py-6 md:py-7 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <button
              type="button"
              onClick={() => navigate("/wajib-pajak")}
              className="text-white/95 hover:text-white transition shrink-0"
            >
              <ArrowLeft className="w-7 h-7" strokeWidth={1.8} />
            </button>

            <div className="flex items-center gap-3 min-w-0">
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
          </div>

          <button
            type="button"
            onClick={() => navigate(`/wajib-pajak/${safeId}/edit`)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white text-slate-600 hover:bg-slate-50 transition shrink-0 text-sm"
            style={{
              fontWeight: 400,
              border: `1px solid rgba(255,255,255,0.14)`,
            }}
          >
            <Pencil className="w-4 h-4" />
            Ubah Data
          </button>
        </div>
      </nav>

      <div className="flex-1 px-4 md:px-6 py-4 flex flex-col">
        <div
          className="rounded-xl p-4 md:p-5 flex-1"
          style={{
            backgroundColor: THEME.cardBg,
            border: `1px solid ${THEME.border}`,
            boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
          }}
        >
          <div className="grid grid-cols-12 gap-5 h-full">
            <section className="col-span-12 lg:col-span-5">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-4 h-4" style={{ color: THEME.accent }} />
                <h2
                  className="text-base"
                  style={{ color: "#334155", fontWeight: 600 }}
                >
                  Informasi Umum
                </h2>
              </div>

              <InfoRow label="NPWPD (16 digit)" value={detailView.npwpd} />
              <InfoRow
                label="Kategori Usaha"
                valueNode={<Badge tone="blue">{detailView.tipeUsaha}</Badge>}
              />
              <InfoRow label="Nama Usaha" value={detailView.namaUsaha} />
              <InfoRow label="No. Telp" value={detailView.telp} />
              <InfoRow label="Email" value={detailView.email} />
              <InfoRow
                label="Status"
                valueNode={
                  <Badge
                    tone={detailView.status === "Aktif" ? "green" : "slate"}
                  >
                    {detailView.status}
                  </Badge>
                }
              />
              <InfoRow
                label="Tanggal Aktivasi"
                value={detailView.tanggalAktivasi}
              />
              <InfoRow
                label="Jenis POS"
                valueNode={<Badge tone="slate">{detailView.jenisPOS}</Badge>}
              />
              <InfoRow label="Jam Buka" value={detailView.jamBuka} />
              <InfoRow label="Jam Tutup" value={detailView.jamTutup} noBorder />
            </section>

            <section className="col-span-12 lg:col-span-7 flex flex-col">
              <div className="mb-4">
                <h2
                  className="text-base"
                  style={{ color: "#334155", fontWeight: 600 }}
                >
                  Lokasi Usaha
                </h2>
              </div>

              <div
                className="rounded-xl overflow-hidden"
                style={{
                  border: `1px solid ${THEME.border}`,
                  backgroundColor: "#F8FAFC",
                  height: 270,
                }}
              >
                <div
                  ref={mapDivRef}
                  style={{ width: "100%", height: "100%" }}
                />
              </div>

              <div className="mt-3 space-y-3">
                <div>
                  <div
                    className="text-sm mb-1"
                    style={{ color: THEME.muted, fontWeight: 400 }}
                  >
                    Alamat Lengkap
                  </div>
                  <div
                    className="text-sm"
                    style={{ color: THEME.text, fontWeight: 500 }}
                  >
                    {detailView.alamat}
                  </div>
                </div>

                <div>
                  <div
                    className="text-sm mb-1"
                    style={{ color: THEME.muted, fontWeight: 400 }}
                  >
                    Koordinat
                  </div>
                  <div
                    className="text-sm"
                    style={{ color: THEME.text, fontWeight: 500 }}
                  >
                    {detailView.lat}, {detailView.lng}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div
          className="pt-4 text-center text-xs"
          style={{ color: THEME.muted }}
        >
          © {new Date().getFullYear()} {BRAND.subtitle} • PT. Biner Teknologi
          Indonesia
        </div>
      </div>
    </div>
  );
}
