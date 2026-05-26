import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUserRole, isAuthenticated, setUserRole } from "../lib/api";
import { forgotPassword, login, resendOtp, verifyOtp } from "../services/auth";

const BRAND = {
  title: "Sistem Monitoring Pajak Daerah",
  subtitle: "Kabupaten Aceh Tengah",
  tagline: "Monitoring real-time pendapatan pajak daerah",
};

const COLORS = {
  border: "rgba(15, 23, 42, 0.10)",
  muted: "#64748B",
  text: "#0F172A",
  card: "rgba(255,255,255,0.92)",
  card2: "rgba(255,255,255,0.98)",
  accent: "#1E63D6",
  accent2: "#0B2E6B",
  bg: "#F2F7FF",
};

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

type Captcha = { a: number; b: number; answer: string };

function generateCaptcha(): Captcha {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  return { a, b, answer: String(a + b) };
}

function cn(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function getRedirectByRole(role: string | null) {
  if (role === "Super Admin" || role === "Admin") {
    return "/dashboard";
  }
  return "/dashboard";
}

export default function Login() {
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [step, setStep] = useState<"login" | "mfa">("login");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [openForgot, setOpenForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [captcha, setCaptcha] = useState<Captcha>(() => generateCaptcha());
  const [captchaInput, setCaptchaInput] = useState("");
  const [resetMsg, setResetMsg] = useState("");

  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [otpUserId, setOtpUserId] = useState("");
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const canLogin = useMemo(() => {
    return isEmail(identifier) && password.trim().length >= 6;
  }, [identifier, password]);

  useEffect(() => {
    if (isAuthenticated()) {
      navigate(getRedirectByRole(getUserRole()), { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (!openForgot) {
      setResetEmail("");
      setCaptchaInput("");
      setResetMsg("");
      setCaptcha(generateCaptcha());
    }
  }, [openForgot]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setSuccessMsg("");

    if (!isEmail(identifier)) {
      setErr("Masukkan email yang valid.");
      return;
    }

    if (password.trim().length < 6) {
      setErr("Password minimal 6 karakter.");
      return;
    }

    setLoading(true);

    try {
      const response = await login({
        identifier: identifier.trim(),
        password,
      });

      if (response.accessToken) {
        if (response.role) {
          setUserRole(response.role);
        }
        setSuccessMsg("Login berhasil.");
        navigate(getRedirectByRole(response.role ?? getUserRole()), {
          replace: true,
        });
        return;
      }

      if (response.userId) {
        setOtpUserId(response.userId);
        setSuccessMsg("Login berhasil. OTP sudah dikirim ke email.");
        setStep("mfa");
        setOtp(Array(6).fill(""));
        setTimeout(() => otpRefs.current[0]?.focus(), 0);
        return;
      }

      setErr(response.message ?? "Login gagal. ID user tidak ditemukan.");
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Login Error");
    } finally {
      setLoading(false);
    }
  };

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMsg("");

    if (!isEmail(resetEmail.trim())) {
      setResetMsg("Email tidak valid. Periksa kembali.");
      return;
    }

    if (captchaInput.trim() !== captcha.answer) {
      setResetMsg("CAPTCHA salah. Coba lagi.");
      setCaptcha(generateCaptcha());
      setCaptchaInput("");
      return;
    }

    setLoading(true);

    try {
      const response = await forgotPassword({ email: resetEmail.trim() });
      setResetMsg(
        response.message ?? "Link reset password sudah dikirim ke email kamu.",
      );
    } catch (error) {
      setResetMsg(
        error instanceof Error
          ? error.message
          : "Gagal mengirim reset password.",
      );
    } finally {
      setLoading(false);
    }
  };

  const otpValue = otp.join("");
  const canVerify =
    otpValue.length === 6 && otp.every((d) => /^[0-9]$/.test(d));

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setSuccessMsg("");

    if (!canVerify) {
      setErr("Masukkan kode OTP 6 digit.");
      return;
    }

    if (!otpUserId) {
      setErr("ID user untuk verifikasi OTP tidak ditemukan.");
      return;
    }

    setLoading(true);

    try {
      const response = await verifyOtp({
        userId: otpUserId,
        otp: otpValue,
      });

      if (response.accessToken) {
        if (response.role) {
          setUserRole(response.role);
        }
        setSuccessMsg("OTP berhasil diverifikasi.");
        navigate(getRedirectByRole(response.role ?? getUserRole()), {
          replace: true,
        });
        return;
      }

      setErr("Verifikasi berhasil tetapi token belum diberikan backend.");
    } catch (error) {
      setErr(
        error instanceof Error ? error.message : "Kode OTP salah. Coba lagi.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setErr("");
    setSuccessMsg("");

    if (!otpUserId) {
      setErr("ID user untuk resend OTP tidak ditemukan.");
      return;
    }

    setLoading(true);

    try {
      await resendOtp({
        userId: otpUserId,
      });
      setSuccessMsg("OTP berhasil dikirim ulang.");
    } catch (error) {
      setErr(
        error instanceof Error ? error.message : "Gagal mengirim ulang OTP.",
      );
    } finally {
      setLoading(false);
    }
  };

  const onOtpChange = (idx: number, value: string) => {
    const v = value.replace(/\D/g, "").slice(0, 1);
    const next = [...otp];
    next[idx] = v;
    setOtp(next);
    if (v && otpRefs.current[idx + 1]) otpRefs.current[idx + 1]!.focus();
  };

  const onOtpKeyDown = (
    idx: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[idx] && otpRefs.current[idx - 1]) {
      otpRefs.current[idx - 1]!.focus();
    }
  };

  const refreshCaptcha = () => {
    setCaptcha(generateCaptcha());
    setCaptchaInput("");
    setResetMsg("");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{
        background: `radial-gradient(1100px 520px at 20% 10%, rgba(30,99,214,0.16), transparent 60%), radial-gradient(900px 520px at 80% 20%, rgba(11,46,107,0.14), transparent 55%), linear-gradient(180deg, ${COLORS.bg}, #EEF5FF)`,
      }}
    >
      <div className="w-full max-w-5xl">
        <div
          className="grid grid-cols-1 md:grid-cols-2 overflow-hidden rounded-[28px] shadow-2xl"
          style={{
            border: `1px solid ${COLORS.border}`,
            backgroundColor: COLORS.card,
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            className="p-8 md:p-10"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,255,255,0.92))",
            }}
          >
            <div className="flex items-center gap-3 mb-8">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{
                  backgroundColor: "rgba(30,99,214,0.10)",
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <img
                  src="/images/Logo.png"
                  alt="Logo Kabupaten Aceh Tengah"
                  className="w-9 h-9 object-contain"
                />
              </div>
              <div>
                <div
                  className="font-extrabold leading-tight"
                  style={{ color: COLORS.text }}
                >
                  {BRAND.title}
                </div>
                <div className="text-sm" style={{ color: COLORS.muted }}>
                  {BRAND.subtitle}
                </div>
              </div>
            </div>

            {step === "login" ? (
              <>
                <h1
                  className="text-2xl md:text-3xl font-extrabold"
                  style={{ color: COLORS.text }}
                >
                  Selamat Datang!
                </h1>
                <p className="mt-2 text-sm" style={{ color: COLORS.muted }}>
                  Masuk untuk melanjutkan ke {BRAND.tagline.toLowerCase()}.
                </p>

                <form onSubmit={handleLoginSubmit} className="mt-8 space-y-4">
                  <div>
                    <label
                      className="block text-xs font-semibold mb-2"
                      style={{ color: COLORS.muted }}
                    >
                      Email
                    </label>
                    <input
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Masukkan Email Anda"
                      className="w-full rounded-xl px-4 py-3 outline-none"
                      style={{
                        backgroundColor: "rgba(30, 99, 214, 0.04)",
                        border: `1px solid ${COLORS.border}`,
                        color: COLORS.text,
                      }}
                      autoComplete="username"
                    />
                  </div>

                  <div>
                    <label
                      className="block text-xs font-semibold mb-2"
                      style={{ color: COLORS.muted }}
                    >
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPass ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Masukkan Password Anda"
                        className="w-full rounded-xl px-4 py-3 pr-12 outline-none"
                        style={{
                          backgroundColor: "rgba(30, 99, 214, 0.04)",
                          border: `1px solid ${COLORS.border}`,
                          color: COLORS.text,
                        }}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-slate-100 transition"
                        aria-label={
                          showPass
                            ? "Sembunyikan password"
                            : "Tampilkan password"
                        }
                      >
                        {showPass ? "🙈" : "👁️"}
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setOpenForgot(true)}
                        className="text-[12px] font-semibold hover:opacity-90"
                        style={{ color: COLORS.text }}
                      >
                        Lupa password?
                      </button>

                      <div
                        className="text-[11px]"
                        style={{ color: COLORS.muted }}
                      >
                        Minimal 6 karakter.
                      </div>
                    </div>
                  </div>

                  {err ? (
                    <div
                      className="rounded-xl px-4 py-3 text-sm"
                      style={{
                        backgroundColor: "rgba(244, 63, 94, 0.10)",
                        border: "1px solid rgba(244, 63, 94, 0.20)",
                        color: "#B91C1C",
                      }}
                    >
                      {err}
                    </div>
                  ) : null}

                  {successMsg ? (
                    <div
                      className="rounded-xl px-4 py-3 text-sm"
                      style={{
                        backgroundColor: "rgba(34, 197, 94, 0.10)",
                        border: "1px solid rgba(34, 197, 94, 0.25)",
                        color: "#15803D",
                      }}
                    >
                      {successMsg}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={!canLogin || loading}
                    className={cn(
                      "w-full rounded-xl py-3 font-extrabold transition",
                      !canLogin || loading
                        ? "opacity-60 cursor-not-allowed"
                        : "hover:brightness-105",
                    )}
                    style={{
                      backgroundColor: COLORS.accent,
                      color: "#FFFFFF",
                      border: "1px solid rgba(30,99,214,0.35)",
                      boxShadow: "0 14px 30px rgba(30,99,214,0.22)",
                    }}
                  >
                    {loading ? "Memproses..." : "Masuk"}
                  </button>
                </form>
              </>
            ) : (
              <>
                <h1
                  className="text-2xl md:text-3xl font-extrabold"
                  style={{ color: COLORS.text }}
                >
                  Verifikasi OTP
                </h1>
                <p className="mt-2 text-sm" style={{ color: COLORS.muted }}>
                  Masukkan kode OTP 6 digit yang dikirim ke email kamu.
                </p>

                <form onSubmit={handleVerifyOtp} className="mt-8 space-y-4">
                  <div>
                    <label
                      className="block text-xs font-semibold mb-2"
                      style={{ color: COLORS.muted }}
                    >
                      Kode OTP
                    </label>

                    <div className="flex gap-2">
                      {otp.map((d, idx) => (
                        <input
                          key={idx}
                          ref={(el) => {
                            otpRefs.current[idx] = el;
                          }}
                          value={d}
                          onChange={(e) => onOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => onOtpKeyDown(idx, e)}
                          inputMode="numeric"
                          className="w-11 h-12 text-center rounded-xl text-lg font-extrabold outline-none"
                          style={{
                            backgroundColor: "rgba(30, 99, 214, 0.04)",
                            border: `1px solid ${COLORS.border}`,
                            color: COLORS.text,
                          }}
                        />
                      ))}
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setStep("login")}
                        className="text-[12px] font-semibold hover:opacity-90"
                        style={{ color: COLORS.muted }}
                      >
                        ← Kembali
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          void handleResendOtp();
                        }}
                        className="text-[12px] font-semibold hover:opacity-90"
                        style={{ color: COLORS.accent2 }}
                      >
                        Kirim ulang OTP
                      </button>
                    </div>
                  </div>

                  {err ? (
                    <div
                      className="rounded-xl px-4 py-3 text-sm"
                      style={{
                        backgroundColor: "rgba(244, 63, 94, 0.10)",
                        border: "1px solid rgba(244, 63, 94, 0.20)",
                        color: "#B91C1C",
                      }}
                    >
                      {err}
                    </div>
                  ) : null}

                  {successMsg ? (
                    <div
                      className="rounded-xl px-4 py-3 text-sm"
                      style={{
                        backgroundColor: "rgba(34, 197, 94, 0.10)",
                        border: "1px solid rgba(34, 197, 94, 0.25)",
                        color: "#15803D",
                      }}
                    >
                      {successMsg}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={!canVerify || loading}
                    className={cn(
                      "w-full rounded-xl py-3 font-extrabold transition",
                      !canVerify || loading
                        ? "opacity-60 cursor-not-allowed"
                        : "hover:brightness-105",
                    )}
                    style={{
                      backgroundColor: COLORS.accent,
                      color: "#FFFFFF",
                      border: "1px solid rgba(30,99,214,0.35)",
                      boxShadow: "0 14px 30px rgba(30,99,214,0.22)",
                    }}
                  >
                    {loading ? "Memverifikasi..." : "Verifikasi & Masuk"}
                  </button>
                </form>
              </>
            )}
          </div>

          <div className="relative hidden md:block">
            <img
              src="/images/aceh-tengah.jpg"
              alt="Kabupaten Aceh Tengah"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        </div>

        <div
          className="mt-6 text-center text-xs"
          style={{ color: COLORS.muted }}
        >
          © {new Date().getFullYear()} {BRAND.subtitle} • PT. Biner Teknologi
          Indonesia
        </div>
      </div>

      {openForgot ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(15, 23, 42, 0.45)" }}
            onClick={() => setOpenForgot(false)}
          />
          <div
            className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl"
            style={{
              backgroundColor: COLORS.card2,
              border: `1px solid ${COLORS.border}`,
              backdropFilter: "blur(10px)",
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div
                  className="font-extrabold text-lg"
                  style={{ color: COLORS.text }}
                >
                  Reset Password
                </div>
                <div className="text-sm mt-1" style={{ color: COLORS.muted }}>
                  Masukkan email untuk menerima link reset password.
                </div>
              </div>
              <button
                className="rounded-xl px-3 py-2 hover:bg-slate-100"
                style={{ color: COLORS.muted }}
                onClick={() => setOpenForgot(false)}
                aria-label="Tutup"
                type="button"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendReset} className="mt-5 space-y-4">
              <div>
                <label
                  className="block text-xs font-semibold mb-2"
                  style={{ color: COLORS.muted }}
                >
                  Email
                </label>
                <input
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="contoh: nama@email.com"
                  className="w-full rounded-xl px-4 py-3 outline-none"
                  style={{
                    backgroundColor: "rgba(30, 99, 214, 0.04)",
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.text,
                  }}
                  autoComplete="email"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    className="block text-xs font-semibold"
                    style={{ color: COLORS.muted }}
                  >
                    CAPTCHA
                  </label>
                  <button
                    type="button"
                    onClick={refreshCaptcha}
                    className="text-[12px] font-semibold hover:opacity-90"
                    style={{ color: COLORS.text }}
                  >
                    Ganti
                  </button>
                </div>

                <div className="flex gap-3 items-center">
                  <div
                    className="px-4 py-3 rounded-xl font-extrabold"
                    style={{
                      backgroundColor: "rgba(30, 99, 214, 0.04)",
                      border: `1px solid ${COLORS.border}`,
                      minWidth: 120,
                      textAlign: "center",
                      color: COLORS.text,
                    }}
                  >
                    {captcha.a} + {captcha.b} = ?
                  </div>
                  <input
                    value={captchaInput}
                    onChange={(e) =>
                      setCaptchaInput(
                        e.target.value.replace(/\D/g, "").slice(0, 2),
                      )
                    }
                    placeholder="Jawaban"
                    className="flex-1 rounded-xl px-4 py-3 outline-none"
                    style={{
                      backgroundColor: "rgba(30, 99, 214, 0.04)",
                      border: `1px solid ${COLORS.border}`,
                      color: COLORS.text,
                    }}
                    inputMode="numeric"
                  />
                </div>
              </div>

              {resetMsg ? (
                <div
                  className="rounded-xl px-4 py-3 text-sm"
                  style={{
                    backgroundColor: resetMsg.includes("dikirim")
                      ? "rgba(30,99,214,0.10)"
                      : "rgba(244, 63, 94, 0.10)",
                    border: resetMsg.includes("dikirim")
                      ? "1px solid rgba(30,99,214,0.20)"
                      : "1px solid rgba(244,63,94,0.20)",
                    color: resetMsg.includes("dikirim")
                      ? COLORS.accent2
                      : "#B91C1C",
                  }}
                >
                  {resetMsg}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "w-full rounded-xl py-3 font-extrabold transition",
                  loading
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:brightness-105",
                )}
                style={{
                  backgroundColor: COLORS.accent,
                  color: "#FFFFFF",
                  border: "1px solid rgba(30,99,214,0.35)",
                  boxShadow: "0 14px 30px rgba(30,99,214,0.22)",
                }}
              >
                {loading ? "Mengirim..." : "Kirim Link Reset"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
