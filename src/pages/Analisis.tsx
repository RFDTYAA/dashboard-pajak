import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardBody,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { getAnalisisOverview } from "../services/analisis";
import { createEmptyAnalisisOverview } from "../types/domain";
import type {
  AnalisisMonthlyFactor,
  DashboardKategori as Kategori,
  DensityPoint,
  KategoriFilter,
  KecamatanFilter as Kecamatan,
  PeriodeAnalisis as Periode,
  SupplyRow,
} from "../types/domain";

type Place = {
  id: string;
  name: string;
  category: Kategori;
  lat: number;
  lng: number;
  address?: string;
  sourceUrl?: string;
};

type LeafletMapLike = {
  remove: () => void;
  setView: (center: [number, number], zoom: number) => void;
  getZoom: () => number;
  fitBounds: (
    bounds: [[number, number], [number, number]],
    options?: { padding?: [number, number] },
  ) => void;
};

type LeafletLayerGroupLike = {
  clearLayers: () => void;
};

type LeafletGeoJSONLayerLike = {
  addTo: (layer: LeafletLayerGroupLike) => void;
};

type LeafletMarkerLike = {
  bindPopup: (html: string) => {
    addTo: (layer: LeafletLayerGroupLike) => void;
  };
};

type LeafletCircleMarkerLike = LeafletMarkerLike;
type LeafletDivIconLike = unknown;

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
    options: { maxZoom: number },
  ) => { addTo: (map: LeafletMapLike) => void };
  layerGroup: () => { addTo: (map: LeafletMapLike) => LeafletLayerGroupLike };
  circleMarker: (
    latlng: [number, number],
    options: {
      radius: number;
      color: string;
      weight: number;
      fillColor: string;
      fillOpacity: number;
      opacity: number;
    },
  ) => LeafletCircleMarkerLike;
  divIcon: (options: {
    html: string;
    className: string;
    iconSize: [number, number];
    iconAnchor: [number, number];
  }) => LeafletDivIconLike;
  marker: (
    latlng: [number, number],
    options: { icon: LeafletDivIconLike },
  ) => LeafletMarkerLike;
  geoJSON: (
    data: unknown,
    options: {
      style: (feature: unknown) => {
        weight: number;
        opacity: number;
        color: string;
        dashArray: string;
        fillOpacity: number;
        fillColor: string;
      };
      onEachFeature: (feature: unknown, layer: unknown) => void;
    },
  ) => LeafletGeoJSONLayerLike;
};

type GeoGeometry =
  | { type: "Polygon"; coordinates: unknown }
  | { type: "MultiPolygon"; coordinates: unknown }
  | { type: "Point"; coordinates: unknown }
  | { type: "MultiPoint"; coordinates: unknown }
  | { type: "LineString"; coordinates: unknown }
  | { type: "MultiLineString"; coordinates: unknown }
  | { type: "GeometryCollection"; geometries: unknown[] };

type GeoFeature = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: GeoGeometry;
};

type GeoFC = {
  type: "FeatureCollection";
  features: GeoFeature[];
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
  title: "Dashboard Analisis Aktivitas Ekonomi & Tren",
  subtitle: "Kabupaten Aceh Tengah",
};

const ACEH_TENGAH_CENTER: [number, number] = [4.6276, 96.8577];
const GEOJSON_URL = "/data/aceh-tengah-kecamatan.geojson";

function normName(s: unknown) {
  return String(s || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function densityLevel(density: number) {
  if (density >= 70) return "Ramai";
  if (density >= 45) return "Sedang";
  return "Sepi";
}

function densityColor(level: "Ramai" | "Sedang" | "Sepi") {
  if (level === "Ramai") return { fill: "#EF4444", stroke: "#B91C1C" };
  if (level === "Sedang") return { fill: "#F59E0B", stroke: "#B45309" };
  return { fill: "#22C55E", stroke: "#15803D" };
}

function densityCircleStyle(density: number) {
  const d = clamp(density, 0, 100);
  const level = densityLevel(d);
  const c = densityColor(level);
  const r = 8 + (d / 100) * 16;
  const fillOpacity = 0.15 + (d / 100) * 0.18;
  return { r, fill: c.fill, stroke: c.stroke, fillOpacity, level };
}

function formatJuta(value: number) {
  const jt = Math.round(value / 1_000_000);
  return `Rp${jt.toLocaleString("id-ID")} jt`;
}

function formatJutaHeadline(value: number) {
  const jt = Math.round(value / 1_000_000);
  return `Rp ${jt.toLocaleString("id-ID")}Jt`;
}

function formatGrowthPercentage(value: number) {
  const formatted = new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Math.abs(value));

  return `${value >= 0 ? "+" : "-"} ${formatted}%`;
}

function catChip(cat: Kategori) {
  if (cat === "Hotel") return { bg: "#FEF3C7", fg: "#B45309" };
  if (cat === "Restaurant") return { bg: "#DBEAFE", fg: "#1D4ED8" };
  return { bg: "#FCE7F3", fg: "#BE185D" };
}

function catEmoji(cat: Kategori) {
  if (cat === "Hotel") return "🏨";
  if (cat === "Restaurant") return "🍽️";
  return "🎉";
}

function iconSvg(cat: Kategori) {
  if (cat === "Hotel") {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42"><path d="M15 42s14-13.6 14-25A14 14 0 1 0 1 17c0 11.4 14 25 14 25z" fill="#7c3aed"/><circle cx="15" cy="16" r="6.5" fill="white"/><path d="M11.5 18.5v-5h1.2v1.8h2.6v-1.8h1.2v5h-1.2v-2H12.7v2h-1.2z" fill="#7c3aed"/></svg>`;
  }
  if (cat === "Restaurant") {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42"><path d="M15 42s14-13.6 14-25A14 14 0 1 0 1 17c0 11.4 14 25 14 25z" fill="#f97316"/><circle cx="15" cy="16" r="6.5" fill="white"/><path d="M12 12.5h1v7h-1v-7zm2.2 0h1v3.4c0 .9-.7 1.6-1.6 1.6h-.4v-1h.4c.3 0 .6-.3.6-.6v-3.4zm3 0h1v7h-1v-7z" fill="#f97316"/></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42"><path d="M15 42s14-13.6 14-25A14 14 0 1 0 1 17c0 11.4 14 25 14 25z" fill="#ec4899"/><circle cx="15" cy="16" r="6.5" fill="white"/><path d="M11.3 19l1.4-6h1.2l.8 3 .8-3h1.2l1.4 6h-1.2l-.7-3.1-.8 3.1h-1.2l-.8-3.1-.7 3.1h-1.2z" fill="#ec4899"/></svg>`;
}

function pickKecamatanName(feature: GeoFeature) {
  const p = feature.properties || {};
  const v = (p.kecamatan ??
    p.NAMOBJ ??
    p.WADMKC ??
    p.name ??
    p.nama) as unknown;
  return String(v || "").trim();
}

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isGeoFC(v: unknown): v is GeoFC {
  if (!isObjectRecord(v)) return false;
  if (v.type !== "FeatureCollection") return false;
  if (!Array.isArray(v.features)) return false;
  return true;
}

function flattenCoordsToLatLngs(geom: GeoGeometry): [number, number][] {
  const out: [number, number][] = [];

  const pushLonLat = (c: unknown) => {
    if (!Array.isArray(c) || c.length < 2) return;
    const lon = c[0];
    const lat = c[1];
    if (typeof lon === "number" && typeof lat === "number") {
      out.push([lat, lon]);
    }
  };

  const walk = (g: GeoGeometry) => {
    if (g.type === "Point") {
      pushLonLat(g.coordinates);
    } else if (g.type === "MultiPoint" || g.type === "LineString") {
      if (Array.isArray(g.coordinates)) {
        for (const c of g.coordinates) pushLonLat(c);
      }
    } else if (g.type === "MultiLineString" || g.type === "Polygon") {
      if (Array.isArray(g.coordinates)) {
        for (const ring of g.coordinates) {
          if (Array.isArray(ring)) {
            for (const c of ring) pushLonLat(c);
          }
        }
      }
    } else if (g.type === "MultiPolygon") {
      if (Array.isArray(g.coordinates)) {
        for (const poly of g.coordinates) {
          if (Array.isArray(poly)) {
            for (const ring of poly) {
              if (Array.isArray(ring)) {
                for (const c of ring) pushLonLat(c);
              }
            }
          }
        }
      }
    } else if (g.type === "GeometryCollection") {
      for (const gg of g.geometries) {
        if (isObjectRecord(gg) && typeof gg.type === "string") {
          walk(gg as GeoGeometry);
        }
      }
    }
  };

  walk(geom);
  return out;
}

function boundsFromFeature(
  feature: GeoFeature,
): [[number, number], [number, number]] | null {
  const pts = flattenCoordsToLatLngs(feature.geometry);
  if (pts.length === 0) return null;

  let minLat = Infinity;
  let minLng = Infinity;
  let maxLat = -Infinity;
  let maxLng = -Infinity;

  for (const [lat, lng] of pts) {
    minLat = Math.min(minLat, lat);
    minLng = Math.min(minLng, lng);
    maxLat = Math.max(maxLat, lat);
    maxLng = Math.max(maxLng, lng);
  }

  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}

function bboxFromBounds(b: [[number, number], [number, number]]) {
  const [[minLat, minLng], [maxLat, maxLng]] = b;
  return { minLat, minLng, maxLat, maxLng };
}

function buildOverpassPoiQuery(bbox: {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}) {
  const b = `${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng}`;
  return `
[out:json][timeout:25];
(
  nwr["tourism"="hotel"](${b});
  nwr["amenity"="restaurant"](${b});
  nwr["amenity"="bar"](${b});
  nwr["amenity"="pub"](${b});
  nwr["amenity"="nightclub"](${b});
  nwr["amenity"="cinema"](${b});
  nwr["tourism"="attraction"](${b});
);
out center tags;
`.trim();
}

function normalizeToKategori(tags: Record<string, unknown>): Kategori | null {
  const tourism = tags.tourism;
  const amenity = tags.amenity;

  if (tourism === "hotel") return "Hotel";
  if (amenity === "restaurant") return "Restaurant";

  const entertainment = new Set(["bar", "pub", "nightclub", "cinema"]);
  if (typeof amenity === "string" && entertainment.has(amenity)) {
    return "Hiburan & Kesenian";
  }

  if (tourism === "attraction") return "Hiburan & Kesenian";
  return null;
}

function CustomSelect<T extends string>({
  value,
  options,
  onChange,
}: {
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
    <div className="relative w-full" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full inline-flex items-center justify-between gap-3 px-4 py-3 rounded-xl border bg-white hover:bg-slate-50 transition text-sm"
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
  );
}

export default function Analisis() {
  const navigate = useNavigate();

  const [periode, setPeriode] = useState<Periode>("1 Tahun Terakhir");
  const [kategori, setKategori] = useState<KategoriFilter>("Semua");
  const [kecamatan, setKecamatan] = useState<Kecamatan>("Semua");
  const [overview, setOverview] = useState(() => createEmptyAnalisisOverview());

  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMapLike | null>(null);
  const layerRef = useRef<LeafletLayerGroupLike | null>(null);

  const [geo, setGeo] = useState<GeoFC | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  const [poi, setPoi] = useState<Place[]>([]);
  const [poiLoading, setPoiLoading] = useState(false);
  const [poiError, setPoiError] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;

    const run = async () => {
      try {
        const result = await getAnalisisOverview(
          {
            periode,
            kategori,
            kecamatan,
          },
          controller.signal,
        );

        if (!alive) return;
        setOverview(result);
      } catch {
        if (!alive || controller.signal.aborted) return;
        setOverview(createEmptyAnalisisOverview());
      }
    };

    void run();

    return () => {
      alive = false;
      controller.abort();
    };
  }, [periode, kategori, kecamatan]);

  const densityPoints: DensityPoint[] = overview.densityPoints;

  const densityByKecamatan = useMemo(() => {
    const acc: Record<string, { sum: number; n: number }> = {};

    for (const d of densityPoints) {
      const key = normName(d.kecamatan);
      if (!acc[key]) acc[key] = { sum: 0, n: 0 };
      acc[key].sum += d.density;
      acc[key].n += 1;
    }

    const out: Record<string, number> = {};
    for (const k of Object.keys(acc)) {
      out[k] = acc[k].sum / Math.max(1, acc[k].n);
    }

    return out;
  }, [densityPoints]);

  const filteredDensity = useMemo(() => {
    return densityPoints.filter((d) =>
      kecamatan === "Semua" ? true : d.kecamatan === kecamatan,
    );
  }, [densityPoints, kecamatan]);

  const busiestArea = useMemo(() => {
    const best = filteredDensity
      .slice()
      .sort((a, b) => b.density - a.density)[0];
    const fallback = densityPoints
      .slice()
      .sort((a, b) => b.density - a.density)[0];
    return best ?? fallback ?? null;
  }, [filteredDensity, densityPoints]);

  const selectedGeoFeature = useMemo(() => {
    if (!geo) return null;
    if (kecamatan === "Semua") return null;

    const target = normName(kecamatan);
    const feature = geo.features.find(
      (x) => normName(pickKecamatanName(x)) === target,
    );

    return feature || null;
  }, [geo, kecamatan]);

  const selectedBounds = useMemo(() => {
    if (!selectedGeoFeature) return null;
    return boundsFromFeature(selectedGeoFeature);
  }, [selectedGeoFeature]);

  const boundsKey = useMemo(() => {
    if (!selectedBounds) return "ALL";
    const [[a, b], [c, d]] = selectedBounds;
    return `${a.toFixed(5)},${b.toFixed(5)},${c.toFixed(5)},${d.toFixed(5)}`;
  }, [selectedBounds]);

  const supplyRows: SupplyRow[] = useMemo(() => {
    if (kecamatan === "Semua") return overview.supplyRows;
    return overview.supplyRows.filter((row) => row.kecamatan === kecamatan);
  }, [overview.supplyRows, kecamatan]);

  const faktorBulanan: AnalisisMonthlyFactor[] = overview.factors;

  const headlineKecamatan = useMemo(() => {
    if (overview.summary.headlineKecamatan?.trim()) {
      return overview.summary.headlineKecamatan;
    }

    if (kecamatan !== "Semua") {
      return kecamatan;
    }

    return busiestArea?.kecamatan ?? "Semua";
  }, [overview.summary.headlineKecamatan, kecamatan, busiestArea]);

  const headlineEstimasi = useMemo(() => {
    if (typeof overview.summary.headlineEstimasi === "number") {
      return overview.summary.headlineEstimasi;
    }

    const row = supplyRows.find((item) => item.kecamatan === headlineKecamatan);
    return row ? row.estimasi : 0;
  }, [overview.summary.headlineEstimasi, supplyRows, headlineKecamatan]);

  const growthPercentage = overview.summary.growthPercentage ?? 0;
  const recommendationText =
    overview.summary.recommendation || "Belum ada data dari backend & ML.";

  useEffect(() => {
    let alive = true;
    const ctrl = new AbortController();

    const run = async () => {
      setGeoError(null);

      try {
        const res = await fetch(GEOJSON_URL, {
          cache: "no-store",
          signal: ctrl.signal,
        });

        if (!res.ok) {
          throw new Error("GeoJSON kecamatan tidak ditemukan di public/data.");
        }

        const json: unknown = await res.json();
        if (!alive) return;

        if (!isGeoFC(json)) {
          throw new Error("Format GeoJSON tidak valid.");
        }

        setGeo(json);
      } catch (e) {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : "Gagal memuat GeoJSON.";
        setGeo(null);
        setGeoError(msg);
      }
    };

    void run();

    return () => {
      alive = false;
      ctrl.abort();
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const ctrl = new AbortController();

    const loadPoiForBounds = async (
      bounds: [[number, number], [number, number]],
    ) => {
      const bbox = bboxFromBounds(bounds);
      const cacheKey = `poi_osm_v1_${bbox.minLat.toFixed(4)}_${bbox.minLng.toFixed(4)}_${bbox.maxLat.toFixed(4)}_${bbox.maxLng.toFixed(4)}`;

      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as { ts: number; data: Place[] };
          if (Date.now() - parsed.ts < 1000 * 60 * 60 * 12) {
            return parsed.data;
          }
        } catch {
          void 0;
        }
      }

      const query = buildOverpassPoiQuery(bbox);
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        body: new URLSearchParams({ data: query }).toString(),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        throw new Error(
          "Gagal mengambil POI (Overpass). Coba beberapa saat lagi.",
        );
      }

      const json: unknown = await res.json();
      const elements =
        typeof json === "object" &&
        json !== null &&
        Array.isArray((json as Record<string, unknown>).elements)
          ? ((json as Record<string, unknown>).elements as unknown[])
          : [];

      const out: Place[] = [];

      for (const el of elements) {
        if (typeof el !== "object" || el === null) continue;
        const r = el as Record<string, unknown>;

        const tags =
          typeof r.tags === "object" && r.tags !== null
            ? (r.tags as Record<string, unknown>)
            : {};

        const cat = normalizeToKategori(tags);
        if (!cat) continue;

        const lat =
          typeof r.lat === "number"
            ? r.lat
            : typeof r.center === "object" &&
                r.center !== null &&
                typeof (r.center as Record<string, unknown>).lat === "number"
              ? ((r.center as Record<string, unknown>).lat as number)
              : null;

        const lng =
          typeof r.lon === "number"
            ? r.lon
            : typeof r.center === "object" &&
                r.center !== null &&
                typeof (r.center as Record<string, unknown>).lon === "number"
              ? ((r.center as Record<string, unknown>).lon as number)
              : null;

        if (lat == null || lng == null) continue;

        const nameRaw = tags.name;
        const name =
          typeof nameRaw === "string" && nameRaw.trim().length
            ? nameRaw.trim()
            : cat === "Hotel"
              ? "Hotel"
              : cat === "Restaurant"
                ? "Restoran"
                : "Hiburan";

        const addrParts = [
          tags["addr:street"],
          tags["addr:housenumber"],
          tags["addr:suburb"],
          tags["addr:city"],
          tags["addr:postcode"],
        ]
          .map((x) => (typeof x === "string" ? x.trim() : ""))
          .filter((x) => x.length);

        const address = addrParts.length ? addrParts.join(", ") : undefined;

        const type = typeof r.type === "string" ? r.type : "node";
        const idNum =
          typeof r.id === "number" ? String(r.id) : String(r.id || "");
        const id = `${type}/${idNum}`;

        const sourceUrl =
          type === "node"
            ? `https://www.openstreetmap.org/node/${idNum}`
            : type === "way"
              ? `https://www.openstreetmap.org/way/${idNum}`
              : `https://www.openstreetmap.org/relation/${idNum}`;

        out.push({ id, name, category: cat, lat, lng, address, sourceUrl });
      }

      localStorage.setItem(
        cacheKey,
        JSON.stringify({ ts: Date.now(), data: out }),
      );

      return out;
    };

    const run = async () => {
      setPoiError(null);
      setPoiLoading(true);

      let shouldApply = true;

      try {
        const bounds = selectedBounds || [
          [ACEH_TENGAH_CENTER[0] - 0.15, ACEH_TENGAH_CENTER[1] - 0.15],
          [ACEH_TENGAH_CENTER[0] + 0.15, ACEH_TENGAH_CENTER[1] + 0.15],
        ];

        const data = await loadPoiForBounds(bounds);

        if (!alive) {
          shouldApply = false;
          return;
        }

        const filtered =
          kategori === "Semua"
            ? data
            : data.filter((x) => x.category === kategori);

        setPoi(filtered);
      } catch (e) {
        if (!alive) {
          shouldApply = false;
          return;
        }

        const msg = e instanceof Error ? e.message : "Gagal memuat POI.";
        setPoi([]);
        setPoiError(msg);
      } finally {
        if (alive && shouldApply) {
          setPoiLoading(false);
        }
      }
    };

    void run();

    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [kategori, boundsKey, selectedBounds]);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (!mapDivRef.current) return;

      const mod = (await import("leaflet")) as unknown as { default: unknown };
      const L = mod.default as LeafletLike;

      if (!alive) return;

      if (!mapRef.current) {
        mapRef.current = L.map(mapDivRef.current, {
          center: ACEH_TENGAH_CENTER,
          zoom: 12,
          zoomControl: true,
          scrollWheelZoom: true,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
        }).addTo(mapRef.current);

        layerRef.current = L.layerGroup().addTo(mapRef.current);
      }

      const map = mapRef.current;
      const layer = layerRef.current;

      if (!map || !layer) return;

      layer.clearLayers();

      const levelFromKecamatan = (kecName: string) => {
        const d = densityByKecamatan[normName(kecName)] ?? 0;
        return densityLevel(d);
      };

      if (geo && geo.features.length) {
        const choroplethStyle = (feature: unknown) => {
          const f = feature as GeoFeature;
          const name = pickKecamatanName(f);
          const level = levelFromKecamatan(name);
          const c = densityColor(level);

          return {
            weight: 2,
            opacity: 1,
            color: "#ffffff",
            dashArray: "4 4",
            fillOpacity: 0.55,
            fillColor: c.fill,
          };
        };

        const onEach = (feature: unknown, lyr: unknown) => {
          const f = feature as GeoFeature;
          const layerLike = lyr as {
            bindPopup?: (h: string) => void;
            on?: (evt: string, cb: () => void) => void;
            setStyle?: (s: Record<string, unknown>) => void;
          };

          const name = pickKecamatanName(f);
          const d = densityByKecamatan[normName(name)] ?? 0;
          const level = densityLevel(d);
          const c = densityColor(level);

          const html = `
            <div style="font-family: ui-sans-serif, system-ui; line-height: 1.25; min-width: 220px;">
              <div style="font-weight: 900; margin-bottom: 6px;">${name || "Kecamatan"}</div>
              <div style="font-size: 12px; margin-bottom: 4px;">Status: <b style="color:${c.stroke}">${level}</b></div>
              <div style="font-size: 12px; margin-bottom: 8px;">Skor Aktivitas: <b>${Math.round(d)}/100</b></div>
              <div style="font-size: 12px; color: #475569;">Klik polygon untuk filter kecamatan.</div>
            </div>
          `;

          if (typeof layerLike.bindPopup === "function") {
            layerLike.bindPopup(html);
          }

          const mapToUi: Record<string, Exclude<Kecamatan, "Semua">> = {
            BEBESEN: "Bebesen",
            KEBAYAKAN: "Kebayakan",
            LUTTAWAR: "Lut Tawar",
            PEGASING: "Pegasing",
          };

          if (typeof layerLike.on === "function") {
            layerLike.on("click", () => {
              const key = normName(name);
              const ui = mapToUi[key];
              if (ui) setKecamatan(ui);
            });

            layerLike.on("mouseover", () => {
              if (typeof layerLike.setStyle === "function") {
                layerLike.setStyle({ weight: 3, fillOpacity: 0.75 });
              }
            });

            layerLike.on("mouseout", () => {
              if (typeof layerLike.setStyle === "function") {
                layerLike.setStyle({ weight: 2, fillOpacity: 0.55 });
              }
            });
          }
        };

        L.geoJSON(geo as unknown, {
          style: choroplethStyle,
          onEachFeature: onEach,
        }).addTo(layer);

        if (selectedBounds) {
          map.fitBounds(selectedBounds, { padding: [16, 16] });
        }
      }

      for (const d of filteredDensity) {
        const s = densityCircleStyle(d.density);
        const popupHtml = `
          <div style="font-family: ui-sans-serif, system-ui; line-height: 1.25;">
            <div style="font-weight: 800; margin-bottom: 4px;">${d.name}</div>
            <div style="font-size: 12px; margin-bottom: 4px;">Kecamatan: ${d.kecamatan}</div>
            <div style="font-size: 12px; margin-bottom: 6px;">Kepadatan: ${d.density}/100 (${s.level})</div>
            <div style="font-size: 12px; color: #475569;">${d.note}</div>
          </div>
        `;

        L.circleMarker([d.lat, d.lng], {
          radius: s.r,
          color: s.stroke,
          weight: 2,
          fillColor: s.fill,
          fillOpacity: s.fillOpacity,
          opacity: 0.75,
        })
          .bindPopup(popupHtml)
          .addTo(layer);
      }

      const makePinIcon = (cat: Kategori) => {
        const html = iconSvg(cat);
        return L.divIcon({
          html,
          className: "poi-icon",
          iconSize: [30, 42],
          iconAnchor: [15, 42],
        });
      };

      for (const p of poi) {
        const ch = catChip(p.category);
        const popup = `
          <div style="font-family: ui-sans-serif, system-ui; line-height: 1.25; min-width: 240px;">
            <div style="font-weight: 900; margin-bottom: 6px;">${catEmoji(p.category)} ${p.name}</div>
            ${p.address ? `<div style="font-size: 12px; margin-bottom: 6px;">${p.address}</div>` : ""}
            <span style="display:inline-flex;padding:6px 10px;border-radius:999px;background:${ch.bg};color:${ch.fg};font-weight:900;font-size:11px;border:1px solid rgba(15,23,42,0.10);">${p.category}</span>
            ${p.sourceUrl ? `<div style="margin-top:10px;"><a href="${p.sourceUrl}" target="_blank" rel="noreferrer" style="font-size:12px;font-weight:800;color:#2563eb;text-decoration:none;">Lihat sumber</a></div>` : ""}
          </div>
        `;

        L.marker([p.lat, p.lng], { icon: makePinIcon(p.category) })
          .bindPopup(popup)
          .addTo(layer);
      }

      if (!selectedBounds) {
        map.setView(ACEH_TENGAH_CENTER, map.getZoom());
      }
    };

    void run();

    return () => {
      alive = false;
    };
  }, [geo, selectedBounds, densityByKecamatan, filteredDensity, poi]);

  useEffect(() => {
    return () => {
      const map = mapRef.current;
      if (map) {
        map.remove();
        mapRef.current = null;
        layerRef.current = null;
      }
    };
  }, []);

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
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="text-white/95 hover:text-white transition shrink-0"
          >
            <ArrowLeft className="w-7 h-7" strokeWidth={1.8} />
          </button>

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

      <div className="flex-1 px-4 md:px-6 py-5 flex flex-col gap-6">
        <div
          className="bg-white rounded-2xl shadow-sm p-5 md:p-6"
          style={{ border: `1px solid ${THEME.border}` }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CustomSelect
              value={`Periode: ${periode}`}
              options={[
                "Periode: 1 Tahun Terakhir",
                "Periode: 6 Bulan Terakhir",
                "Periode: 3 Bulan Terakhir",
              ]}
              onChange={(value) =>
                setPeriode(value.replace("Periode: ", "") as Periode)
              }
            />

            <CustomSelect
              value={`Kategori Pajak: ${kategori}`}
              options={[
                "Kategori Pajak: Semua",
                "Kategori Pajak: Hotel",
                "Kategori Pajak: Restaurant",
                "Kategori Pajak: Hiburan & Kesenian",
              ]}
              onChange={(value) =>
                setKategori(
                  value.replace("Kategori Pajak: ", "") as KategoriFilter,
                )
              }
            />

            <CustomSelect
              value={`Kecamatan: ${kecamatan}`}
              options={[
                "Kecamatan: Semua",
                "Kecamatan: Bebesen",
                "Kecamatan: Kebayakan",
                "Kecamatan: Lut Tawar",
                "Kecamatan: Pegasing",
              ]}
              onChange={(value) =>
                setKecamatan(value.replace("Kecamatan: ", "") as Kecamatan)
              }
            />
          </div>

          {(geoError || poiError || poiLoading) && (
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {poiLoading ? (
                <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
                  Memuat POI...
                </span>
              ) : null}
              {geoError ? (
                <span className="px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700">
                  {geoError}
                </span>
              ) : null}
              {poiError ? (
                <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800">
                  {poiError}
                </span>
              ) : null}
            </div>
          )}
        </div>

        <div className="grid grid-cols-12 gap-6">
          <Card className="col-span-12 xl:col-span-8 border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
            <CardBody className="p-0 h-full">
              <div className="px-6 md:px-7 pt-6 md:pt-7 pb-6 border-b border-slate-100">
                <div className="text-xs font-extrabold text-slate-500">
                  Area Teramai Saat Ini
                </div>

                <div className="mt-2 text-2xl md:text-3xl text-slate-900 tracking-tight">
                  <span style={{ fontWeight: 700 }}>
                    Kecamatan {headlineKecamatan}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-lg md:text-xl text-slate-900">
                      <span style={{ fontWeight: 800 }}>
                        {formatJutaHeadline(headlineEstimasi)}
                      </span>
                      <span
                        className="text-sm text-slate-500"
                        style={{ fontWeight: 600 }}
                      >
                        {" "}
                        / tahun
                      </span>
                    </div>

                    <div className="text-sm text-emerald-600">
                      <span style={{ fontWeight: 800 }}>
                        {formatGrowthPercentage(growthPercentage)}
                      </span>
                      <span
                        className="text-slate-500"
                        style={{ fontWeight: 600 }}
                      >
                        {" "}
                        dari bulan lalu
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-3 h-3 rounded-full bg-red-500" />
                    <span
                      className="text-xs text-slate-600"
                      style={{ fontWeight: 700 }}
                    >
                      Ramai
                    </span>

                    <span className="w-3 h-3 rounded-full ml-3 bg-amber-500" />
                    <span
                      className="text-xs text-slate-600"
                      style={{ fontWeight: 700 }}
                    >
                      Sedang
                    </span>

                    <span className="w-3 h-3 rounded-full ml-3 bg-emerald-500" />
                    <span
                      className="text-xs text-slate-600"
                      style={{ fontWeight: 700 }}
                    >
                      Sepi
                    </span>
                  </div>
                </div>
              </div>

              <div className="px-6 md:px-7 pt-7 md:pt-8 pb-7 md:pb-8">
                <div
                  className="text-sm text-slate-800 mb-4"
                  style={{ fontWeight: 700 }}
                >
                  Map
                </div>

                <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white">
                  <div className="h-120 lg:h-140 w-full">
                    <div ref={mapDivRef} className="h-full w-full" />
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="col-span-12 xl:col-span-4 border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
            <CardBody className="p-6 md:p-7 h-full flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div
                    className="text-sm text-slate-800"
                    style={{ fontWeight: 700 }}
                  >
                    Faktor
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Ringkasan penggerak aktivitas per bulan
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-700">
                  <span style={{ fontWeight: 700 }}>{headlineKecamatan}</span>
                </span>
              </div>

              <div className="mt-6 flex-1 overflow-auto pr-1">
                <div className="space-y-4">
                  {faktorBulanan.map((f) => (
                    <div key={f.bulan} className="flex items-start gap-3">
                      <span className="mt-0.5 text-emerald-600">✓</span>
                      <div className="min-w-0">
                        <div
                          className="text-slate-800"
                          style={{ fontWeight: 800 }}
                        >
                          {f.bulan}:
                        </div>
                        <div className="text-slate-600 text-sm leading-6">
                          {f.teks}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 leading-6">
                <span style={{ fontWeight: 700 }}>{recommendationText}</span>
              </div>
            </CardBody>
          </Card>

          <Card className="col-span-12 border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
            <CardBody className="p-6 md:p-7">
              <div className="flex items-start justify-between gap-3 mb-6">
                <div>
                  <div
                    className="text-sm text-slate-800"
                    style={{ fontWeight: 700 }}
                  >
                    Estimasi Kebutuhan Suplai (HoReCa)
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Klik kecamatan di peta untuk memfilter.
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-700">
                  <span style={{ fontWeight: 700 }}>
                    {kecamatan === "Semua" ? "Semua" : kecamatan}
                  </span>
                </span>
              </div>

              <div className="w-full overflow-auto rounded-2xl border border-slate-200">
                <Table
                  aria-label="Supply table"
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
                    <TableColumn className="bg-transparent text-slate-500 font-extrabold text-[11px] uppercase text-center min-w-48">
                      Kecamatan
                    </TableColumn>
                    <TableColumn className="bg-transparent text-slate-500 font-extrabold text-[11px] uppercase text-center min-w-44">
                      Estimasi
                    </TableColumn>
                    <TableColumn className="bg-transparent text-slate-500 font-extrabold text-[11px] uppercase text-center min-w-28">
                      Ikan (kg)
                    </TableColumn>
                    <TableColumn className="bg-transparent text-slate-500 font-extrabold text-[11px] uppercase text-center min-w-28">
                      Ayam (ekor)
                    </TableColumn>
                    <TableColumn className="bg-transparent text-slate-500 font-extrabold text-[11px] uppercase text-center min-w-28">
                      Beras (ton)
                    </TableColumn>
                  </TableHeader>

                  <TableBody>
                    {supplyRows.map((r, i) => (
                      <TableRow
                        key={r.kecamatan}
                        className="border-b border-slate-50 last:border-none hover:bg-slate-50 transition-colors"
                      >
                        <TableCell className="text-center px-4 py-4">
                          <span
                            className="text-slate-700 text-sm"
                            style={{ fontWeight: 800 }}
                          >
                            {i + 1}
                          </span>
                        </TableCell>

                        <TableCell className="text-center px-4 py-4">
                          <span
                            className="text-slate-700 text-sm"
                            style={{ fontWeight: 800 }}
                          >
                            {r.kecamatan}
                          </span>
                        </TableCell>

                        <TableCell className="text-center px-4 py-4">
                          <span
                            className="text-slate-900 text-sm"
                            style={{ fontWeight: 800 }}
                          >
                            {formatJuta(r.estimasi)}
                          </span>
                        </TableCell>

                        <TableCell className="text-center px-4 py-4">
                          <span
                            className="text-slate-700 text-sm"
                            style={{ fontWeight: 600 }}
                          >
                            {r.ikanKg.toLocaleString("id-ID")}
                          </span>
                        </TableCell>

                        <TableCell className="text-center px-4 py-4">
                          <span
                            className="text-slate-700 text-sm"
                            style={{ fontWeight: 600 }}
                          >
                            {r.ayamEkor.toLocaleString("id-ID")}
                          </span>
                        </TableCell>

                        <TableCell className="text-center px-4 py-4">
                          <span
                            className="text-slate-700 text-sm"
                            style={{ fontWeight: 600 }}
                          >
                            {r.berasTon.toLocaleString("id-ID")}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </div>

        <div
          className="pt-2 text-center text-xs"
          style={{ color: THEME.muted }}
        >
          © 2026 Kabupaten Aceh Tengah • PT. Biner Teknologi Indonesia
        </div>

        <style>{`
          .poi-icon { background: transparent; border: none; }
          .leaflet-container { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }
        `}</style>
      </div>
    </div>
  );
}
