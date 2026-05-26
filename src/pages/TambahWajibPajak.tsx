import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Clock3, MapPin, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import {
  createWajibPajak,
  getBusinessTypes,
  getCities,
  getPosTypes,
  type BusinessTypeOption,
  type CityOption,
  type PosTypeOption,
  type WajibPajakBackendPayload,
} from "../services/wajibPajak";

type SearchResult = {
  display_name: string;
  lat: string;
  lon: string;
};

type Tone = "amber" | "green" | "blue" | "purple" | "slate";

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
  title: "Tambah Data Wajib Pajak",
  subtitle: "Kabupaten Aceh Tengah",
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatCoordinate(value: number) {
  return value.toFixed(6);
}

function isAllowedBusinessType(name: string) {
  const lower = name.toLowerCase();

  if (lower.includes("listrik")) return false;

  return (
    lower.includes("hotel") ||
    lower.includes("restaurant") ||
    lower.includes("restoran") ||
    lower.includes("hiburan") ||
    lower.includes("kesenian") ||
    lower.includes("parkir")
  );
}

function getBusinessTypeLabel(name: string) {
  const lower = name.toLowerCase();

  if (lower.includes("hiburan") || lower.includes("kesenian")) {
    return "Hiburan & Kesenian";
  }

  if (lower.includes("parkir")) return "Jasa Parkir";
  if (lower.includes("hotel")) return "Hotel";

  return "Restaurant";
}

function getToneByName(name: string): Tone {
  const lower = name.toLowerCase();

  if (lower.includes("hotel")) return "amber";
  if (lower.includes("hiburan") || lower.includes("kesenian")) return "green";
  if (lower.includes("parkir")) return "purple";
  if (lower.includes("restaurant") || lower.includes("restoran")) return "blue";

  return "slate";
}

function getToneStyle(tone: Tone, active: boolean) {
  if (tone === "amber") {
    return {
      bg: active ? "#F59E0B" : "#FFF7ED",
      fg: active ? "#FFFFFF" : "#C2410C",
      border: active ? "#F59E0B" : "rgba(245,158,11,0.24)",
      shadow: active ? "0 10px 22px rgba(245,158,11,0.22)" : "none",
    };
  }

  if (tone === "green") {
    return {
      bg: active ? "#10B981" : "#ECFDF5",
      fg: active ? "#FFFFFF" : "#047857",
      border: active ? "#10B981" : "rgba(16,185,129,0.24)",
      shadow: active ? "0 10px 22px rgba(16,185,129,0.22)" : "none",
    };
  }

  if (tone === "purple") {
    return {
      bg: active ? "#9333EA" : "#F3E8FF",
      fg: active ? "#FFFFFF" : "#7E22CE",
      border: active ? "#9333EA" : "rgba(147,51,234,0.24)",
      shadow: active ? "0 10px 22px rgba(147,51,234,0.22)" : "none",
    };
  }

  if (tone === "slate") {
    return {
      bg: active ? "#475569" : "#F8FAFC",
      fg: active ? "#FFFFFF" : "#334155",
      border: active ? "#475569" : "rgba(71,85,105,0.24)",
      shadow: active ? "0 10px 22px rgba(71,85,105,0.18)" : "none",
    };
  }

  return {
    bg: active ? "#3B82F6" : "#EFF6FF",
    fg: active ? "#FFFFFF" : "#1D4ED8",
    border: active ? "#3B82F6" : "rgba(59,130,246,0.24)",
    shadow: active ? "0 10px 22px rgba(59,130,246,0.22)" : "none",
  };
}

function KategoriButton({
  active,
  label,
  tone,
  disabled,
  onClick,
}: {
  active: boolean;
  label: string;
  tone: Tone;
  disabled?: boolean;
  onClick: () => void;
}) {
  const toneStyle = getToneStyle(tone, active);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="px-4 py-2 rounded-full text-sm transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
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
  label: string;
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
        backgroundColor: props.disabled ? "#F8FAFC" : "#FFFFFF",
        color: props.disabled ? "#94A3B8" : THEME.text,
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
        backgroundColor: props.disabled ? "#F8FAFC" : "#FFFFFF",
        color: props.disabled ? "#94A3B8" : THEME.text,
        ...props.style,
      }}
    />
  );
}

function SelectInput({
  value,
  options,
  placeholder,
  disabled,
  onChange,
}: {
  value: string;
  options: CityOption[];
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="w-full h-12 rounded-xl px-4 text-sm outline-none transition-all duration-200 disabled:cursor-not-allowed disabled:bg-slate-50"
      style={{
        border: `1px solid ${THEME.border}`,
        backgroundColor: disabled ? "#F8FAFC" : "#FFFFFF",
        color: value ? THEME.text : THEME.muted,
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((item) => (
        <option key={item.id} value={item.id}>
          {item.name}
        </option>
      ))}
    </select>
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
            border: `1px solid ${
              enabled ? "rgba(30,99,214,0.24)" : THEME.border
            }`,
            backgroundColor: enabled ? "#FFFFFF" : "#F8FAFC",
            color: enabled ? THEME.text : "#94A3B8",
          }}
        />
      </div>
    </div>
  );
}

export default function TambahWajibPajak() {
  const navigate = useNavigate();

  const [npwpd, setNpwpd] = useState("");
  const [businessTypes, setBusinessTypes] = useState<BusinessTypeOption[]>([]);
  const [kategoriId, setKategoriId] = useState("");
  const [namaUsaha, setNamaUsaha] = useState("");
  const [telp, setTelp] = useState("");
  const [email, setEmail] = useState("");
  const [jamBukaAktif, setJamBukaAktif] = useState(true);
  const [jamBuka, setJamBuka] = useState("08:00");
  const [jamTutupAktif, setJamTutupAktif] = useState(true);
  const [jamTutup, setJamTutup] = useState("22:00");
  const [posTypes, setPosTypes] = useState<PosTypeOption[]>([]);
  const [jenisPosId, setJenisPosId] = useState("");
  const [cities, setCities] = useState<CityOption[]>([]);
  const [citiesId, setCitiesId] = useState("");
  const [alamat, setAlamat] = useState("");
  const [latitude, setLatitude] = useState(4.6276);
  const [longitude, setLongitude] = useState(96.8577);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [loadingMaster, setLoadingMaster] = useState(true);
  const [masterError, setMasterError] = useState("");
  const [saving, setSaving] = useState(false);

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

    async function loadMasterData() {
      try {
        setLoadingMaster(true);
        setMasterError("");

        const [businessTypeRows, posTypeRows, cityRows] = await Promise.all([
          getBusinessTypes(controller.signal),
          getPosTypes(controller.signal),
          getCities(controller.signal),
        ]);

        const filteredBusinessTypes = businessTypeRows.filter((item) =>
          isAllowedBusinessType(item.name),
        );

        setBusinessTypes(filteredBusinessTypes);
        setPosTypes(posTypeRows);
        setCities(cityRows);

        setKategoriId(
          (current) => current || filteredBusinessTypes[0]?.id || "",
        );
        setJenisPosId((current) => current || posTypeRows[0]?.id || "");
        setCitiesId((current) => current || cityRows[0]?.id || "");
      } catch (error) {
        if (controller.signal.aborted) return;

        setMasterError(
          error instanceof Error
            ? error.message
            : "Gagal mengambil data master dari backend.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoadingMaster(false);
        }
      }
    }

    void loadMasterData();

    return () => controller.abort();
  }, []);

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

    const initialLatitude = latitude;
    const initialLongitude = longitude;

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
        center: [initialLatitude, initialLongitude],
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

      const marker = L.marker([initialLatitude, initialLongitude], {
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
  });

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

    if (!kategoriId) {
      alert("Kategori usaha wajib dipilih.");
      return;
    }

    if (!jenisPosId) {
      alert("Jenis POS wajib dipilih.");
      return;
    }

    if (!citiesId) {
      alert("Kota/Kabupaten wajib dipilih.");
      return;
    }

    const payload: WajibPajakBackendPayload = {
      npwpd,
      kategori: kategoriId,
      namaUsaha,
      telp,
      email,
      jamBuka: jamBukaAktif ? jamBuka : null,
      jamTutup: jamTutupAktif ? jamTutup : null,
      jenisPos: jenisPosId,
      alamat,
      latitude,
      longitude,
      citiesId,
    };

    try {
      setSaving(true);
      await createWajibPajak(payload);
      alert("Data wajib pajak berhasil disimpan");
      navigate("/wajib-pajak");
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan data wajib pajak.",
      );
    } finally {
      setSaving(false);
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
            onClick={() => navigate("/wajib-pajak")}
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
            <div className="text-white/80 text-sm mt-1">{BRAND.subtitle}</div>
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

            {masterError && (
              <div
                className="mb-5 rounded-xl px-4 py-3 text-sm"
                style={{
                  backgroundColor: "#FEF2F2",
                  color: "#B91C1C",
                  border: "1px solid #FECACA",
                  fontWeight: 600,
                }}
              >
                {masterError}
              </div>
            )}

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
                  required
                />
              </div>

              <div>
                <InputLabel>Kategori Usaha</InputLabel>
                <div className="flex flex-wrap gap-3">
                  {loadingMaster && businessTypes.length === 0 ? (
                    <span className="text-sm text-slate-400">
                      Memuat kategori usaha...
                    </span>
                  ) : businessTypes.length === 0 ? (
                    <span className="text-sm text-red-500">
                      Data kategori usaha belum tersedia.
                    </span>
                  ) : (
                    businessTypes.map((item) => {
                      const label = getBusinessTypeLabel(item.name);

                      return (
                        <KategoriButton
                          key={item.id}
                          active={kategoriId === item.id}
                          label={label}
                          tone={getToneByName(item.name)}
                          disabled={!item.isActive}
                          onClick={() => setKategoriId(item.id)}
                        />
                      );
                    })
                  )}
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
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <InputLabel>No. Telp</InputLabel>
                  <TextInput
                    value={telp}
                    onChange={(e) => setTelp(e.target.value)}
                    placeholder="081234567890"
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
                  {loadingMaster && posTypes.length === 0 ? (
                    <span className="text-sm text-slate-400">
                      Memuat jenis POS...
                    </span>
                  ) : posTypes.length === 0 ? (
                    <span className="text-sm text-red-500">
                      Data jenis POS belum tersedia.
                    </span>
                  ) : (
                    posTypes.map((item) => (
                      <PosButton
                        key={item.id}
                        active={jenisPosId === item.id}
                        label={item.name}
                        onClick={() => setJenisPosId(item.id)}
                      />
                    ))
                  )}
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
                    rows={8}
                    required
                  />
                </div>

                <div>
                  <InputLabel>Kota/Kabupaten</InputLabel>
                  <SelectInput
                    value={citiesId}
                    options={cities}
                    disabled={loadingMaster}
                    placeholder={
                      loadingMaster
                        ? "Memuat kota/kabupaten..."
                        : "Pilih kota/kabupaten"
                    }
                    onChange={setCitiesId}
                  />
                  {cities.length === 0 && !loadingMaster && (
                    <p className="text-xs mt-2" style={{ color: "#DC2626" }}>
                      Data kota/kabupaten belum tersedia dari backend.
                    </p>
                  )}
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
              </div>
            </div>

            <div className="mt-10 flex justify-end gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => navigate("/wajib-pajak")}
                className="h-11 px-6 rounded-xl transition hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
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
                disabled={saving || loadingMaster}
                className="h-11 px-7 rounded-xl transition hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: THEME.accent,
                  color: "#FFFFFF",
                  border: "1px solid rgba(30,99,214,0.35)",
                  boxShadow: "0 12px 26px rgba(30,99,214,0.18)",
                  fontWeight: 700,
                }}
              >
                {saving ? "Menyimpan..." : "Simpan"}
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
