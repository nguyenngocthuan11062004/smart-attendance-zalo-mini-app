import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import {
  createPairingToken,
  subscribePairingToken,
  buildPairingQRContent,
} from "@/services/pairing.service";
import { reverseGeocode, formatCoords } from "@/services/geocode.service";
import { useTeacherQR } from "@/hooks/useTeacherQR";
import type {
  AttendanceDoc,
  ClassDoc,
  PairingTokenDoc,
  SessionDoc,
} from "@/types";

type Phase = "pairing" | "displaying" | "ended";

const HUST_RED = "#be1d2c";
const HUST_RED_DARK = "#8a1421";
const BG_LIGHT = "#f5f5f7";
const TEXT_PRIMARY = "#111827";
const TEXT_SECONDARY = "#6b7280";

const LOGO_SRC = "/hust-logo.svg";
const CAMPUS_SRC = "/hust-campus.jpg";

export default function PresentPage() {
  const [phase, setPhase] = useState<Phase>("pairing");
  const [pairing, setPairing] = useState<PairingTokenDoc | null>(null);
  const [pairingQR, setPairingQR] = useState<string>("");
  const [pairingError, setPairingError] = useState<string>("");
  const [session, setSession] = useState<SessionDoc | null>(null);
  const [secret, setSecret] = useState<string>("");
  const [attendance, setAttendance] = useState<AttendanceDoc[]>([]);
  const [classDoc, setClassDoc] = useState<ClassDoc | null>(null);
  const [address, setAddress] = useState<string>("");
  const [now, setNow] = useState(Date.now());
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const requestLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
        }
      } catch {
        // ignore
      }
    };
    requestLock();
    const onVis = () => {
      if (document.visibilityState === "visible") requestLock();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      wakeLockRef.current?.release().catch(() => {});
    };
  }, []);

  const issueNewToken = useCallback(async () => {
    setPairingError("");
    try {
      const tok = await createPairingToken();
      const dataURL = await QRCode.toDataURL(buildPairingQRContent(tok.token), {
        width: 560,
        margin: 1,
        errorCorrectionLevel: "M",
        color: { dark: HUST_RED_DARK, light: "#ffffff" },
      });
      setPairing(tok);
      setPairingQR(dataURL);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không tạo được mã ghép cặp";
      setPairingError(msg);
    }
  }, []);

  useEffect(() => {
    if (phase !== "pairing") return;
    if (pairing) return;
    issueNewToken();
  }, [phase, pairing, issueNewToken]);

  const refreshingRef = useRef(false);
  useEffect(() => {
    if (phase !== "pairing" || !pairing) return;
    if (now <= pairing.expiresAt) return;
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    issueNewToken().finally(() => {
      refreshingRef.current = false;
    });
  }, [phase, pairing, now, issueNewToken]);

  useEffect(() => {
    if (phase !== "pairing" || !pairing) return;
    const unsub = subscribePairingToken(pairing.token, async (tok) => {
      if (!tok) return;
      if (tok.status === "paired" && tok.sessionId) {
        const snap = await getDoc(doc(db, "sessions", tok.sessionId));
        if (!snap.exists()) {
          setPairingError("Không tìm thấy phiên điểm danh");
          return;
        }
        const sess = { id: snap.id, ...snap.data() } as SessionDoc;
        setSession(sess);
        setSecret(sess.hmacSecret || "");
        setPhase("displaying");
      }
    });
    return () => unsub();
  }, [phase, pairing?.token]);

  useEffect(() => {
    if (phase !== "displaying" || !session) return;
    const unsubSess = onSnapshot(doc(db, "sessions", session.id), (snap) => {
      if (!snap.exists()) return;
      const sess = { id: snap.id, ...snap.data() } as SessionDoc;
      setSession(sess);
      if (sess.status === "ended") setPhase("ended");
    });
    const q = query(
      collection(db, "attendance"),
      where("sessionId", "==", session.id)
    );
    const unsubAtt = onSnapshot(q, (snap) => {
      const records = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AttendanceDoc);
      records.sort((a, b) => b.checkedInAt - a.checkedInAt);
      setAttendance(records);
    });
    return () => {
      unsubSess();
      unsubAtt();
    };
  }, [phase, session?.id]);

  // Load classDoc (lấy phòng học + tên GV)
  useEffect(() => {
    if (phase !== "displaying" || !session?.classId) return;
    let cancelled = false;
    getDoc(doc(db, "classes", session.classId)).then((snap) => {
      if (cancelled || !snap.exists()) return;
      setClassDoc({ id: snap.id, ...snap.data() } as ClassDoc);
    });
    return () => {
      cancelled = true;
    };
  }, [phase, session?.classId]);

  // Reverse geocode GPS của GV → địa chỉ
  useEffect(() => {
    if (phase !== "displaying" || !session?.location) {
      setAddress("");
      return;
    }
    const { latitude, longitude } = session.location;
    let cancelled = false;
    setAddress(formatCoords(latitude, longitude));
    reverseGeocode(latitude, longitude).then((addr) => {
      if (!cancelled && addr) setAddress(addr);
    });
    return () => {
      cancelled = true;
    };
  }, [phase, session?.location?.latitude, session?.location?.longitude]);

  useEffect(() => {
    if (phase !== "ended") return;
    const id = window.setTimeout(() => {
      setSession(null);
      setSecret("");
      setAttendance([]);
      setClassDoc(null);
      setAddress("");
      setPairing(null);
      setPairingQR("");
      setPhase("pairing");
    }, 20000);
    return () => clearTimeout(id);
  }, [phase]);

  const qrOptions = useMemo(
    () =>
      phase === "displaying" && session && secret
        ? {
            sessionId: session.id,
            teacherId: session.teacherId,
            secret,
            refreshIntervalMs: (session.qrRefreshInterval ?? 30) * 1000,
            anchor: session.startedAt,
            size: 720,
          }
        : null,
    [phase, session, secret]
  );
  const { qrDataURL, secondsLeft } = useTeacherQR(qrOptions);

  if (phase === "pairing") {
    return (
      <PairingScreen
        qr={pairingQR}
        secondsLeft={pairing ? Math.max(0, Math.ceil((pairing.expiresAt - now) / 1000)) : 0}
        error={pairingError}
      />
    );
  }
  if (phase === "displaying" && session) {
    return (
      <DisplayingScreen
        session={session}
        classDoc={classDoc}
        address={address}
        qr={qrDataURL}
        secondsLeft={secondsLeft}
        attendance={attendance}
      />
    );
  }
  if (phase === "ended" && session) {
    return <EndedScreen session={session} attendance={attendance} />;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────
// Hero banner — campus image + logo + university name
// ─────────────────────────────────────────────────────────────────
function HeroBanner({ height = 240, kicker }: { height?: number; kicker?: string }) {
  return (
    <div
      style={{
        position: "relative",
        height,
        backgroundImage: `url(${CAMPUS_SRC})`,
        backgroundSize: "cover",
        backgroundPosition: "center 40%",
        overflow: "hidden",
        borderRadius: "0 0 32px 32px",
        boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
      }}
    >
      {/* Red gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(105deg, ${HUST_RED}f5 0%, ${HUST_RED}d0 35%, ${HUST_RED}80 65%, transparent 100%)`,
        }}
      />
      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, transparent 30%, rgba(0,0,0,0.25) 100%)",
        }}
      />
      {/* Content */}
      <div
        style={{
          position: "relative",
          height: "100%",
          padding: "0 64px",
          display: "flex",
          alignItems: "center",
          gap: 28,
        }}
      >
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 22,
            background: "rgba(255,255,255,0.97)",
            padding: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
            flexShrink: 0,
          }}
        >
          <img src={LOGO_SRC} alt="HUST" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
        <div>
          {kicker ? (
            <div
              style={{
                color: "rgba(255,255,255,0.92)",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 3,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              {kicker}
            </div>
          ) : null}
          <div
            style={{
              color: "rgba(255,255,255,0.92)",
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: 2.5,
              textTransform: "uppercase",
              textShadow: "0 2px 8px rgba(0,0,0,0.25)",
            }}
          >
            Trường Đại học Bách khoa Hà Nội
          </div>
          <div
            style={{
              color: "#fff",
              fontSize: 38,
              fontWeight: 800,
              letterSpacing: -0.8,
              marginTop: 4,
              lineHeight: 1.1,
              textShadow: "0 2px 12px rgba(0,0,0,0.3)",
            }}
          >
            Zimo Checkin · Hệ thống điểm danh thông minh
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.85)",
              fontSize: 15,
              fontWeight: 500,
              marginTop: 8,
              fontStyle: "italic",
            }}
          >
            Trường Công nghệ Thông tin và Truyền thông · SoICT
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Slim header — dùng cho displaying (giữ QR to)
// ─────────────────────────────────────────────────────────────────
function SlimHeader({ right }: { right?: React.ReactNode }) {
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${HUST_RED} 0%, ${HUST_RED_DARK} 100%)`,
        borderRadius: "0 0 28px 28px",
        padding: "18px 56px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 8px 24px rgba(190,29,44,0.18)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: "rgba(255,255,255,0.97)",
            padding: 7,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
          }}
        >
          <img src={LOGO_SRC} alt="HUST" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
        <div>
          <div
            style={{
              color: "rgba(255,255,255,0.85)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            ĐH Bách khoa Hà Nội
          </div>
          <div style={{ color: "#fff", fontSize: 20, fontWeight: 800, letterSpacing: -0.3, marginTop: 1 }}>
            Zimo Checkin · Điểm danh thông minh
          </div>
        </div>
      </div>
      <div>{right}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Pairing screen — hero ảnh trường + 2 cột QR/hướng dẫn
// ─────────────────────────────────────────────────────────────────
function PairingScreen({ qr, secondsLeft, error }: { qr: string; secondsLeft: number; error: string }) {
  return (
    <div style={pageStyle}>
      <HeroBanner height={240} kicker="Cổng máy chiếu" />

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1.05fr 1fr",
          gap: 56,
          padding: "48px 64px",
          alignItems: "center",
        }}
      >
        {/* QR card */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div
            style={{
              background: "#fff",
              borderRadius: 28,
              padding: 36,
              boxShadow: "0 24px 60px rgba(190,29,44,0.12), 0 4px 16px rgba(0,0,0,0.05)",
              border: `1px solid rgba(190,29,44,0.08)`,
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -14,
                left: 36,
                background: HUST_RED,
                color: "#fff",
                padding: "6px 16px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 1.5,
                boxShadow: "0 4px 10px rgba(190,29,44,0.3)",
              }}
            >
              MÃ GHÉP CẶP
            </div>
            {qr ? (
              <img
                src={qr}
                alt="Pairing QR"
                style={{ width: "min(44vh, 460px)", height: "min(44vh, 460px)", display: "block" }}
              />
            ) : (
              <div
                style={{
                  width: "min(44vh, 460px)",
                  height: "min(44vh, 460px)",
                  background: "#f3f4f6",
                  borderRadius: 12,
                }}
              />
            )}
            <div
              style={{
                marginTop: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: HUST_RED,
                  animation: "presentPulse 1.4s ease-in-out infinite",
                }}
              />
              <span style={{ fontSize: 15, color: TEXT_SECONDARY, fontWeight: 600 }}>
                Mã làm mới sau {secondsLeft}s
              </span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: HUST_RED,
              letterSpacing: 3,
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            Hướng dẫn ghép cặp
          </div>
          <h1
            style={{
              fontSize: 44,
              fontWeight: 800,
              color: TEXT_PRIMARY,
              margin: "0 0 32px",
              lineHeight: 1.1,
              letterSpacing: -1,
            }}
          >
            Quét mã bên cạnh
            <br />
            <span style={{ color: HUST_RED }}>để bắt đầu chiếu</span>
          </h1>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Step n={1} title="Mở Zimo Checkin trên Zalo" desc="Đăng nhập với tài khoản giảng viên" />
            <Step n={2} title="Chọn lớp & bắt đầu phiên" desc="Lớp dạy → chọn lớp → bấm 'Bắt đầu điểm danh'" />
            <Step n={3} title="Chạm 'Quét máy chiếu'" desc="Nút màu đen dưới khu vực QR — quét mã trên màn hình này" />
          </div>

          {error ? (
            <div
              style={{
                marginTop: 24,
                padding: "12px 18px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 12,
                color: "#b91c1c",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          ) : null}
        </div>
      </div>

      <FooterCredit />
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        alignItems: "flex-start",
        padding: "14px 18px",
        background: "#fff",
        borderRadius: 14,
        border: "1px solid rgba(0,0,0,0.05)",
        boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: `linear-gradient(135deg, ${HUST_RED} 0%, ${HUST_RED_DARK} 100%)`,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          fontWeight: 800,
          flexShrink: 0,
          boxShadow: "0 4px 10px rgba(190,29,44,0.25)",
        }}
      >
        {n}
      </div>
      <div>
        <div style={{ fontSize: 17, fontWeight: 700, color: TEXT_PRIMARY }}>{title}</div>
        <div style={{ fontSize: 13, color: TEXT_SECONDARY, marginTop: 2 }}>{desc}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Displaying screen — header slim, QR cực to
// ─────────────────────────────────────────────────────────────────
function DisplayingScreen({
  session,
  classDoc,
  address,
  qr,
  secondsLeft,
  attendance,
}: {
  session: SessionDoc;
  classDoc: ClassDoc | null;
  address: string;
  qr: string;
  secondsLeft: number;
  attendance: AttendanceDoc[];
}) {
  const presentCount = attendance.filter((a) => a.trustScore !== "absent").length;
  const recent = attendance.slice(0, 6);
  const elapsedMin = Math.floor((Date.now() - session.startedAt) / 60000);

  const teacherName = classDoc?.teacherName;
  const room = classDoc?.location;
  const classCode = classDoc?.code;

  return (
    <div style={pageStyle}>
      <SlimHeader
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <LiveBadge />
            <div
              style={{
                background: "rgba(255,255,255,0.18)",
                border: "1px solid rgba(255,255,255,0.25)",
                padding: "8px 18px",
                borderRadius: 999,
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              ⏱ {elapsedMin} phút
            </div>
          </div>
        }
      />

      {/* Session title bar */}
      <div
        style={{
          padding: "20px 64px 0",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              color: HUST_RED,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            Phiên điểm danh đang diễn ra
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: TEXT_PRIMARY,
              marginTop: 4,
              letterSpacing: -0.5,
              lineHeight: 1.2,
            }}
          >
            {session.className}
            {classCode ? (
              <span style={{ fontSize: 18, fontWeight: 600, color: TEXT_SECONDARY, marginLeft: 12 }}>
                · {classCode}
              </span>
            ) : null}
          </div>
          <InfoRow room={room} teacher={teacherName} address={address} />
        </div>
        <CountdownPill seconds={secondsLeft} />
      </div>

      {/* Body grid */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1.3fr 1fr",
          gap: 40,
          padding: "24px 64px 32px",
          alignItems: "center",
        }}
      >
        {/* QR card */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div
            style={{
              background: "#fff",
              borderRadius: 32,
              padding: 32,
              boxShadow: "0 30px 80px rgba(190,29,44,0.12), 0 8px 24px rgba(0,0,0,0.06)",
              border: `1px solid rgba(190,29,44,0.08)`,
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -16,
                left: "50%",
                transform: "translateX(-50%)",
                background: `linear-gradient(135deg, ${HUST_RED}, ${HUST_RED_DARK})`,
                color: "#fff",
                padding: "8px 22px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 1.5,
                boxShadow: "0 6px 16px rgba(190,29,44,0.35)",
                whiteSpace: "nowrap",
              }}
            >
              QR ĐIỂM DANH · QUÉT BẰNG ĐIỆN THOẠI
            </div>
            {qr ? (
              <img
                src={qr}
                alt="Attendance QR"
                style={{ width: "min(60vh, 600px)", height: "min(60vh, 600px)", display: "block" }}
              />
            ) : (
              <div
                style={{
                  width: "min(60vh, 600px)",
                  height: "min(60vh, 600px)",
                  background: "#f3f4f6",
                  borderRadius: 16,
                }}
              />
            )}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <CounterCard count={presentCount} />
          <FeedCard recent={recent} total={attendance.length} />
        </div>
      </div>

      <FooterCredit />
    </div>
  );
}

function InfoRow({
  room,
  teacher,
  address,
}: {
  room?: string;
  teacher?: string;
  address?: string;
}) {
  if (!room && !teacher && !address) return null;
  return (
    <div
      style={{
        marginTop: 14,
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
        alignItems: "center",
      }}
    >
      {room ? (
        <InfoChip
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21V8l9-5 9 5v13" />
              <path d="M9 21v-8h6v8" />
            </svg>
          }
          label="Phòng"
          value={room}
          accent
        />
      ) : null}
      {teacher ? (
        <InfoChip
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          }
          label="GV"
          value={teacher}
        />
      ) : null}
      {address ? (
        <InfoChip
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          }
          label="Địa chỉ"
          value={address}
        />
      ) : null}
    </div>
  );
}

function InfoChip({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px",
        background: accent ? "rgba(190,29,44,0.08)" : "#fff",
        border: `1px solid ${accent ? "rgba(190,29,44,0.2)" : "rgba(0,0,0,0.08)"}`,
        borderRadius: 12,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        maxWidth: 480,
      }}
    >
      <span
        style={{
          color: accent ? HUST_RED : TEXT_SECONDARY,
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: TEXT_SECONDARY,
          letterSpacing: 1,
          textTransform: "uppercase",
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: accent ? HUST_RED : TEXT_PRIMARY,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function CounterCard({ count }: { count: number }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 22,
        padding: "24px 28px",
        border: "1px solid rgba(0,0,0,0.05)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: TEXT_SECONDARY,
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        Đã điểm danh
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 8 }}>
        <span
          style={{
            fontSize: 88,
            fontWeight: 900,
            color: HUST_RED,
            lineHeight: 1,
            letterSpacing: -3,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {count}
        </span>
        <span style={{ fontSize: 20, color: TEXT_SECONDARY, fontWeight: 600 }}>sinh viên</span>
      </div>
    </div>
  );
}

function FeedCard({ recent, total }: { recent: AttendanceDoc[]; total: number }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 22,
        padding: "20px 24px",
        border: "1px solid rgba(0,0,0,0.05)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
        flex: 1,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: TEXT_SECONDARY,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          Vừa điểm danh
        </div>
        <div style={{ fontSize: 12, color: TEXT_SECONDARY, fontWeight: 600 }}>{total} bản ghi</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        {recent.length === 0 ? (
          <div
            style={{
              color: TEXT_SECONDARY,
              fontSize: 15,
              padding: "20px 0",
              textAlign: "center",
              fontStyle: "italic",
            }}
          >
            Chưa có sinh viên nào điểm danh
          </div>
        ) : (
          recent.map((rec) => <FeedRow key={rec.id} record={rec} />)
        )}
      </div>
    </div>
  );
}

function FeedRow({ record }: { record: AttendanceDoc }) {
  const palette =
    record.trustScore === "present"
      ? { bg: "#f0fdf4", border: "rgba(34,197,94,0.2)", dot: "#22c55e", label: "Hợp lệ" }
      : record.trustScore === "review"
      ? { bg: "#fffbeb", border: "rgba(245,158,11,0.2)", dot: "#f59e0b", label: "Cần xem lại" }
      : { bg: "#fef2f2", border: "rgba(239,68,68,0.2)", dot: "#ef4444", label: "Vắng" };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        background: palette.bg,
        borderRadius: 12,
        border: `1px solid ${palette.border}`,
        animation: "presentFeedIn 0.45s cubic-bezier(.2,.8,.2,1)",
      }}
    >
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: palette.dot,
          boxShadow: `0 0 0 4px ${palette.dot}26`,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: TEXT_PRIMARY,
            fontSize: 17,
            fontWeight: 700,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {record.studentName || record.studentId}
        </div>
        <div style={{ color: TEXT_SECONDARY, fontSize: 12, marginTop: 1, fontWeight: 500 }}>
          {formatTime(record.checkedInAt)} · {palette.label}
        </div>
      </div>
    </div>
  );
}

function CountdownPill({ seconds }: { seconds: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 20px",
        borderRadius: 999,
        background: "#fff",
        border: `1.5px solid ${HUST_RED}`,
        boxShadow: "0 4px 12px rgba(190,29,44,0.15)",
        fontSize: 16,
        fontWeight: 700,
        color: HUST_RED,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={HUST_RED} strokeWidth="2.5" strokeLinecap="round">
        <path d="M1 4v6h6" />
        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
      </svg>
      Mã mới sau{" "}
      <span style={{ minWidth: 22, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{seconds}</span>s
    </div>
  );
}

function LiveBadge() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 14px",
        borderRadius: 999,
        background: "rgba(34,197,94,0.18)",
        border: "1px solid rgba(34,197,94,0.5)",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "#22c55e",
          boxShadow: "0 0 8px #22c55e",
          animation: "presentPulse 1.4s ease-in-out infinite",
        }}
      />
      <span style={{ color: "#fff", fontSize: 12, fontWeight: 700, letterSpacing: 1.5 }}>LIVE</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Ended screen — hero campus + stats
// ─────────────────────────────────────────────────────────────────
function EndedScreen({ session, attendance }: { session: SessionDoc; attendance: AttendanceDoc[] }) {
  const present = attendance.filter((a) => a.trustScore === "present").length;
  const review = attendance.filter((a) => a.trustScore === "review").length;
  const total = attendance.length;
  const durationMin = Math.max(1, Math.round(((session.endedAt ?? Date.now()) - session.startedAt) / 60000));
  return (
    <div style={pageStyle}>
      <HeroBanner height={200} kicker="Phiên điểm danh đã kết thúc" />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
        }}
      >
        <div
          style={{
            fontSize: 14,
            color: TEXT_SECONDARY,
            fontWeight: 600,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          {session.className} · {durationMin} phút
        </div>
        <h1
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: TEXT_PRIMARY,
            margin: "10px 0 44px",
            letterSpacing: -1,
          }}
        >
          Cảm ơn các <span style={{ color: HUST_RED }}>kỹ sư tương lai</span>
        </h1>

        <div style={{ display: "flex", gap: 24 }}>
          <Stat label="Hợp lệ" value={present} color="#22c55e" />
          <Stat label="Cần xem lại" value={review} color="#f59e0b" />
          <Stat label="Tổng điểm danh" value={total} color={HUST_RED} />
        </div>

        <div style={{ marginTop: 48, color: TEXT_SECONDARY, fontSize: 15, fontWeight: 500 }}>
          Tự động về màn ghép cặp sau 20s
        </div>
      </div>

      <FooterCredit />
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.05)",
        borderRadius: 22,
        padding: "28px 48px",
        minWidth: 200,
        textAlign: "center",
        boxShadow: "0 8px 24px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          fontSize: 72,
          fontWeight: 900,
          color,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: -2,
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: 12,
          color: TEXT_SECONDARY,
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function FooterCredit() {
  return (
    <div
      style={{
        padding: "14px 64px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        color: "#9ca3af",
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: 1,
      }}
    >
      <span>© SoICT — Trường CNTT&TT, ĐH Bách khoa Hà Nội</span>
      <span>inhust-admin.web.app/present</span>
    </div>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: `radial-gradient(circle at top right, rgba(190,29,44,0.05) 0%, transparent 50%), ${BG_LIGHT}`,
  color: TEXT_PRIMARY,
  display: "flex",
  flexDirection: "column",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif",
};

if (typeof document !== "undefined" && !document.getElementById("present-page-anim")) {
  const style = document.createElement("style");
  style.id = "present-page-anim";
  style.textContent = `
    @keyframes presentFeedIn {
      from { opacity: 0; transform: translateY(-10px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes presentPulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.85); }
    }
    body { background: ${BG_LIGHT}; }
  `;
  document.head.appendChild(style);
}
