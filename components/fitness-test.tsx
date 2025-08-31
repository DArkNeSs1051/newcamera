// fitness-test.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Sex = "male" | "female";
type Exercise = "pushup" | "squat" | "burpee" | "plank";

const SEQUENCE: Exercise[] = ["pushup", "squat", "burpee", "plank"];
const WORK_SEC = 60;
const REST_SEC = 15;

type Band = { min: number; max: number; score: 1 | 2 | 3 | 4 | 5 };

// ตารางคะแนนตามไฟล์แนบ
const TABLE: Record<Sex, Record<Exercise, Band[]>> = {
  male: {
    pushup: [
      { min: 35, max: Infinity, score: 5 },
      { min: 30, max: 34, score: 4 },
      { min: 20, max: 29, score: 3 },
      { min: 10, max: 19, score: 2 },
      { min: 0, max: 9, score: 1 },
    ],
    squat: [
      { min: 45, max: Infinity, score: 5 },
      { min: 38, max: 44, score: 4 },
      { min: 30, max: 37, score: 3 },
      { min: 20, max: 29, score: 2 },
      { min: 0, max: 19, score: 1 },
    ],
    burpee: [
      { min: 20, max: Infinity, score: 5 },
      { min: 16, max: 19, score: 4 },
      { min: 12, max: 15, score: 3 },
      { min: 8, max: 11, score: 2 },
      { min: 0, max: 7, score: 1 },
    ],
    plank: [
      { min: 120, max: Infinity, score: 5 },
      { min: 90, max: 119, score: 4 },
      { min: 60, max: 89, score: 3 },
      { min: 30, max: 59, score: 2 },
      { min: 0, max: 29, score: 1 },
    ],
  },
  female: {
    pushup: [
      { min: 25, max: Infinity, score: 5 },
      { min: 20, max: 24, score: 4 },
      { min: 12, max: 19, score: 3 },
      { min: 6, max: 11, score: 2 },
      { min: 0, max: 5, score: 1 },
    ],
    squat: [
      { min: 40, max: Infinity, score: 5 },
      { min: 34, max: 39, score: 4 },
      { min: 28, max: 33, score: 3 },
      { min: 20, max: 27, score: 2 },
      { min: 0, max: 19, score: 1 },
    ],
    burpee: [
      { min: 17, max: Infinity, score: 5 },
      { min: 14, max: 16, score: 4 },
      { min: 10, max: 13, score: 3 },
      { min: 7, max: 9, score: 2 },
      { min: 0, max: 6, score: 1 },
    ],
    plank: [
      { min: 120, max: Infinity, score: 5 }, // ใช้เกณฑ์เดียวกับผู้ชาย
      { min: 90, max: 119, score: 4 },
      { min: 60, max: 89, score: 3 },
      { min: 30, max: 59, score: 2 },
      { min: 0, max: 29, score: 1 },
    ],
  },
};

const levelFromTotal = (sum: number) =>
  sum >= 17 ? "Advance" : sum >= 13 ? "Intermediate" : "Beginner";

type Phase = "idle" | "countdown" | "active" | "rest" | "summary";

export function useFitnessTestMachine(opts: {
  sex: Sex;
  kneePushupOffset?: number; // ผู้หญิงที่ทำ knee push-up (แนะนำ 5–10)
}) {
  const { sex, kneePushupOffset = 0 } = opts;

  const [phase, setPhase] = useState<Phase>("idle");
  const [idx, setIdx] = useState(0);
  const ex = SEQUENCE[idx];

  const [timeLeft, setTimeLeft] = useState(WORK_SEC);
  const [restLeft, setRestLeft] = useState(REST_SEC);
  const [countdownLeft, setCountdownLeft] = useState(5); // <<< 2. เพิ่ม state สำหรับนับถอยหลัง

  const [counts, setCounts] = useState<{
    pushup: number;
    squat: number;
    burpee: number;
  }>({
    pushup: 0,
    squat: 0,
    burpee: 0,
  });
  const [plankHold, setPlankHold] = useState(false);
  const [plankSec, setPlankSec] = useState(0);

  const timerRef = useRef<number | null>(null);
  // timeout เมื่อผู้ใช้หยุดทำ plank จนครบระยะเวลาที่กำหนด
  const plankStopTimeoutRef = useRef<number | null>(null);

  // ตัวช่วยจัดการ interval และ timeout ที่เกี่ยวข้องกับ plank
  const clearPlankStopTimeout = () => {
    if (plankStopTimeoutRef.current) {
      window.clearTimeout(plankStopTimeoutRef.current);
      plankStopTimeoutRef.current = null;
    }
  };

  // ตัวช่วยจัดการ interval
  const clearTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // เริ่มการทำงานของเฟส active/rest ตามประเภทท่า
  useEffect(() => {
    clearTimer();
    if (phase === "countdown") {
      timerRef.current = window.setInterval(() => {
        setCountdownLeft((t) => {
          if (t <= 1) {
            clearTimer();
            setPhase("active"); // เมื่อนับถอยหลังเสร็จ ให้เริ่ม phase active
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else if (phase === "active") {
      if (ex === "plank") {
        // นับเวลาที่ฟอร์มถูกต้อง
        timerRef.current = window.setInterval(() => {
          setPlankSec((s) => (plankHold ? s + 1 : s));
        }, 1000);
      } else {
        setTimeLeft(WORK_SEC);
        timerRef.current = window.setInterval(() => {
          setTimeLeft((t) => {
            if (t <= 1) {
              // จบชุด ทำ rest หรือ summary
              clearTimer();
              if (idx < SEQUENCE.length - 1) {
                setPhase("rest");
                setRestLeft(REST_SEC);
              } else {
                setPhase("summary");
              }
              return 0;
            }
            return t - 1;
          });
        }, 1000);
      }
    } else if (phase === "rest") {
      timerRef.current = window.setInterval(() => {
        setRestLeft((t) => {
          if (t <= 1) {
            clearTimer();
            // ไปท่าถัดไป
            setIdx((i) => i + 1);
            setPhase("active");
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }

    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx, ex, plankHold]);

  const start = useCallback(() => {
    // reset ทุกอย่าง
    setPhase("countdown"); // <<< เปลี่ยนจาก "active" เป็น "countdown"
    setCountdownLeft(5); // <<< ตั้งค่าเวลานับถอยหลัง
    setIdx(0);
    setCounts({ pushup: 0, squat: 0, burpee: 0 });
    setPlankSec(0);
    setTimeLeft(WORK_SEC);
    setRestLeft(REST_SEC);
  }, []);

  const stop = useCallback(() => {
    clearTimer();
    setPhase("summary");
  }, []);

  const skip = useCallback(() => {
    // ข้ามไปท่าถัดไปทันที (ใช้ตอนเทส/ดีบัก)
    if (idx < SEQUENCE.length - 1) {
      setPhase("rest");
      setRestLeft(1); // rest แบบสั้น ๆ
    } else {
      setPhase("summary");
    }
  }, [idx]);

  const onRep = useCallback(
    (exercise: Exercise) => {
      if (phase !== "active" || exercise !== ex) return;
      if (exercise === "plank") return;
      setCounts((c) => ({ ...c, [exercise]: (c as any)[exercise] + 1 }));
    },
    [phase, ex]
  );

  const finishPlank = useCallback(() => {
    if (ex !== "plank" || phase !== "active") return;
    clearTimer();
    clearPlankStopTimeout();
    // จบ plank แล้วไป summary
    setPhase("summary");
  }, [ex, phase]);

  // คะแนนต่อท่า
  const scorePerExercise = useMemo(() => {
    const toScore = (exercise: Exercise, raw: number) => {
      const value = exercise === "pushup" ? raw + kneePushupOffset : raw; // ชดเชย knee push-up หากตั้งค่าไว้
      const bands = TABLE[sex][exercise];
      const band = bands.find((b) => value >= b.min && value <= b.max);
      return band ? band.score : 1;
    };

    return {
      pushup: toScore("pushup", counts.pushup),
      squat: toScore("squat", counts.squat),
      burpee: toScore("burpee", counts.burpee),
      plank: toScore("plank", plankSec),
    };
  }, [sex, counts, plankSec, kneePushupOffset]);

  const total =
    scorePerExercise.pushup +
    scorePerExercise.squat +
    scorePerExercise.burpee +
    scorePerExercise.plank;
  const level = levelFromTotal(total);

  // เมื่ออยู่ท่า plank: หากฟอร์ม "หลุด" ต่อเนื่อง 5 วินาที ให้จบและไปสรุปผลอัตโนมัติ
  useEffect(() => {
    if (ex !== "plank" || phase !== "active") {
      clearPlankStopTimeout();
      return;
    }
    if (!plankHold) {
      // เริ่ม/รีสตาร์ท timeout 5 วิ
      clearPlankStopTimeout();
      plankStopTimeoutRef.current = window.setTimeout(() => {
        // ป้องกันไม่ให้ค้าง interval อื่น ๆ
        clearTimer();
        setPhase("summary");
      }, 5000);
    } else {
      // กลับมาถือท่าได้ => ยกเลิกการจบอัตโนมัติ
      clearPlankStopTimeout();
    }
    // ล้าง timeout เมื่อ unmount หรือเปลี่ยน phase/exercise
    return () => clearPlankStopTimeout();
  }, [ex, phase, plankHold]);

  return {
    // state
    phase,
    exercise: ex,
    index: idx,
    timeLeft,
    restLeft,
    countdownLeft, // <<< 5. ส่ง countdownLeft ออกไปให้ UI ใช้
    counts,
    plankSec,
    plankHold,
    scorePerExercise,
    total,
    level,
    // actions
    start,
    stop,
    skip,
    onRep, // เรียกจาก Pose Detection เมื่อจับท่าได้ 1 ครั้ง
    setPlankHold, // true เมื่อฟอร์ม plank ถูกต้อง, false เมื่อหลุด
    finishPlank, // เรียกจบ plank (เช่น ผู้ใช้ยอมแพ้/พัก)
  };
}

// ============ ตัวอย่าง UI ใช้งาน Hook ============

export default function FitnessTest({
  sex = "male",
  kneePushupOffset = 0,
}: {
  sex: Sex;
  kneePushupOffset?: number;
}) {
  const ft = useFitnessTestMachine({ sex, kneePushupOffset });

  // ตัวอย่างการผูกกับตัวตรวจจับเดิม (pseudo)
  // useEffect(() => {
  //   pose.on("rep:pushup", () => ft.onRep("pushup"));
  //   pose.on("rep:squat", () => ft.onRep("squat"));
  //   pose.on("rep:burpee", () => ft.onRep("burpee"));
  //   pose.on("plank:hold", (ok: boolean) => ft.setPlankHold(ok));
  // }, [ft]);

  return (
    <div className="max-w-md mx-auto p-4 rounded-xl bg-white shadow">
      {ft.phase === "idle" && (
        <div className="flex flex-col items-center gap-3">
          <h2 className="text-xl font-semibold">Fitness Test</h2>
          <p>ลำดับ: Push-up → Squat → Burpee → Plank</p>
          <button
            className="px-4 py-2 rounded-lg bg-black text-white"
            onClick={ft.start}
          >
            เริ่มทดสอบ
          </button>
        </div>
      )}

      {ft.phase === "active" && (
        <div className="flex flex-col gap-3">
          <div className="text-lg font-semibold capitalize">{ft.exercise}</div>

          {ft.exercise !== "plank" ? (
            <>
              <div className="text-4xl font-bold tabular-nums text-center">
                {ft.timeLeft}s
              </div>
              <div className="flex items-center justify-between">
                <div>นับได้</div>
                <div className="text-2xl font-semibold">
                  {ft.exercise === "pushup" && ft.counts.pushup}
                  {ft.exercise === "squat" && ft.counts.squat}
                  {ft.exercise === "burpee" && ft.counts.burpee}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="px-3 py-2 rounded-lg bg-gray-100"
                  onClick={() => ft.skip()}
                >
                  ข้าม
                </button>
                <button
                  className="px-3 py-2 rounded-lg bg-gray-100"
                  onClick={() => ft.stop()}
                >
                  หยุดและสรุป
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-sm opacity-80">
                ถือท่า Plank ให้นานที่สุด
              </div>
              <div className="text-4xl font-bold tabular-nums text-center">
                {ft.plankSec}s
              </div>
              <div className="flex items-center justify-between">
                <div>สถานะฟอร์ม</div>
                <div
                  className={`font-medium ${
                    ft.plankHold ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {ft.plankHold ? "ดี" : "หลุด"}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="px-3 py-2 rounded-lg bg-gray-100"
                  onClick={() => ft.finishPlank()}
                >
                  จบ Plank
                </button>
                <button
                  className="px-3 py-2 rounded-lg bg-gray-100"
                  onClick={() => ft.stop()}
                >
                  หยุดและสรุป
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {ft.phase === "rest" && (
        <div className="text-center">
          <div className="text-lg">พักระหว่างท่า</div>
          <div className="text-4xl font-bold tabular-nums">{ft.restLeft}s</div>
          <div className="text-sm opacity-70">จะเริ่มท่าถัดไปอัตโนมัติ</div>
        </div>
      )}

      {ft.phase === "summary" && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xl font-semibold">สรุปผล</h3>
          <ul className="text-sm">
            <li>
              Push-up: {ft.counts.pushup} → {ft.scorePerExercise.pushup} คะแนน
            </li>
            <li>
              Squat: {ft.counts.squat} → {ft.scorePerExercise.squat} คะแนน
            </li>
            <li>
              Burpee: {ft.counts.burpee} → {ft.scorePerExercise.burpee} คะแนน
            </li>
            <li>
              Plank: {ft.plankSec}s → {ft.scorePerExercise.plank} คะแนน
            </li>
          </ul>
          <div className="mt-2 text-lg font-semibold">
            รวม: {ft.total} คะแนน → ระดับ {ft.level}
          </div>
          <button
            className="mt-3 px-4 py-2 rounded-lg bg-black text-white"
            onClick={() => location.reload()}
          >
            เริ่มใหม่
          </button>
        </div>
      )}

      {ft.phase === "idle" ? null : (
        <div className="mt-4 text-xs opacity-60">
          หมายเหตุ: หากใช้ knee push-up สามารถตั้งค่า{" "}
          <code>kneePushupOffset</code> เพื่อชดเชยได้ (+5 ถึง +10)
        </div>
      )}
    </div>
  );
}
