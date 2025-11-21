// === Shared Overlays =====================================================
export const HudOverlay: React.FC<{
  exercise: string;
  setNumber?: number | string;
  current?: number | string;
  total?: number | string;
  isTime?: boolean; // true = หน่วยเป็นวินาที
}> = ({ exercise, setNumber, current, total, isTime }) => {
  const isPlankLike =
    exercise?.toLowerCase?.() === "plank" ||
    exercise?.toLowerCase?.() === "side plank";

  return (
    <div className="absolute top-0 left-0 w-full p-3 bg-gray-900/60 backdrop-blur-sm rounded-t-xl border-b border-gray-700">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs text-green-400 uppercase">ท่าปัจจุบัน</p>
          <h2 className="text-xl font-bold capitalize tracking-tight">
            {exercise || "-"}
          </h2>
        </div>
        <div className="flex items-center gap-4 text-right">
          {setNumber !== undefined && (
            <div>
              <p className="text-xs text-gray-400 uppercase">เซ็ต</p>
              <p className="text-2xl font-bold">{setNumber}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-400 uppercase">
              {isPlankLike || isTime ? "จำนวนวินาที" : "จำนวนครั้ง"}
            </p>
            <p className="text-2xl font-bold">
              <span className="text-green-400">{current ?? 0}</span>
              {total !== undefined && (
                <>
                  <span className="text-gray-500 mx-1">/</span>
                  <span>{total}</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// overlay.tsx
export const RestOverlay: React.FC<{
  seconds: number | string;
  nextExercise?: string;
  label?: string; // "พักสักครู่" | "เตรียมตัว"
}> = ({ seconds, nextExercise, label = "พักสักครู่" }) => (
  <div className="absolute inset-0 z-40 flex flex-col items-center justify-center text-center bg-black/80 backdrop-blur-sm">
    {nextExercise && (
      <p className="text-7xl font-medium tracking-wide text-gray-200 mb-1">
        ท่าถัดไป:{" "}
        <span className="capitalize font-semibold text-white">
          {nextExercise}
        </span>
      </p>
    )}
    <p className="text-sm md:text-base uppercase tracking-wider text-green-400">
      {label}
    </p>
    <p className="text-8xl font-mono font-bold my-4 text-white">{seconds}</p>
    <p className="text-xl uppercase tracking-wider text-gray-400">วินาที</p>
  </div>
);

// overlay.tsx (เฉพาะ SummaryOverlay + helpers ด้านล่างนี้)
type SummaryOverlayProps = {
  total: number;
  level: string;
  breakdown?: {
    pushup?: number;
    squat?: number;
    burpee?: number;
    plankSeconds?: number; // เวลาที่ถือ plank หน่วยวินาที
  };
};

const pad2 = (n: number) => String(n).padStart(2, "0");
const formatMMSS = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${pad2(m)}:${pad2(s)}`;
};

export const SummaryOverlay = ({
  total,
  level,
  breakdown,
}: SummaryOverlayProps) => {
  console.log("breakdown:", breakdown);
  const items = [
    breakdown?.pushup != null
      ? { label: "Push-up", value: `${breakdown.pushup} ครั้ง` }
      : null,
    breakdown?.squat != null
      ? { label: "Squat", value: `${breakdown.squat} ครั้ง` }
      : null,
    breakdown?.burpee != null
      ? { label: "Burpee", value: `${breakdown.burpee} ครั้ง` }
      : null,
    breakdown?.plankSeconds != null
      ? { label: "Plank", value: `${formatMMSS(breakdown.plankSeconds)} นาที` }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center">
      <div className="w-[min(92vw,560px)] rounded-2xl bg-gray-900/90 border border-white/10 p-6 text-white shadow-2xl">
        <div className="text-center space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold text-green-400">
            สรุปผล
          </h2>

          <div className="text-5xl md:text-6xl font-extrabold leading-none">
            {total}
          </div>

          <div className="text-lg md:text-xl font-semibold text-green-400">
            ระดับ: {level}
          </div>

          {items.length > 0 && (
            <div className="mt-4 text-sm md:text-base text-gray-200/90">
              <ul className="space-y-1">
                {items.map((i) => (
                  <li
                    key={i.label}
                    className="flex items-center justify-between border-b border-white/10 py-1"
                  >
                    <span className="opacity-80">{i.label}</span>
                    <span className="font-medium">{i.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-6 text-sm md:text-base text-gray-300">
            ออกกำลังกายเสร็จแล้ว โปรดกลับมาใหม่ในวันพรุ่งนี้
          </p>
        </div>
      </div>
    </div>
  );
};

const pick = (obj: any, path: (string | number)[]) => {
  let cur = obj;
  for (const k of path) {
    if (cur == null) return undefined;
    cur = cur[k];
  }
  return cur;
};

const firstDefined = (obj: any, paths: (string | number)[][]) => {
  for (const p of paths) {
    const v = pick(obj, p);
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
};

const toNum = (v: any) =>
  typeof v === "number" && !Number.isNaN(v) ? v : undefined;

export function deriveBreakdown(ft: any, defaultZero = true) {
  const pushup = toNum(
    firstDefined(ft, [
      ["summary", "byExercise", "pushup"],
      ["results", "pushup", "reps"],
      ["reps", "pushup"],
      ["counts", "pushup"],
      ["totals", "pushup"],
    ])
  );

  const squat = toNum(
    firstDefined(ft, [
      ["summary", "byExercise", "squat"],
      ["results", "squat", "reps"],
      ["reps", "squat"],
      ["counts", "squat"],
      ["totals", "squat"],
    ])
  );

  const burpee = toNum(
    firstDefined(ft, [
      ["summary", "byExercise", "burpee"],
      ["results", "burpee", "reps"],
      ["reps", "burpee"],
      ["counts", "burpee"],
      ["totals", "burpee"],
    ])
  );

  let plankSeconds = toNum(
    firstDefined(ft, [
      ["summary", "byExercise", "plankSeconds"],
      ["results", "plank", "seconds"],
      ["plankSeconds"],
      ["plankSec"], // <-- เพิ่ม
      ["durations", "plankSeconds"],
    ])
  );

  if (plankSeconds === undefined) {
    const ms = toNum(
      firstDefined(ft, [
        ["timers", "plank", "totalMs"],
        ["durations", "plankMs"],
      ])
    );
    if (typeof ms === "number") plankSeconds = Math.round(ms / 1000);
  }

  return {
    pushup: pushup ?? (defaultZero ? 0 : undefined),
    squat: squat ?? (defaultZero ? 0 : undefined),
    burpee: burpee ?? (defaultZero ? 0 : undefined),
    plankSeconds: plankSeconds ?? (defaultZero ? 0 : undefined),
  };
}
