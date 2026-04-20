import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Clock3, MapPin, Search } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import {
  createEmptyWajibPajakDetail,
  normalizeFormKategori,
  normalizeJenisPOS,
  normalizeNpwpd,
} from "../types/domain";
import type {
  FormKategori as Kategori,
  JenisPOS,
  WajibPajakDetailData,
  WajibPajakPayload,
} from "../types/domain";
import { getWajibPajakDetail, updateWajibPajak } from "../services/wajibPajak";

type SearchResult = {
  display_name: string;
  lat: string;
  lon: string;
};

type LeafletLatLng = {
  lat: number;
  lng: number;
};

type LeafletMapLike = {
  remove: () => void;
  on: (
    event: string,
    handler: (event: { latlng: LeafletLatLng }) => void,
  ) => void;
  flyTo: (
    latlng: [number, number],
    zoom: number,
    options?: { duration?: number },
  ) => void;
};

type LeafletMarkerLike = {
  addTo: (map: LeafletMapLike) => LeafletMarkerLike;
  bindPopup: (html: string) => LeafletMarkerLike;
  openPopup: () => LeafletMarkerLike;
  setLatLng: (latlng: [number, number]) => LeafletMarkerLike;
  on: (
    event: string,
    handler: (event: { target: { getLatLng: () => LeafletLatLng } }) => void,
  ) => void;
};

type LeafletTileLayerLike = {
  addTo: (map: LeafletMapLike) => void;
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
    options?: { draggable?: boolean; icon?: LeafletIconLike },
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
  title: "Ubah Data Wajib Pajak",
  subtitle: "Kabupaten Aceh Tengah",
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatCoordinate(value: number) {
  return value.toFixed(6);
}

function getDetailLatitude(data: WajibPajakDetailData) {
  if (typeof data.latitude === "number") return data.latitude;
  if (typeof data.lat === "number") return data.lat;
  return 4.6276;
}

function getDetailLongitude(data: WajibPajakDetailData) {
  if (typeof data.longitude === "number") return data.longitude;
  if (typeof data.lng === "number") return data.lng;
  return 96.8577;
}

function KategoriButton({
  active,
  label,
  tone,
  onClick,
}: {
  active: boolean;
  label: string;
  tone: "amber" | "green" | "blue";
  onClick: () => void;
}) {
  const toneStyle =
    tone === "amber"
      ? {
          bg: active ? "#F59E0B" : "#FFF7ED",
          fg: active ? "#FFFFFF" : "#C2410C",
          border: active ? "#F59E0B" : "rgba(245,158,11,0.24)",
          shadow: active ? "0 10px 22px rgba(245,158,11,0.22)" : "none",
        }
      : tone === "green"
        ? {
            bg: active ? "#10B981" : "#ECFDF5",
            fg: active ? "#FFFFFF" : "#047857",
            border: active ? "#10B981" : "rgba(16,185,129,0.24)",
            shadow: active ? "0 10px 22px rgba(16,185,129,0.22)" : "none",
          }
        : {
            bg: active ? "#3B82F6" : "#EFF6FF",
            fg: active ? "#FFFFFF" : "#1D4ED8",
            border: active ? "#3B82F6" : "rgba(59,130,246,0.24)",
            shadow: active ? "0 10px 22px rgba(59,130,246,0.22)" : "none",
          };

  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 rounded-full text-sm transition-all duration-200 hover:-translate-y-0.5"
      style={{
        backgroundColor: toneStyle.bg,
        color: toneStyle.fg,
        border: `1px solid ${toneStyle.border}`,
        boxShadow: toneStyle.shadow,
        fontWeight: 600,
      }}
    >
      {label}
    </button>
  );
}

function PosButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: JenisPOS;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-w-20.5 px-4 py-2 rounded-full text-sm transition-all duration-200 hover:-translate-y-0.5"
      style={{
        backgroundColor: active ? "#0F172A" : "#FFFFFF",
        color: active ? "#FFFFFF" : "#334155",
        border: `1px solid ${active ? "#0F172A" : "rgba(15,23,42,0.12)"}`,
        boxShadow: active ? "0 10px 22px rgba(15,23,42,0.16)" : "none",
        fontWeight: 600,
      }}
    >
      {label}
    </button>
  );
}

function InputLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="block text-sm mb-2"
      style={{ color: "#334155", fontWeight: 600 }}
    >
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full h-12 rounded-xl px-4 text-sm outline-none transition-all duration-200",
        "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
        props.className,
      )}
      style={{
        border: `1px solid ${THEME.border}`,
        backgroundColor: "#FFFFFF",
        color: THEME.text,
        ...props.style,
      }}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200 resize-none",
        "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
        props.className,
      )}
      style={{
        border: `1px solid ${THEME.border}`,
        backgroundColor: "#FFFFFF",
        color: THEME.text,
        ...props.style,
      }}
    />
  );
}

function TimeField({
  label,
  enabled,
  value,
  onToggle,
  onChange,
}: {
  label: string;
  enabled: boolean;
  value: string;
  onToggle: (checked: boolean) => void;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <InputLabel>{label}</InputLabel>

        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="sr-only"
          />
          <span
            className="relative w-11 h-6 rounded-full transition-colors"
            style={{ backgroundColor: enabled ? "#1E63D6" : "#CBD5E1" }}
          >
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
              style={{
                transform: enabled ? "translateX(20px)" : "translateX(0px)",
                boxShadow: "0 2px 8px rgba(15,23,42,0.18)",
              }}
            />
          </span>
          <span
            className="text-xs"
            style={{
              color: enabled ? THEME.accent : THEME.muted,
              fontWeight: 600,
            }}
          >
            {enabled ? "Aktif" : "Nonaktif"}
          </span>
        </label>
      </div>

      <div className="relative">
        <Clock3
          className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2"
          style={{ color: enabled ? THEME.accent : "#94A3B8" }}
        />
        <input
          type="time"
          value={value}
          disabled={!enabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-12 rounded-xl pl-11 pr-4 text-sm outline-none transition-all duration-200 disabled:cursor-not-allowed disabled:bg-slate-50"
          style={{
            border: `1px solid ${enabled ? "rgba(30,99,214,0.24)" : THEME.border}`,
            backgroundColor: enabled ? "#FFFFFF" : "#F8FAFC",
            color: enabled ? THEME.text : "#94A3B8",
          }}
        />
      </div>
    </div>
  );
}

export default function EditWajibPajak() {
  const navigate = useNavigate();
  const params = useParams();
  const rawId = Number(params.id ?? "1");
  const safeId = Number.isFinite(rawId) && rawId > 0 ? rawId : 1;

  const initialData = useMemo(
    () => createEmptyWajibPajakDetail(safeId),
    [safeId],
  );

  const [npwpd, setNpwpd] = useState(normalizeNpwpd(initialData.npwpd));
  const [kategori, setKategori] = useState<Kategori>(
    normalizeFormKategori(initialData.tipeUsaha),
  );
  const [namaUsaha, setNamaUsaha] = useState(initialData.namaUsaha);
  const [telp, setTelp] = useState(initialData.telp);
  const [email, setEmail] = useState(initialData.email);
  const [jamBukaAktif, setJamBukaAktif] = useState(
    Boolean(initialData.jamBuka),
  );
  const [jamBuka, setJamBuka] = useState(initialData.jamBuka || "08:00");
  const [jamTutupAktif, setJamTutupAktif] = useState(
    Boolean(initialData.jamTutup),
  );
  const [jamTutup, setJamTutup] = useState(initialData.jamTutup || "22:00");
  const [jenisPos, setJenisPos] = useState<JenisPOS>(
    normalizeJenisPOS(initialData.jenisPOS ?? initialData.jenisPos),
  );
  const [alamat, setAlamat] = useState(initialData.alamat);
  const [latitude, setLatitude] = useState(getDetailLatitude(initialData));
  const [longitude, setLongitude] = useState(getDetailLongitude(initialData));
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);

  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMapLike | null>(null);
  const markerRef = useRef<LeafletMarkerLike | null>(null);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);

  const coordsLabel = useMemo(
    () => ({
      lat: formatCoordinate(latitude),
      lng: formatCoordinate(longitude),
    }),
    [latitude, longitude],
  );

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;

    const run = async () => {
      try {
        const detail = await getWajibPajakDetail(safeId, controller.signal);
        if (!alive) return;

        setNpwpd(normalizeNpwpd(detail.npwpd));
        setKategori(normalizeFormKategori(detail.tipeUsaha));
        setNamaUsaha(detail.namaUsaha);
        setTelp(detail.telp);
        setEmail(detail.email);
        setJamBukaAktif(Boolean(detail.jamBuka));
        setJamBuka(detail.jamBuka || "08:00");
        setJamTutupAktif(Boolean(detail.jamTutup));
        setJamTutup(detail.jamTutup || "22:00");
        setJenisPos(normalizeJenisPOS(detail.jenisPOS ?? detail.jenisPos));
        setAlamat(detail.alamat);
        setLatitude(getDetailLatitude(detail));
        setLongitude(getDetailLongitude(detail));
      } catch {
        if (!alive || controller.signal.aborted) return;
      }
    };

    void run();

    return () => {
      alive = false;
      controller.abort();
    };
  }, [safeId]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (searchBoxRef.current && !searchBoxRef.current.contains(target)) {
        setSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    let alive = true;

    const setupMap = async () => {
      if (!mapDivRef.current) return;

      const mod = (await import("leaflet")) as unknown as { default: unknown };
      const L = mod.default as LeafletLike;

      if (!alive || !mapDivRef.current) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const map = L.map(mapDivRef.current, {
        center: [latitude, longitude],
        zoom: 14,
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

      const marker = L.marker([latitude, longitude], {
        draggable: true,
        icon,
      })
        .addTo(map)
        .bindPopup(
          `<div style="font-family: ui-sans-serif, system-ui; font-size: 13px; line-height: 1.35;">
            <div style="font-weight: 700; margin-bottom: 4px;">Lokasi Usaha</div>
            <div style="color: #64748B;">Geser marker atau klik peta untuk memilih lokasi</div>
          </div>`,
        )
        .openPopup();

      marker.on("dragend", (event) => {
        const next = event.target.getLatLng();
        setLatitude(next.lat);
        setLongitude(next.lng);
      });

      map.on("click", (event) => {
        marker.setLatLng([event.latlng.lat, event.latlng.lng]);
        setLatitude(event.latlng.lat);
        setLongitude(event.latlng.lng);
      });

      markerRef.current = marker;
      mapRef.current = map;
    };

    void setupMap();

    return () => {
      alive = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [latitude, longitude]);

  useEffect(() => {
    if (!markerRef.current || !mapRef.current) return;
    markerRef.current.setLatLng([latitude, longitude]);
    mapRef.current.flyTo([latitude, longitude], 16, { duration: 0.6 });
  }, [latitude, longitude]);

  async function handleSearchLocation() {
    const keyword = searchQuery.trim();

    if (!keyword) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }

    try {
      setSearching(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(keyword)}`,
        {
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Gagal mencari lokasi");
      }

      const result = (await response.json()) as SearchResult[];
      setSearchResults(result.slice(0, 6));
      setSearchOpen(true);
    } catch {
      setSearchResults([]);
      setSearchOpen(false);
    } finally {
      setSearching(false);
    }
  }

  function selectSearchResult(item: SearchResult) {
    const nextLat = Number(item.lat);
    const nextLng = Number(item.lon);

    setLatitude(nextLat);
    setLongitude(nextLng);
    setSearchQuery(item.display_name);
    setSearchOpen(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const payload: WajibPajakPayload = {
      npwpd,
      kategori,
      namaUsaha,
      telp,
      email,
      jamBuka: jamBukaAktif ? jamBuka : null,
      jamTutup: jamTutupAktif ? jamTutup : null,
      jenisPos,
      alamat,
      latitude,
      longitude,
    };

    try {
      await updateWajibPajak(safeId, payload);
      alert("Perubahan data wajib pajak berhasil diproses");
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Gagal memperbarui data wajib pajak.",
      );
    }
  }

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
        <div className="px-6 md:px-8 py-6 md:py-7 flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(`/wajib-pajak/${safeId}`)}
            className="text-white/95 hover:text-white transition shrink-0"
          >
            <ArrowLeft className="w-7 h-7" strokeWidth={1.8} />
          </button>

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
      </nav>

      <div className="flex-1 px-4 md:px-6 py-5 flex flex-col">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-4 md:p-5"
          style={{
            backgroundColor: THEME.cardBg,
            border: `1px solid ${THEME.border}`,
            boxShadow: "0 14px 36px rgba(15, 23, 42, 0.05)",
          }}
        >
          <section>
            <h2
              className="text-[28px] mb-8"
              style={{ color: "#1F2937", fontWeight: 700 }}
            >
              Informasi Umum
            </h2>

            <div className="space-y-5">
              <div>
                <InputLabel>NPWPD</InputLabel>
                <TextInput
                  value={npwpd}
                  onChange={(e) =>
                    setNpwpd(e.target.value.replace(/\D/g, "").slice(0, 16))
                  }
                  placeholder="Masukkan NPWPD (16 digit)"
                  inputMode="numeric"
                />
              </div>

              <div>
                <InputLabel>Kategori Usaha</InputLabel>
                <div className="flex flex-wrap gap-3">
                  <KategoriButton
                    active={kategori === "Hotel"}
                    label="Hotel"
                    tone="amber"
                    onClick={() => setKategori("Hotel")}
                  />
                  <KategoriButton
                    active={kategori === "Hiburan"}
                    label="Hiburan"
                    tone="green"
                    onClick={() => setKategori("Hiburan")}
                  />
                  <KategoriButton
                    active={kategori === "Restaurant"}
                    label="Restaurant"
                    tone="blue"
                    onClick={() => setKategori("Restaurant")}
                  />
                </div>
                <p className="text-xs mt-3" style={{ color: "#94A3B8" }}>
                  Pilih salah satu kategori usaha.
                </p>
              </div>

              <div>
                <InputLabel>Nama Usaha</InputLabel>
                <TextInput
                  value={namaUsaha}
                  onChange={(e) => setNamaUsaha(e.target.value)}
                  placeholder="Masukkan Nama Usaha"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <InputLabel>No. Telp</InputLabel>
                  <TextInput
                    value={telp}
                    onChange={(e) => setTelp(e.target.value)}
                    placeholder="+62 8..."
                  />
                </div>

                <div>
                  <InputLabel>Email</InputLabel>
                  <TextInput
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="username@gmail.com"
                    type="email"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <TimeField
                  label="Jam Buka"
                  enabled={jamBukaAktif}
                  value={jamBuka}
                  onToggle={setJamBukaAktif}
                  onChange={setJamBuka}
                />

                <TimeField
                  label="Jam Tutup"
                  enabled={jamTutupAktif}
                  value={jamTutup}
                  onToggle={setJamTutupAktif}
                  onChange={setJamTutup}
                />
              </div>

              <div>
                <InputLabel>Jenis Pos</InputLabel>
                <div className="flex flex-wrap gap-3">
                  <PosButton
                    active={jenisPos === "Tab"}
                    label="Tab"
                    onClick={() => setJenisPos("Tab")}
                  />
                  <PosButton
                    active={jenisPos === "T-107"}
                    label="T-107"
                    onClick={() => setJenisPos("T-107")}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="mt-12">
            <h2
              className="text-[28px] mb-8"
              style={{ color: "#1F2937", fontWeight: 700 }}
            >
              Lokasi Usaha
            </h2>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
              <div className="xl:col-span-7">
                <InputLabel>Peta Lokasi</InputLabel>

                <div
                  className="rounded-2xl overflow-hidden"
                  style={{
                    border: `1px solid ${THEME.border}`,
                    backgroundColor: "#F8FAFC",
                    boxShadow: "0 10px 28px rgba(15,23,42,0.05)",
                  }}
                >
                  <div
                    className="p-3 border-b"
                    style={{ borderColor: "rgba(15,23,42,0.08)" }}
                  >
                    <div className="relative" ref={searchBoxRef}>
                      <Search
                        className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2"
                        style={{ color: THEME.muted }}
                      />
                      <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void handleSearchLocation();
                          }
                        }}
                        placeholder="Cari lokasi di peta..."
                        className="w-full h-11 rounded-xl pl-11 pr-24 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                        style={{
                          border: `1px solid ${THEME.border}`,
                          backgroundColor: "#FFFFFF",
                          color: THEME.text,
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => {
                          void handleSearchLocation();
                        }}
                        className="absolute right-1.5 top-1.5 h-8 px-4 rounded-lg text-sm transition hover:-translate-y-0.5"
                        style={{
                          backgroundColor: THEME.accent,
                          color: "#FFFFFF",
                          fontWeight: 600,
                          boxShadow: "0 8px 18px rgba(30,99,214,0.20)",
                        }}
                      >
                        {searching ? "Cari..." : "Cari"}
                      </button>

                      {searchOpen && searchResults.length > 0 && (
                        <div
                          className="absolute left-0 right-0 top-full mt-2 rounded-2xl bg-white overflow-hidden z-1000"
                          style={{
                            border: `1px solid ${THEME.border}`,
                            boxShadow: "0 18px 40px rgba(15, 23, 42, 0.12)",
                          }}
                        >
                          {searchResults.map((item, index) => (
                            <button
                              key={`${item.lat}-${item.lon}-${index}`}
                              type="button"
                              onClick={() => selectSearchResult(item)}
                              className="w-full text-left px-4 py-3 hover:bg-slate-50 transition"
                              style={{
                                borderBottom:
                                  index === searchResults.length - 1
                                    ? "none"
                                    : `1px solid ${THEME.border}`,
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <MapPin
                                  className="w-4 h-4 mt-0.5 shrink-0"
                                  style={{ color: THEME.accent }}
                                />
                                <span
                                  className="text-sm"
                                  style={{ color: THEME.text, fontWeight: 500 }}
                                >
                                  {item.display_name}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ height: 420 }}>
                    <div
                      ref={mapDivRef}
                      style={{ width: "100%", height: "100%" }}
                    />
                  </div>
                </div>
              </div>

              <div className="xl:col-span-5 space-y-5">
                <div>
                  <InputLabel>Alamat</InputLabel>
                  <TextArea
                    value={alamat}
                    onChange={(e) => setAlamat(e.target.value)}
                    placeholder="Masukkan alamat lengkap usaha"
                    rows={11}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-5">
                  <div>
                    <InputLabel>Latitude</InputLabel>
                    <TextInput value={coordsLabel.lat} readOnly />
                  </div>

                  <div>
                    <InputLabel>Longitude</InputLabel>
                    <TextInput value={coordsLabel.lng} readOnly />
                  </div>
                </div>

                <div
                  className="rounded-2xl p-4"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(30,99,214,0.08), rgba(59,130,246,0.04))",
                    border: "1px solid rgba(30,99,214,0.12)",
                  }}
                >
                  <div
                    className="text-sm mb-1"
                    style={{ color: THEME.accent, fontWeight: 700 }}
                  >
                    Info Lokasi
                  </div>
                  <div
                    className="text-sm leading-6"
                    style={{ color: "#475569", fontWeight: 500 }}
                  >
                    Latitude dan longitude akan otomatis mengikuti pin pada
                    peta. Alamat diisi manual agar detail alamat tetap lengkap.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate(`/wajib-pajak/${safeId}`)}
                className="h-11 px-6 rounded-xl transition hover:-translate-y-0.5"
                style={{
                  backgroundColor: "#FFFFFF",
                  color: THEME.accent,
                  border: `1px solid rgba(30,99,214,0.28)`,
                  fontWeight: 600,
                }}
              >
                Batal
              </button>

              <button
                type="submit"
                className="h-11 px-7 rounded-xl transition hover:-translate-y-0.5"
                style={{
                  backgroundColor: THEME.accent,
                  color: "#FFFFFF",
                  border: "1px solid rgba(30,99,214,0.35)",
                  boxShadow: "0 12px 26px rgba(30,99,214,0.18)",
                  fontWeight: 700,
                }}
              >
                Simpan Perubahan
              </button>
            </div>
          </section>
        </form>

        <div
          className="pt-6 pb-3 text-center text-xs"
          style={{ color: THEME.muted }}
        >
          © {new Date().getFullYear()} {BRAND.subtitle} • PT. Biner Teknologi
          Indonesia
        </div>
      </div>
    </div>
  );
}
