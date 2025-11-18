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
// export type Orientation = "front" | "left" | "right" | "back";

export type ExerciseGuide = {
  key: string;
  nameTh: string;
  orientation: string;
  cues: string[];
  durationSec?: number;
};

// ================================
// Defaults (ตัวอย่างข้อมูล)
// ================================
export const DEFAULT_GUIDES: ExerciseGuide[] = [
  // -------- Bodyweight --------
  {
    key: "squat",
    nameTh: "Squat",
    orientation: "front face camera",
    cues: [
      "Face the camera. Stand full-body in frame (head to feet).",
      "Feet shoulder-width, chest up, knees track over toes.",
      "Camera height ~waist to chest, distance ~2–3 m.",
    ],
  },
  {
    key: "pushup",
    nameTh: "Push-up",
    orientation: "turn right toward camera",
    cues: [
      "Place the camera to your side so head–torso–feet are visible.",
      "Body in a straight line, hips don’t sag; lower chest to elbow level.",
      "Use a mat to avoid slipping.",
    ],
  },
  {
    key: "lunge",
    nameTh: "Leg Lunges",
    orientation: "front face camera",
    cues: [
      "Front view helps the app see knee and hip angles clearly.",
      "Step long enough so the front knee stays behind toes; back knee drops toward floor.",
      "Torso tall, eyes forward.",
    ],
  },
  {
    key: "plank",
    nameTh: "Plank",
    orientation: "turn right toward camera",
    cues: [
      "Turn sideways so shoulder–hip–ankle alignment is clear.",
      "Brace your core; body forms a straight line; don’t pike hips.",
      "Breathe steadily.",
    ],
  },
  {
    key: "side_plank_left",
    nameTh: "Side Plank (Left)",
    orientation: "front face camera",
    cues: [
      "Camera on your left side. Left forearm under shoulder.",
      "Lift hips so the body forms a straight line; slight angle so torso is visible.",
      "Brace abs; keep neck relaxed.",
    ],
  },
  {
    key: "side_plank_right",
    nameTh: "Side Plank (Right)",
    orientation: "front facing camera",
    cues: [
      "Camera on your right side. Right forearm under shoulder.",
      "Lift hips so the body forms a straight line; slight angle so torso is visible.",
      "Brace abs; keep neck relaxed.",
    ],
  },
  {
    key: "leg_raises",
    nameTh: "Leg Raises",
    orientation: "turn right toward camera",
    cues: [
      "Side view to capture hip motion and lumbar position.",
      "Lower legs with control; avoid arching the lower back.",
      "Keep head/shoulders relaxed on the floor or bench.",
    ],
  },
  {
    key: "russian_twists",
    nameTh: "Russian Twists",
    orientation: "turn left toward camera",
    cues: [
      "Side view is best; show torso angle and elbow travel.",
      "Lean back ~45°, chest up, rotate through the torso (not just arms).",
      "Tap near the hip on each side with control.",
    ],
  },
  {
    key: "burpee_pushup",
    nameTh: "Burpee (with Push-up)",
    orientation: "turn right toward camera",
    cues: [
      "Side view so the push-up depth and jump are visible.",
      "Chest to elbow level on the push-up; land softly; keep core tight.",
      "Stay in frame for the squat, kick-back, push-up, and jump.",
    ],
  },
  {
    key: "burpee_no_pushup",
    nameTh: "Burpee (no Push-up)",
    orientation: "front facing camera",
    cues: [
      "Face camera; keep full body in frame.",
      "Hands to floor → kick back to plank → return to squat → jump.",
      "Keep knees tracking over toes; land softly.",
    ],
  },

  // -------- Dumbbell --------
  {
    key: "db_bench_press",
    nameTh: "Dumbbell Bench Press",
    orientation: "turn right/left toward camera",
    cues: [
      "Side view aligns bench, shoulders, and elbow path.",
      "Wrists stacked over elbows; touch dumbbells near chest, press up under control.",
      "Feet planted; slight arch is fine, keep glutes on bench.",
    ],
  },
  {
    key: "db_bent_over_row",
    nameTh: "Dumbbell Bent-Over Rows",
    orientation: "Turn left 45 degrees towards camera",
    cues: [
      "Side or ~45° side view works (45° is OK).",
      "Hinge at hips, flat back; row by driving elbows toward hips.",
      "Avoid shrugging; keep neck neutral.",
    ],
    // important: "If it doesn't count please turn left a little bit more",
  },
  {
    key: "db_shoulder_press",
    nameTh: "Dumbbell Shoulder Press",
    orientation: "front facing camera",
    cues: [
      "Face camera to show elbow flare and lockout.",
      "Press overhead; biceps near ears; control the descent.",
      "Ribs down; avoid overarching lower back.",
    ],
  },
  {
    key: "db_bicep_curl",
    nameTh: "Dumbbell Bicep Curls",
    orientation: "front facing camera",
    cues: [
      "Front view captures elbow position and wrist alignment.",
      "Elbows stay by sides; curl without swinging shoulders.",
      "Full range; control down.",
    ],
  },
  {
    key: "db_goblet_squat",
    nameTh: "Dumbbell Goblet Squats",
    orientation: "front facing camera",
    cues: [
      "Face camera; hold the dumbbell at chest (goblet) position.",
      "Knees track over toes; chest tall; squat to comfortable depth.",
      "Keep heels down; control on the way up.",
    ],
  },
  {
    key: "db_romanian_deadlift",
    nameTh: "Dumbbell Romanian Deadlifts",
    orientation: "front facing or turn right/left toward camera",
    cues: [
      "Front works; a ~45° side is also fine for hip hinge depth.",
      "Push hips back, soft knees, flat back; feel hamstrings load.",
      "Dumbbells close to thighs; stand tall without leaning back.",
    ],
  },
  {
    key: "db_oh_tricep_extension",
    nameTh: "Dumbbell Overhead Tricep Extension",
    orientation: "front facing camera",
    cues: [
      "Front view shows elbow flare and range.",
      "Elbows point forward; lower behind head, then extend fully.",
      "Keep ribs down; avoid lower-back arch.",
    ],
  },
  {
    key: "db_side_lateral_raise",
    nameTh: "Dumbbell Side Lateral Raises",
    orientation: "front facing camera",
    cues: [
      "Front view to see shoulder height and symmetry.",
      "Raise to ~shoulder height with slight elbow bend; lead with elbows.",
      "No swinging; control tempo.",
    ],
  },
];

const EXERCISE_VIDEO_NAME_MAP: Record<string, string> = {
  // bodyweight
  pushup: "Push Up",
  burpee_no_pushup: "Burpee No Push Up",
  // เผื่อใช้ในอนาคต (ถ้าตั้งชื่อใน video ตามนี้)
  squat: "Squat",
};

// ================================
// Helper UI
// ================================
// const ORI_LABEL: Record<Orientation, string> = {
//   front: "หันหน้าเข้าหากล้อง",
//   left: "หันด้านซ้ายให้กล้อง",
//   right: "หันด้านขวาให้กล้อง",
//   back: "หันหลังให้กล้อง",
// };

type TB = {
  id: string;
  name: string;
  category: string;
  equipment: string;
  difficulty: string;
  muscleGroups?: string[];
  videoUrl: string;
  image: string;
  instruction?: string[];
  description?: string;
};

function OrientationPill({ o }: any) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-300/70 bg-white/60 px-3 py-1 text-sm text-slate-700 shadow-sm backdrop-blur">
      <Camera className="h-4 w-4" />
      <span>{o}</span>
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
  title = "Instruction",
  subtitle = "Please read the instruction before start",
  exercises = DEFAULT_GUIDES,
  onStart,
  isFitnessTest,
  video,
}: {
  title?: string;
  subtitle?: string;
  exercises?: ExerciseGuide[];
  onStart?: () => void;
  isFitnessTest?: boolean;
  video?: TB[];
}) {
  const [ack, setAck] = useState(false);
  const [dontShow, setDontShow] = useState(false);
  const [preview, setPreview] = useState<null | { name: string; url: string }>(
    null
  );

  const openPreview = (key: string, name: string) => {
    if (!video) return;

    // ใช้ชื่อจาก mapping ก่อน ถ้าไม่มีค่อย fallback เป็นชื่อจาก ex.nameTh
    const targetName = EXERCISE_VIDEO_NAME_MAP[key] ?? name;

    const found = video.find((v) => {
      const videoName = v.name.toLowerCase();
      const target = targetName.toLowerCase();

      // 1) ลองเทียบแบบเท่ากันเป๊ะก่อน
      if (videoName === target) return true;

      // 2) fallback ให้ includes เผื่อเผลอตั้งชื่อไม่ตรงนิดหน่อย
      return videoName.includes(target) || target.includes(videoName);
    });

    if (found) {
      setPreview({ name: found.name || name, url: found.videoUrl });
    } else {
      console.warn("No video matched for", key, targetName);
    }
  };

  console.log("video:", video);
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

  // ถ้าเป็น Fitness Test ให้ filter เฉพาะท่าที่ต้องการ
  const filteredExercises = useMemo(() => {
    if (!isFitnessTest) return exercises;

    return exercises.filter((ex) =>
      ["squat", "pushup", "plank", "burpee_no_pushup"].includes(ex.key)
    );
  }, [isFitnessTest, exercises]);
  console.log("filteredExercises:", filteredExercises);

  const total = filteredExercises.length;

  const headerIcon = useMemo(() => <Activity className="h-6 w-6" />, []);

  return (
    <>
      {preview && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">
              {preview.name}
            </h2>
            <video
              src={preview.url}
              controls
              className="w-full rounded-lg bg-black"
            />
            <button
              onClick={() => setPreview(null)}
              className="mt-4 w-full rounded-xl bg-slate-900 py-2 text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
      <div className="min-h-svh w-full bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
          {/* Header */}
          <div className="mb-6 flex items-start gap-3">
            <div className="rounded-2xl bg-white p-3 shadow-sm">
              {headerIcon}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                {title}
              </h1>
              <p className="mt-1 text-slate-600">{subtitle}</p>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <Info className="h-4 w-4" />
                <span>
                  Tip: clear the space for 2–3 meter place camera at clear sight
                  and bright
                </span>
              </div>
            </div>
          </div>

          {/* Safety notice */}
          <div className="mb-6 rounded-2xl border border-amber-300/60 bg-amber-50 p-4 text-amber-900">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-5 w-5" />
              <div className="space-y-1 text-sm">
                <p className="font-medium">Safety first</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Warm up 3–5 minute and drink enough water</li>
                  <li>If you have dizzle and pian please stop immediately</li>
                  <li>Wear shoes and avoid slippery floor</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Dumbbell Weight */}
          <div className="mb-6 rounded-2xl border border-[#79BAEC]/60 bg-[#79BAEC]/20 p-4 text-blue-900">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-[#79BAEC]" />
              <div className="space-y-1 text-sm">
                <p className="font-medium">Dumbbell Weight</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    Choose a weight that feels challenging but still lets you
                    maintain good form.
                  </li>
                  <li>
                    You should finish your last rep feeling like you could do
                    1–3 more.
                  </li>
                  <li>
                    If you can easily do more than 20 reps, increase weight.
                  </li>
                  <li>
                    If your form breaks before you reach the target reps,
                    decrease weight.
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* List */}
          <div className="space-y-4">
            {filteredExercises.map((ex, idx) => (
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
                          {isFitnessTest && video ? (
                            <button
                              onClick={() => openPreview(ex.key, ex.nameTh)}
                              className="ml-1 mt-1 rounded-lg bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-500/20"
                            >
                              Preview Video
                            </button>
                          ) : null}
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
                  I've read it and I'm ready
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-500">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                    checked={dontShow}
                    onChange={(e) => setDontShow(e.target.checked)}
                  />
                  Don't show it again
                </label>
              </div>

              <button
                type="button"
                disabled={!ack}
                onClick={handleStart}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:bg-slate-300 md:text-base"
              >
                Start session
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Progress hint */}
          <p className="mt-3 text-center text-xs text-slate-500">
            total {total} exercises • please check the form before start for
            better form check
          </p>
        </div>
      </div>
    </>
  );
}
