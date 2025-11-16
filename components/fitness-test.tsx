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
const REST_SEC = 60;

type Band = { min: number; max: number; score: 1 | 2 | 3 | 4 | 5 | 6 | 7 };

// plank ใช้ร่วมกันทั้งชาย-หญิง ทุกอายุ (หน่วย: วินาที)
const PLANK_TABLE: Band[] = [
  { min: 361, max: Infinity, score: 7 }, // Excellent  > 6 นาที
  { min: 240, max: 360, score: 6 }, // Very Good 4–6 นาที
  { min: 120, max: 239, score: 5 }, // Above average 2–4 นาที
  { min: 60, max: 119, score: 4 }, // Average 1–2 นาที
  { min: 30, max: 59, score: 3 }, // Below average 30–60 วิ
  { min: 15, max: 29, score: 2 }, // Poor 15–30 วิ
  { min: 0, max: 14, score: 1 }, // Very poor < 15 วิ
];

const BASE_TABLE: Record<Sex, Record<Exercise, Band[]>> = {
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
    plank: PLANK_TABLE,
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
    plank: PLANK_TABLE,
  },
};

const SQUAT_MALE_18_29: Band[] = [
  { min: 35, max: Infinity, score: 7 }, // Excellent
  { min: 33, max: 34, score: 6 }, // Good
  { min: 30, max: 32, score: 5 }, // Above average
  { min: 27, max: 29, score: 4 }, // Average
  { min: 24, max: 26, score: 3 }, // Below average
  { min: 21, max: 23, score: 2 }, // Poor
  { min: 0, max: 20, score: 1 }, // Very poor
];

const SQUAT_MALE_30_39: Band[] = [
  { min: 33, max: Infinity, score: 7 },
  { min: 30, max: 32, score: 6 },
  { min: 27, max: 29, score: 5 },
  { min: 24, max: 26, score: 4 },
  { min: 21, max: 23, score: 3 },
  { min: 18, max: 20, score: 2 },
  { min: 0, max: 17, score: 1 },
];

const SQUAT_FEMALE_18_29: Band[] = [
  { min: 30, max: Infinity, score: 7 },
  { min: 27, max: 29, score: 6 },
  { min: 24, max: 26, score: 5 },
  { min: 21, max: 23, score: 4 },
  { min: 18, max: 20, score: 3 },
  { min: 15, max: 17, score: 2 },
  { min: 0, max: 14, score: 1 },
];

const SQUAT_FEMALE_30_39: Band[] = [
  { min: 27, max: Infinity, score: 7 },
  { min: 24, max: 26, score: 6 },
  { min: 21, max: 23, score: 5 },
  { min: 18, max: 20, score: 4 },
  { min: 15, max: 17, score: 3 },
  { min: 12, max: 14, score: 2 },
  { min: 0, max: 11, score: 1 },
];

const PUSHUP_MALE_18_29: Band[] = [
  { min: 48, max: Infinity, score: 7 }, // Excellent  > 47
  { min: 40, max: 47, score: 6 }, // Good
  { min: 30, max: 39, score: 5 }, // Above average
  { min: 17, max: 29, score: 4 }, // Average
  { min: 11, max: 16, score: 3 }, // Below average
  { min: 4, max: 10, score: 2 }, // Poor
  { min: 0, max: 3, score: 1 }, // Very poor
];

const PUSHUP_MALE_30_39: Band[] = [
  { min: 42, max: Infinity, score: 7 }, // Excellent > 41
  { min: 34, max: 41, score: 6 }, // Good
  { min: 25, max: 33, score: 5 }, // Above average
  { min: 13, max: 24, score: 4 }, // Average
  { min: 8, max: 12, score: 3 }, // Below average
  { min: 2, max: 7, score: 2 }, // Poor
  { min: 0, max: 1, score: 1 }, // Very poor
];

const PUSHUP_FEMALE_18_29: Band[] = [
  { min: 33, max: Infinity, score: 7 }, // Excellent > 32
  { min: 24, max: 32, score: 6 }, // Good
  { min: 14, max: 23, score: 5 }, // Above average
  { min: 9, max: 13, score: 4 }, // Average
  { min: 5, max: 8, score: 3 }, // Below average
  { min: 1, max: 4, score: 2 }, // Poor
  { min: 0, max: 0, score: 1 }, // Very poor
];

const PUSHUP_FEMALE_30_39: Band[] = [
  { min: 29, max: Infinity, score: 7 }, // Excellent > 28
  { min: 21, max: 28, score: 6 }, // Good
  { min: 13, max: 20, score: 5 }, // Above average
  { min: 7, max: 12, score: 4 }, // Average
  { min: 3, max: 6, score: 3 }, // Below average
  { min: 1, max: 2, score: 2 }, // Poor
  { min: 0, max: 0, score: 1 }, // Very poor
];

type AgeBandKey = "18_29" | "30_39";

type AgeBand = {
  key: AgeBandKey;
  min: number;
  max: number;
};

const AGE_BANDS: AgeBand[] = [
  { key: "18_29", min: 18, max: 29 },
  { key: "30_39", min: 30, max: 39 },
];

const resolveAgeBandKey = (age?: number | null): AgeBandKey => {
  if (!age || Number.isNaN(age)) return "18_29";
  const band = AGE_BANDS.find((b) => age >= b.min && age <= b.max);
  return band?.key ?? "18_29";
};

// ตารางหลักใช้สำหรับ push-up / squat / burpee (แบบ base) + plank
const TABLE: Record<Sex, Record<AgeBandKey, Record<Exercise, Band[]>>> = {
  male: {
    "18_29": {
      ...BASE_TABLE.male,
      squat: SQUAT_MALE_18_29,
      pushup: PUSHUP_MALE_18_29,
    },
    "30_39": {
      ...BASE_TABLE.male,
      squat: SQUAT_MALE_30_39,
      pushup: PUSHUP_MALE_30_39,
    },
  },
  female: {
    "18_29": {
      ...BASE_TABLE.female,
      squat: SQUAT_FEMALE_18_29,
      pushup: PUSHUP_FEMALE_18_29,
    },
    "30_39": {
      ...BASE_TABLE.female,
      squat: SQUAT_FEMALE_30_39,
      pushup: PUSHUP_FEMALE_30_39,
    },
  },
};

// ---------- Burpee แยกช่วงอายุ 18–24 / 25–30 / 31–35 ----------

type BurpeeAgeBandKey = "18_24" | "25_30" | "31_35";

type BurpeeAgeBand = {
  key: BurpeeAgeBandKey;
  min: number;
  max: number;
};

const BURPEE_AGE_BANDS: BurpeeAgeBand[] = [
  { key: "18_24", min: 18, max: 24 },
  { key: "25_30", min: 25, max: 30 },
  { key: "31_35", min: 31, max: 35 },
];

const resolveBurpeeAgeBandKey = (age?: number | null): BurpeeAgeBandKey => {
  if (!age || Number.isNaN(age)) return "18_24";
  const band = BURPEE_AGE_BANDS.find((b) => age >= b.min && age <= b.max);
  return band?.key ?? "18_24";
};

// ชาย
const BURPEE_MALE_18_24: Band[] = [
  { min: 27, max: Infinity, score: 7 }, // Excellent ≥27
  { min: 23, max: 26, score: 6 }, // Good 23–26
  { min: 20, max: 22, score: 5 }, // Above Average
  { min: 16, max: 19, score: 4 }, // Average
  { min: 12, max: 15, score: 3 }, // Below Average
  { min: 9, max: 11, score: 2 }, // Poor
  { min: 0, max: 8, score: 1 }, // Very Poor ≤8
];

const BURPEE_MALE_25_30: Band[] = [
  { min: 25, max: Infinity, score: 7 }, // ≥25
  { min: 21, max: 24, score: 6 }, // 21–24
  { min: 18, max: 20, score: 5 }, // 18–20
  { min: 15, max: 17, score: 4 }, // 15–17
  { min: 11, max: 14, score: 3 }, // 11–14
  { min: 8, max: 10, score: 2 }, // 8–10
  { min: 0, max: 7, score: 1 }, // ≤7
];

const BURPEE_MALE_31_35: Band[] = [
  { min: 24, max: Infinity, score: 7 }, // ≥24
  { min: 20, max: 23, score: 6 }, // 20–23
  { min: 17, max: 19, score: 5 }, // 17–19
  { min: 14, max: 16, score: 4 }, // 14–16
  { min: 10, max: 13, score: 3 }, // 10–13
  { min: 7, max: 9, score: 2 }, // 7–9
  { min: 0, max: 6, score: 1 }, // ≤6
];

// หญิง
const BURPEE_FEMALE_18_24: Band[] = [
  { min: 23, max: Infinity, score: 7 }, // ≥23
  { min: 20, max: 22, score: 6 }, // 20–22
  { min: 17, max: 19, score: 5 }, // 17–19
  { min: 13, max: 16, score: 4 }, // 13–16
  { min: 9, max: 12, score: 3 }, // 9–12
  { min: 6, max: 8, score: 2 }, // 6–8
  { min: 0, max: 5, score: 1 }, // ≤5
];

const BURPEE_FEMALE_25_30: Band[] = [
  { min: 21, max: Infinity, score: 7 }, // ≥21
  { min: 18, max: 20, score: 6 }, // 18–20
  { min: 15, max: 17, score: 5 }, // 15–17
  { min: 12, max: 14, score: 4 }, // 12–14
  { min: 8, max: 11, score: 3 }, // 8–11
  { min: 5, max: 7, score: 2 }, // 5–7
  { min: 0, max: 4, score: 1 }, // ≤4
];

const BURPEE_FEMALE_31_35: Band[] = [
  { min: 20, max: Infinity, score: 7 }, // ≥20
  { min: 17, max: 19, score: 6 }, // 17–19
  { min: 14, max: 16, score: 5 }, // 14–16
  { min: 11, max: 13, score: 4 }, // 11–13
  { min: 7, max: 10, score: 3 }, // 7–10
  { min: 4, max: 6, score: 2 }, // 4–6
  { min: 0, max: 3, score: 1 }, // ≤3
];

const BURPEE_TABLE: Record<Sex, Record<BurpeeAgeBandKey, Band[]>> = {
  male: {
    "18_24": BURPEE_MALE_18_24,
    "25_30": BURPEE_MALE_25_30,
    "31_35": BURPEE_MALE_31_35,
  },
  female: {
    "18_24": BURPEE_FEMALE_18_24,
    "25_30": BURPEE_FEMALE_25_30,
    "31_35": BURPEE_FEMALE_31_35,
  },
};

const levelFromTotal = (sum: number) => {
  if (sum >= 25) return "Excellent";
  if (sum >= 22) return "Good";
  if (sum >= 19) return "Above average";
  if (sum >= 16) return "Average";
  if (sum >= 13) return "Below Average";
  if (sum >= 10) return "Poor";
  return "Very Poor";
};

type Phase = "idle" | "countdown" | "active" | "rest" | "summary";

export function useFitnessTestMachine(opts: {
  sex: Sex;
  age?: number;
  kneePushupOffset?: number; // ผู้หญิงทำ knee push-up
}) {
  const { sex, age, kneePushupOffset = 0 } = opts;

  const ageBandKey = useMemo(() => resolveAgeBandKey(age), [age]);
  const burpeeAgeBandKey = useMemo(() => resolveBurpeeAgeBandKey(age), [age]);

  const [phase, setPhase] = useState<Phase>("idle");
  const [idx, setIdx] = useState(0);
  const ex = SEQUENCE[idx];

  const [timeLeft, setTimeLeft] = useState(WORK_SEC);
  const [restLeft, setRestLeft] = useState(REST_SEC);
  const [countdownLeft, setCountdownLeft] = useState(5);

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
  const plankStopTimeoutRef = useRef<number | null>(null);

  const clearPlankStopTimeout = () => {
    if (plankStopTimeoutRef.current) {
      window.clearTimeout(plankStopTimeoutRef.current);
      plankStopTimeoutRef.current = null;
    }
  };

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    clearTimer();
    if (phase === "countdown") {
      timerRef.current = window.setInterval(() => {
        setCountdownLeft((t) => {
          if (t <= 1) {
            clearTimer();
            setPhase("active");
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else if (phase === "active") {
      if (ex === "plank") {
        timerRef.current = window.setInterval(() => {
          setPlankSec((s) => (plankHold ? s + 1 : s));
        }, 1000);
      } else {
        setTimeLeft(WORK_SEC);
        timerRef.current = window.setInterval(() => {
          setTimeLeft((t) => {
            if (t <= 1) {
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
    setPhase("countdown");
    setCountdownLeft(5);
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
    if (idx < SEQUENCE.length - 1) {
      setPhase("rest");
      setRestLeft(1);
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
    setPhase("summary");
  }, [ex, phase]);

  const scorePerExercise = useMemo(() => {
    const toScore = (exercise: Exercise, raw: number) => {
      const value = exercise === "pushup" ? raw + kneePushupOffset : raw;

      let bands: Band[];

      if (exercise === "burpee") {
        // ใช้ตาราง burpee ตามเพศ + อายุ 18–24/25–30/31–35
        bands = BURPEE_TABLE[sex][burpeeAgeBandKey];
      } else {
        bands = TABLE[sex][ageBandKey][exercise];
      }

      const band = bands.find((b) => value >= b.min && value <= b.max);
      return band ? band.score : 1;
    };

    return {
      pushup: toScore("pushup", counts.pushup),
      squat: toScore("squat", counts.squat),
      burpee: toScore("burpee", counts.burpee),
      plank: toScore("plank", plankSec),
    };
  }, [sex, ageBandKey, burpeeAgeBandKey, counts, plankSec, kneePushupOffset]);

  const total =
    scorePerExercise.pushup +
    scorePerExercise.squat +
    scorePerExercise.burpee +
    scorePerExercise.plank;
  const level = levelFromTotal(total);

  useEffect(() => {
    if (ex !== "plank" || phase !== "active") {
      clearPlankStopTimeout();
      return;
    }
    if (!plankHold) {
      clearPlankStopTimeout();
      plankStopTimeoutRef.current = window.setTimeout(() => {
        clearTimer();
        setPhase("summary");
      }, 5000);
    } else {
      clearPlankStopTimeout();
    }
    return () => clearPlankStopTimeout();
  }, [ex, phase, plankHold]);

  return {
    phase,
    exercise: ex,
    index: idx,
    timeLeft,
    restLeft,
    countdownLeft,
    counts,
    plankSec,
    plankHold,
    scorePerExercise,
    total,
    level,
    start,
    stop,
    skip,
    onRep,
    setPlankHold,
    finishPlank,
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
