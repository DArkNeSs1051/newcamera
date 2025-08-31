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

export const RestOverlay: React.FC<{ seconds: number | string }> = ({
  seconds,
}) => (
  <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300">
    <p className="text-2xl font-bold uppercase tracking-wider text-green-400 animate-pulse">
      พักสักครู่
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

          {/* คะแนนรวม */}
          <div className="text-5xl md:text-6xl font-extrabold leading-none">
            {total}
          </div>

          {/* ระดับ (ใหญ่กว่ารายการย่อย) */}
          <div className="text-lg md:text-xl font-semibold text-green-400">
            ระดับ: {level}
          </div>

          {/* รายการสรุปแต่ละท่า (ตัวอักษรเล็กกว่า level) */}
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
        </div>
      </div>
    </div>
  );
};
