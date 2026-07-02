import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardApp from "./dashboard/DashboardApp";
import Analisis from "./pages/Analisis";
import DetailLaporanTransaksi from "./pages/DetailLaporanTransaksi";
import DetailWajibPajak from "./pages/DetailWajibPajak";
import EditWajibPajak from "./pages/EditWajibPajak";
import Laporan from "./pages/Laporan";
import Login from "./pages/Login";
import Pengaturan from "./pages/Pengaturan";
import TambahWajibPajak from "./pages/TambahWajibPajak";
import WajibPajak from "./pages/WajibPajak";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["Super Admin", "Admin"]}>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardApp />} />
        </Route>

        <Route
          path="/analisis"
          element={
            <ProtectedRoute allowedRoles={["Super Admin", "Admin"]}>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Analisis />} />
        </Route>

        <Route
          path="/wajib-pajak"
          element={
            <ProtectedRoute allowedRoles={["Super Admin", "Admin"]}>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<WajibPajak />} />
          <Route
            path="tambah"
            element={
              <ProtectedRoute allowedRoles={["Super Admin"]}>
                <TambahWajibPajak />
              </ProtectedRoute>
            }
          />
          <Route
            path=":id"
            element={
              <ProtectedRoute allowedRoles={["Super Admin", "Admin"]}>
                <DetailWajibPajak />
              </ProtectedRoute>
            }
          />
          <Route
            path=":id/edit"
            element={
              <ProtectedRoute allowedRoles={["Super Admin"]}>
                <EditWajibPajak />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route
          path="/laporan"
          element={
            <ProtectedRoute allowedRoles={["Super Admin", "Admin"]}>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Laporan />} />
          <Route path=":id" element={<DetailLaporanTransaksi />} />
        </Route>

        <Route
          path="/pengaturan"
          element={
            <ProtectedRoute allowedRoles={["Super Admin"]}>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Pengaturan />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
