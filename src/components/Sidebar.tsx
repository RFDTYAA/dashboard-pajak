import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { clearAuthSession } from "../lib/api";

type Props = {
  collapsed: boolean;
  onToggle: () => void;
};

const NAV = [
  { label: "Beranda", to: "/dashboard", icon: LayoutDashboard },
  { label: "Daftar Wajib Pajak", to: "/wajib-pajak", icon: Users },
  { label: "Laporan Transaksi", to: "/laporan", icon: FileText },
  { label: "Pengaturan", to: "/pengaturan", icon: Settings },
];

function cn(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

export default function Sidebar({ collapsed, onToggle }: Props) {
  const navigate = useNavigate();

  const border = "rgba(15, 23, 42, 0.10)";
  const muted = "#64748B";
  const text = "#0F172A";
  const accent = "#1E63D6";

  const width = collapsed ? 92 : 300;

  const handleLogout = () => {
    clearAuthSession();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="h-screen sticky top-0 left-0 shrink-0" style={{ width }}>
      <div
        className="h-full bg-white overflow-hidden flex flex-col"
        style={{
          width,
          borderRight: `1px solid ${border}`,
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
          boxShadow: "10px 0 30px rgba(15, 23, 42, 0.08)",
        }}
      >
        <div className={cn("pt-4 pb-4", collapsed ? "px-3" : "px-6")}>
          <div
            className={cn(
              "flex items-center",
              collapsed ? "justify-center" : "gap-3",
            )}
          >
            <button
              type="button"
              onClick={onToggle}
              className="w-11 h-11 rounded-2xl flex items-center justify-center hover:bg-slate-50 transition"
              style={{ border: `1px solid ${border}` }}
              aria-label="Toggle sidebar"
              title={collapsed ? "Buka menu" : "Tutup menu"}
            >
              <Menu className="w-5 h-5" style={{ color: muted }} />
            </button>

            {!collapsed && (
              <div className="min-w-0">
                <div
                  className="text-sm font-extrabold leading-tight truncate"
                  style={{ color: text }}
                >
                  Sistem Monitoring Pajak
                </div>
                <div
                  className="text-xs font-semibold truncate"
                  style={{ color: muted }}
                >
                  Kabupaten Aceh Tengah
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={cn("px-0", collapsed ? "px-3" : "px-6")}>
          <div style={{ height: 1, backgroundColor: border }} />
        </div>

        <nav className={cn("flex-1 pt-4", collapsed ? "px-3" : "px-6")}>
          <div className="space-y-2">
            {NAV.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink key={item.to} to={item.to} className="block">
                  {({ isActive }) => (
                    <div
                      className={cn(
                        "w-full flex items-center gap-3 transition",
                        "rounded-2xl",
                        collapsed ? "justify-center px-3 py-3" : "px-4 py-3",
                      )}
                      style={{
                        backgroundColor: isActive
                          ? "rgba(15,23,42,0.05)"
                          : "transparent",
                        border: isActive
                          ? `1px solid ${border}`
                          : "1px solid transparent",
                      }}
                      title={collapsed ? item.label : undefined}
                    >
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center"
                        style={{
                          backgroundColor: isActive ? accent : "transparent",
                          border: `1px solid ${border}`,
                        }}
                      >
                        <Icon
                          className="w-5 h-5"
                          style={{ color: isActive ? "#FFFFFF" : muted }}
                        />
                      </div>

                      {!collapsed && (
                        <div
                          className="text-sm font-extrabold"
                          style={{ color: text }}
                        >
                          {item.label}
                        </div>
                      )}
                    </div>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>

        <div className={cn("pb-5", collapsed ? "px-3" : "px-6")}>
          <div style={{ height: 1, backgroundColor: border }} />

          <div
            className={cn(
              "mt-4 flex items-center",
              collapsed ? "justify-center" : "gap-3",
            )}
          >
            <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 bg-slate-100">
              <img
                src="/images/admin-avatar.jpg"
                alt="Admin"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              <div className="w-full h-full flex items-center justify-center text-slate-700 font-black">
                A
              </div>
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <div className="text-sm font-extrabold" style={{ color: text }}>
                  Admin
                </div>
                <div
                  className="text-xs font-semibold truncate"
                  style={{ color: muted }}
                >
                  admin@gmail.com
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            className={cn(
              "mt-4 w-full rounded-2xl px-4 py-3 font-extrabold transition flex items-center justify-center gap-2",
              "hover:opacity-95",
            )}
            style={{
              backgroundColor: accent,
              color: "#FFFFFF",
              border: "1px solid rgba(30,99,214,0.35)",
              boxShadow: "0 12px 26px rgba(30,99,214,0.18)",
            }}
            onClick={handleLogout}
            aria-label="Logout"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
