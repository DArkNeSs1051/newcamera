"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Check,
  Camera,
  ArrowRight,
  Info,
  AlertTriangle,
  Footprints,
  Activity,
} from "lucide-react";

// ================================
// Types
// ================================
export type Orientation = "front" | "left" | "right" | "back";

export type ExerciseGuide = {
  key: string;
  nameTh: string;
  orientation: Orientation;
  cues: string[];
  durationSec?: number;
};

// ================================
// Defaults (ตัวอย่างข้อมูล)
// ================================
export const DEFAULT_GUIDES: ExerciseGuide[] = [
  {
    key: "squat",
    nameTh: "Squat",
    orientation: "front",
    cues: [
      "หันหน้าตรงเข้าหากล้อง ยืนเต็มตัวศีรษะ–ปลายเท้าอยู่ในเฟรม",
      "ยืนกว้างเท่าหัวไหล่ หลังตรง เข่าชี้ตามปลายเท้า",
      "วางกล้องสูงประมาณระดับเอว–อก ระยะห่าง ~2–3 เมตร",
    ],
  },
  {
    key: "pushup",
    nameTh: "Push-up",
    orientation: "left",
    cues: [
      "วางกล้องด้านข้างลำตัว (เห็นหัว–ลำตัว–เท้าในเฟรมเดียว)",
      "ลำตัวตรง สะโพกไม่ตก ศอกงอจนหน้าอกต่ำระดับศอก",
      "ใช้เสื่อโยคะเพื่อกันลื่น",
    ],
  },
  {
    key: "plank",
    nameTh: "Plank",
    orientation: "left",
    cues: [
      "หันข้างให้กล้องเพื่อให้เห็นแนวไหล่–สะโพก–ข้อเท้า",
      "เกร็งแกนกลาง ลำตัวเป็นเส้นตรง สะโพกไม่โด่ง",
      "หายใจสม่ำเสมอ",
    ],
  },
  {
    key: "side_plank_left",
    nameTh: "Side Plank (ซ้าย)",
    orientation: "left",
    cues: [
      "วางกล้องด้านซ้ายลำตัว แขนซ้ายยันพื้น ไหล่ซ้อนเหนือศอก",
      "ยกสะโพกให้ลำตัวเป็นเส้นตรง เอียงตัวเล็กน้อยให้เห็นทั้งลำตัว",
      "เก็บท้อง คอผ่อนคลาย",
    ],
  },
  {
    key: "lunge",
    nameTh: "Lunge",
    orientation: "front",
    cues: [
      "หันหน้าตรงเข้าหากล้อง ยืนกลางเฟรม",
      "ก้าวยาวพอให้เข่าหน้าไม่เลยปลายเท้า เข่าหลังลงใกล้พื้น",
      "รักษาหลังตรง สายตามองไปข้างหน้า",
    ],
  },
  {
    key: "russian_twist",
    nameTh: "Russian Twist",
    orientation: "front",
    cues: [
      "นั่งหันหน้าตรงเข้าหากล้อง ชันเข่า ยกปลายเท้าเล็กน้อย (ถ้าไหว)",
      "เอนหลังประมาณ 45° หลังตรง ไหล่ผ่อนคลาย",
      "บิดลำตัวซ้าย–ขวา แตะมือใกล้สะโพกสลับกัน",
    ],
  },
];

// ================================
// Helper UI
// ================================
const ORI_LABEL: Record<Orientation, string> = {
  front: "หันหน้าเข้าหากล้อง",
  left: "หันด้านซ้ายให้กล้อง",
  right: "หันด้านขวาให้กล้อง",
  back: "หันหลังให้กล้อง",
};

function OrientationPill({ o }: { o: Orientation }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-300/70 bg-white/60 px-3 py-1 text-sm text-slate-700 shadow-sm backdrop-blur">
      <Camera className="h-4 w-4" />
      <span>{ORI_LABEL[o]}</span>
    </div>
  );
}

function CueItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3 leading-relaxed text-slate-700">
      <Check className="mt-1 h-4 w-4 shrink-0" />
      <span>{text}</span>
    </li>
  );
}

// ================================
// Component
// ================================
export default function PreWorkoutGuide({
  title = "คู่มือก่อนเริ่มการออกกำลังกาย",
  subtitle = "อ่านคำแนะนำการจัดวางกล้องและท่าทางโดยย่อ จากนั้นกดปุ่มเพื่อเริ่มโปรแกรมได้เลย",
  exercises = DEFAULT_GUIDES,
  onStart,
}: {
  title?: string;
  subtitle?: string;
  exercises?: ExerciseGuide[];
  onStart?: () => void;
}) {
  const [ack, setAck] = useState(false);
  const [dontShow, setDontShow] = useState(false);

  // เคยเลือกว่าไม่ต้องแสดงอีก
  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? localStorage.getItem("skipPreWorkoutGuide")
        : null;
    if (saved === "1") setDontShow(true);
  }, []);

  const handleStart = useCallback(() => {
    if (dontShow) localStorage.setItem("skipPreWorkoutGuide", "1");

    if (onStart) {
      onStart();
      return;
    }

    // Fallback: ถ้าไม่ส่ง onStart มา ลองเปลี่ยนเส้นทาง (Next.js App Router)
    try {
      // lazy import เพื่อหลีกเลี่ยง SSR ปัญหา
      import("next/navigation").then(({ useRouter }) => {
        // useRouter ต้องใช้ในคอมโพเนนต์ แต่ที่นี่เราจะ fallback อย่างสุภาพ
        // จึงใช้ window.location เป็นทางเลือกแทน
        window.location.href = "/fitness/start";
      });
    } catch {
      window.location.href = "/fitness/start";
    }
  }, [dontShow, onStart]);

  const total = exercises.length;

  const headerIcon = useMemo(() => <Activity className="h-6 w-6" />, []);

  return (
    <div className="min-h-svh w-full bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
        {/* Header */}
        <div className="mb-6 flex items-start gap-3">
          <div className="rounded-2xl bg-white p-3 shadow-sm">{headerIcon}</div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              {title}
            </h1>
            <p className="mt-1 text-slate-600">{subtitle}</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <Info className="h-4 w-4" />
              <span>
                เคล็ดลับ: จัดพื้นที่โล่ง 2–3 เมตร วางกล้องให้นิ่งและสว่างพอ
              </span>
            </div>
          </div>
        </div>

        {/* Safety notice */}
        <div className="mb-6 rounded-2xl border border-amber-300/60 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-5 w-5" />
            <div className="space-y-1 text-sm">
              <p className="font-medium">ความปลอดภัยมาก่อน</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>อบอุ่นร่างกาย 3–5 นาที และดื่มน้ำให้เพียงพอ</li>
                <li>ถ้ามีอาการเจ็บ เวียนหัว หรือหายใจลำบาก ให้หยุดทันที</li>
                <li>สวมรองเท้าที่เหมาะสมและหลีกเลี่ยงพื้นลื่น</li>
              </ul>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="space-y-4">
          {exercises.map((ex, idx) => (
            <div
              key={ex.key}
              className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md md:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="relative mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                    <Footprints className="h-5 w-5" />
                    <span className="absolute -right-1 -top-1 rounded-full bg-slate-900 px-1.5 text-[10px] font-semibold text-white">
                      {idx + 1}
                    </span>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900 md:text-lg">
                        {ex.nameTh}
                      </h3>
                      <OrientationPill o={ex.orientation} />
                      {ex.durationSec ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          ~{ex.durationSec}s
                        </span>
                      ) : null}
                    </div>
                    <ul className="mt-2 space-y-1.5">
                      {ex.cues.map((c, i) => (
                        <CueItem key={i} text={c} />
                      ))}
                    </ul>
                  </div>
                </div>
                <ArrowRight className="mt-1 h-5 w-5 text-slate-300 group-hover:text-slate-400" />
              </div>
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 mt-6 rounded-2xl border border-slate-200 bg-white/90 p-4 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                  checked={ack}
                  onChange={(e) => setAck(e.target.checked)}
                />
                ฉันอ่านและพร้อมเริ่มแล้ว
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-500">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                  checked={dontShow}
                  onChange={(e) => setDontShow(e.target.checked)}
                />
                ไม่ต้องแสดงหน้านี้อีก
              </label>
            </div>

            <button
              type="button"
              disabled={!ack}
              onClick={handleStart}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:bg-slate-300 md:text-base"
            >
              เริ่มโปรแกรม
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Progress hint */}
        <p className="mt-3 text-center text-xs text-slate-500">
          รวม {total} ท่า • ตรวจสอบท่าทางก่อนเริ่มเพื่อผลการตรวจจับที่แม่นยำขึ้น
        </p>
      </div>
    </div>
  );
}

/* ================================
การใช้งาน (Next.js App Router)
---------------------------------
1) วางไฟล์นี้ไว้ที่ `components/PreWorkoutGuide.tsx`
2) สร้างเพจเช่น `app/fitness/guide/page.tsx` แล้วใช้งานแบบนี้:

  'use client'
  import PreWorkoutGuide, { DEFAULT_GUIDES } from '@/components/PreWorkoutGuide'
  import { useRouter } from 'next/navigation'

  export default function Page() {
    const router = useRouter()
    return (
      <PreWorkoutGuide
        exercises={DEFAULT_GUIDES}
        onStart={() => router.push('/fitness/start')}
      />
    )
  }

3) หากต้องการซ่อนเพจนี้ถ้าผู้ใช้กด "ไม่ต้องแสดงหน้านี้อีก" ให้ใน layout เช็ค localStorage('skipPreWorkoutGuide') แล้ว redirect ได้ตามต้องการ

4) ปรับแก้รายการท่า/คำแนะนำได้ผ่าน props `exercises`
=============================== */
