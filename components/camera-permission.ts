export type CameraPermissionState =
  | "granted"
  | "prompt"
  | "denied"
  | "unsupported";

export type CameraCheck = {
  state: CameraPermissionState;
  secure: boolean;
  reason?: string;
};

function isSecure() {
  // ต้องเป็น https หรือ context ที่ปลอดภัย (ส่วนมาก Android WebView จะโอเค)
  return window.isSecureContext === true || location.protocol === "https:";
}

/** เช็กสิทธิ์ด้วย Permissions API (ถ้ามี) + สำรองด้วย enumerateDevices */
export async function queryCameraPermission(): Promise<CameraCheck> {
  if (!("mediaDevices" in navigator)) {
    return {
      state: "unsupported",
      secure: isSecure(),
      reason: "navigator.mediaDevices ไม่มีในบริบทนี้",
    };
  }
  if (!isSecure()) {
    return {
      state: "denied",
      secure: false,
      reason: "ไม่ใช่ secure context (ต้องเป็น https หรือ WebView ที่อนุญาต)",
    };
  }

  // ✅ ใช้ Permissions API ถ้ามี
  const navAny = navigator as any;
  if (navAny.permissions?.query) {
    try {
      const status = await navAny.permissions.query({
        name: "camera" as PermissionName,
      });
      return { state: status.state as CameraPermissionState, secure: true };
    } catch {
      // บาง WebView/บราวเซอร์ไม่ยอมให้ query('camera') ก็ปล่อยไปใช้ fallback
    }
  }

  // 🔁 Fallback: ดู label จาก enumerateDevices (มี label ได้ก็ต่อเมื่อเคย grant)
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasCam = devices.some((d) => d.kind === "videoinput");
    const anyLabeled = devices.some(
      (d) => d.kind === "videoinput" && !!d.label
    );

    if (!hasCam)
      return { state: "denied", secure: true, reason: "ไม่พบอุปกรณ์กล้อง" };
    return { state: anyLabeled ? "granted" : "prompt", secure: true };
  } catch {
    return {
      state: "prompt",
      secure: true,
      reason: "enumerateDevices ล้มเหลว (อาจต้องเรียกขอสิทธิ์ก่อน)",
    };
  }
}

/** ขอสิทธิ์ครั้งเดียวแบบ “dry-run” แล้วปิดสตรีมทันที */
export async function requestCameraOnce(
  constraints: MediaStreamConstraints = {
    video: { facingMode: "user" },
    audio: false,
  }
): Promise<{ ok: boolean; code?: string; error?: string }> {
  if (!("mediaDevices" in navigator)) {
    return { ok: false, error: "ไม่รองรับ mediaDevices" };
  }
  if (!isSecure()) {
    return {
      ok: false,
      code: "SECURE_CONTEXT",
      error: "ต้องใช้งานผ่าน https หรือ context ที่ปลอดภัย",
    };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    // ปิดทันทีเพื่อไม่ใช้ทรัพยากร/ไม่ให้กล้องติดค้าง
    stream.getTracks().forEach((t) => t.stop());
    return { ok: true };
  } catch (err: any) {
    const code = err?.name || "ERROR";
    const map: Record<string, string> = {
      NotAllowedError:
        "ผู้ใช้ปฏิเสธสิทธิ์ หรือ WebView ไม่อนุมัติสิทธิ์ให้หน้าเว็บ",
      SecurityError: "บริบทไม่ปลอดภัย (ต้องเป็น https)",
      NotFoundError: "ไม่มีกล้องในอุปกรณ์",
      NotReadableError: "กล้องถูกใช้งานโดยแอปอื่น/ระบบไม่ให้ใช้",
      OverconstrainedError: "ข้อกำหนดกล้องไม่รองรับ (เช่น facingMode)",
      AbortError: "ระบบยกเลิกคำขอ",
      TypeError: "constraints ไม่ถูกต้อง หรือเบราว์เซอร์ไม่รองรับ",
    };
    return {
      ok: false,
      code,
      error: map[code] ?? err?.message ?? "ไม่ทราบสาเหตุ",
    };
  }
}
