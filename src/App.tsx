import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import Analisis from "./pages/Analisis";
import Dashboard from "./pages/Dashboard";
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
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analisis" element={<Analisis />} />
          <Route path="/wajib-pajak" element={<WajibPajak />} />
          <Route path="/wajib-pajak/tambah" element={<TambahWajibPajak />} />
          <Route path="/wajib-pajak/:id" element={<DetailWajibPajak />} />
          <Route path="/wajib-pajak/:id/edit" element={<EditWajibPajak />} />
          <Route path="/laporan" element={<Laporan />} />
          <Route path="/pengaturan" element={<Pengaturan />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

/*
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const authed = localStorage.getItem("auth_pajak") === "true";
  return authed ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  const authed = localStorage.getItem("auth_pajak") === "true";

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Navigate to={authed ? "/dashboard" : "/login"} replace />}
        />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
*/
