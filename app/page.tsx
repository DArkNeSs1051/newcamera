"use client";

import * as poseDetection from "@tensorflow-models/pose-detection";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import { useEffect, useMemo, useRef, useState } from "react";

const Home = () => {
  const version = "1.0.5"; // กำหนดเวอร์ชันของแอปพลิเคชัน
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reps, setReps] = useState(0);
  const [exerciseType, setExerciseType] = useState("squat");
  const exerciseTypeRef = useRef(exerciseType);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("กำลังโหลด กรุณารอสักครู่...");
  const [isMobile, setIsMobile] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(""); // เพิ่มตัวแปรสำหรับข้อความแจ้งเตือน
  const [soundEnabled, setSoundEnabled] = useState(true); // เปลี่ยนจาก false เป็น true เพื่อเปิดเสียงอัตโนมัติ
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null); // เพิ่มตัวแปรสำหรับจัดการเวลาแสดงข้อความ

  // สร้างตัวแปรสำหรับเก็บค่าต่างๆ
  const detectorRef = useRef<poseDetection.PoseDetector | null>(null);
  const posesRef = useRef<poseDetection.Pose[] | null>(null);
  const requestRef = useRef<number | null>(null);
  const edgesRef = useRef<Record<string, string>>({});

  // ตัวแปรสำหรับการตรวจจับท่า Push Up
  const elbowAngleRef = useRef<number>(999);
  const backAngleRef = useRef<number>(0);
  const upPositionRef = useRef<boolean>(false);
  const downPositionRef = useRef<boolean>(false);
  const highlightBackRef = useRef<boolean>(false);
  const backWarningGivenRef = useRef<boolean>(false);

  // ตัวแปรสำหรับการตรวจจับท่า Burpee
  const jumpDetectedRef = useRef<boolean>(false);
  const squatPositionRef = useRef<boolean>(false);
  const standingPositionRef = useRef<boolean>(true);
  const pushupPositionRef = useRef<boolean>(false);
  const kneeAngleRef = useRef<number>(180);
  const prevHipHeightRef = useRef<number>(0);
  const burpeeStep = useRef<number>(0);
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ตัวแปรสำหรับการตรวจจับท่า Squat
  const squatDownPositionRef = useRef<boolean>(false);
  const squatUpPositionRef = useRef<boolean>(true);
  const kneeAngleThresholdRef = useRef<number>(120);

  // ตัวแปรสำหรับการตรวจจับท่า Lunges
  const lungeDownPositionRef = useRef<boolean>(false);
  const lungeUpPositionRef = useRef<boolean>(true);
  const frontKneeAngleRef = useRef<number>(180);
  const kneeAlignmentWarningRef = useRef<boolean>(false);
  const currentSideRef = useRef<"left" | "right">("left"); // ติดตามฝั่งที่กำลังทำ

  // ตัวแปรสำหรับการตรวจจับท่า Russian Twist
  const russianTwistLeftRef = useRef(false);
  const russianTwistRightRef = useRef(false);
  const russianTwistCenterRef = useRef(true);
  const russianTwistWarningGivenRef = useRef(false);
  const lastTwistDirectionRef = useRef("");

  // เพิ่มตัวแปรสำหรับการจับเวลา Plank
  const [plankTime, setPlankTime] = useState(0);
  const plankTimerRef = useRef<NodeJS.Timeout | null>(null);
  const plankTimeRef = useRef(plankTime); // สร้าง ref เพื่อเก็บค่า plankTime
  const plankStartedRef = useRef<boolean>(false);
  const plankProperFormRef = useRef<boolean>(false);
  const plankWarningGivenRef = useRef<boolean>(false);

  // เพิ่มตัวแปรสำหรับการจับเวลา Side Plank
  const [sidePlankTime, setSidePlankTime] = useState(0);
  const sidePlankTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sidePlankTimeRef = useRef(plankTime); // สร้าง ref เพื่อเก็บค่า sidePlankTime
  const sidePlankStartedRef = useRef<boolean>(false);
  const sidePlankProperFormRef = useRef<boolean>(false);
  const sidePlankWarningGivenRef = useRef<boolean>(false);
  const sidePlankSideRef = useRef<string>("left");

  // ตัวแปรสำหรับการตรวจจับท่า Dumbbell Bench Press
  const dumbbellUpPositionRef = useRef<boolean>(true);
  const dumbbellDownPositionRef = useRef<boolean>(false);
  const dumbbellArmAngleRef = useRef<number>(180);
  const dumbbellFormWarningRef = useRef<boolean>(false);
  const dumbbellElbowPositionRef = useRef<boolean>(false);

  // ตัวแปรสำหรับการตรวจจับท่า Dumbbell Bent-Over Rows
  const bentOverRowUpPositionRef = useRef<boolean>(true);
  const bentOverRowDownPositionRef = useRef<boolean>(false);
  const bentOverRowBackAngleRef = useRef<number>(0);
  const bentOverRowArmAngleRef = useRef<number>(180);
  const bentOverRowFormWarningRef = useRef<boolean>(false);
  const bentOverRowProperBentRef = useRef<boolean>(false);

  // ตัวแปรสำหรับการตรวจจับท่า Dumbbell Shoulder Press
  const shoulderPressUpPositionRef = useRef<boolean>(true);
  const shoulderPressDownPositionRef = useRef<boolean>(false);
  const shoulderPressArmAngleRef = useRef<number>(180);
  const shoulderPressFormWarningRef = useRef<boolean>(false);
  const shoulderPressProperPostureRef = useRef<boolean>(false);
  const shoulderPressElbowAlignmentRef = useRef<boolean>(false);

  // ตัวแปรสำหรับการตรวจจับท่า Dumbbell Bicep Curls
  const bicepCurlUpPositionRef = useRef<boolean>(false);
  const bicepCurlDownPositionRef = useRef<boolean>(true);
  const bicepCurlArmAngleRef = useRef<number>(180);
  const bicepCurlFormWarningRef = useRef<boolean>(false);
  const bicepCurlElbowStabilityRef = useRef<boolean>(false);
  const bicepCurlWristPositionRef = useRef<boolean>(false);

  // ตัวแปรสำหรับการตรวจจับท่า Dumbbell Overhead Tricep Extension
  const tricepExtensionUpPositionRef = useRef<boolean>(true);
  const tricepExtensionDownPositionRef = useRef<boolean>(false);
  const tricepExtensionArmAngleRef = useRef<number>(180);

  // ตัวแปรสำหรับการตรวจจับท่า Dumbbell Romanian Deadlifts
  const romanianDeadliftUpPositionRef = useRef<boolean>(true);
  const romanianDeadliftDownPositionRef = useRef<boolean>(false);
  const romanianDeadliftHipAngleRef = useRef<number>(180);
  const romanianDeadliftBackAngleRef = useRef<number>(0);
  const romanianDeadliftFormWarningRef = useRef<boolean>(false);
  const romanianDeadliftHipHingeRef = useRef<boolean>(false);
  const romanianDeadliftKneeStabilityRef = useRef<boolean>(false);

  // ตัวแปรสำหรับการตรวจจับท่า Dumbbell Goblet Squat
  const gobletSquatDownPositionRef = useRef<boolean>(false);
  const gobletSquatUpPositionRef = useRef<boolean>(true);
  const gobletSquatKneeAngleRef = useRef<number>(180);
  const gobletSquatFormWarningRef = useRef<boolean>(false);
  const gobletSquatDumbbellPositionRef = useRef<boolean>(false);
  const gobletSquatBackPostureRef = useRef<boolean>(false);

  // ตัวแปรสำหรับการตรวจจับท่า Dumbbell Side Lateral Raises
  const lateralRaiseUpPositionRef = useRef<boolean>(false);
  const lateralRaiseDownPositionRef = useRef<boolean>(true);
  const lateralRaiseArmAngleRef = useRef<number>(0);
  const lateralRaiseFormWarningRef = useRef<boolean>(false);
  const lateralRaiseShoulderHeightRef = useRef<boolean>(false);
  const lateralRaiseElbowBentRef = useRef<boolean>(false);

  // ตัวแปรสำหรับการตรวจจับท่า Leg Raise
  const legRaiseUpPositionRef = useRef<boolean>(false);
  const legRaiseDownPositionRef = useRef<boolean>(true);
  const legRaiseHipAngleRef = useRef<number>(180);
  const legRaiseFormWarningRef = useRef<boolean>(false);
  const legRaiseBackArchWarningRef = useRef<boolean>(false);
  const legRaiseMomentumWarningRef = useRef<boolean>(false);

  type TExercise = {
    id: string;
    exercise: string;
    target: string;
    sets: string;
    rest: string;
    reps?: string;
    duration?: string;
  };

  type TExerciseStep = {
    exercise: string;
    stepNumber: number;
    setNumber: number;
    reps: number;
    restTime: string;
  };

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

  const [a, setA] = useState<TExercise[]>([]);
  const [b, setB] = useState<TB[]>([]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        if (data?.type === "FROM_APP") {
          setA(data.payload);
          setB(data.video);
        }
      } catch (e) {
        console.error("❌ รับข้อมูลพัง:", e);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ReactNativeWebView) {
      (window as any).ReactNativeWebView.postMessage(
        JSON.stringify({
          message: "Hello from Next.js", // ✅ stringified
        })
      );
    }
  }, []);

  const timeStringToSeconds = (timeStr: string) => {
    const parts = timeStr.split(":").map(Number);
    if (parts.length === 2) {
      // mm:ss
      const [minutes, seconds] = parts;
      return minutes * 60 + seconds;
    } else if (parts.length === 3) {
      // hh:mm:ss
      const [hours, minutes, seconds] = parts;
      return hours * 3600 + minutes * 60 + seconds;
    } else if (parts.length === 1) {
      // ss
      return parts[0];
    } else {
      return 0; // กรณี format ไม่ถูกต้อง
    }
  };

  const getExerciseSteps = (exerciseList: TExercise[]): TExerciseStep[] => {
    const steps: TExerciseStep[] = [];

    exerciseList.forEach((item, index) => {
      // แปลงจำนวนเซ็ตเป็นตัวเลข ถ้าไม่มีให้เป็น 1
      const sets = parseInt(item.sets, 10) || 1;

      // วนลูปตามจำนวนเซ็ต
      for (let i = 1; i <= sets; i++) {
        const exerciseNameLower = item.exercise.toLocaleLowerCase();

        // --- เงื่อนไขสำหรับ Side Plank ---
        if (exerciseNameLower === "side plank") {
          // แปลงเวลาจากรูปแบบ "X นาที" เป็นวินาที
          const totalSeconds = item.reps ? timeStringToSeconds(item.reps) : 0;
          const timePerSide = Math.ceil(totalSeconds / 2); // ปัดเศษขึ้นเพื่อให้แน่ใจว่าเวลารวมไม่น้อยกว่าที่กำหนด

          // เพิ่มสเต็ปสำหรับข้างซ้าย (ยังไม่มีเวลาพัก)
          steps.push({
            exercise: "side plank_left", // ชื่อท่าสำหรับข้างซ้าย
            stepNumber: steps.length + 1, // ใช้ length ของ steps เพื่อให้เลข step ต่อเนื่องกัน
            setNumber: i,
            reps: timePerSide,
            restTime: `0:05 นาที`, // พัก 0 นาทีระหว่างเปลี่ยนข้าง
          });

          // เพิ่มสเต็ปสำหรับข้างขวา (มีเวลาพักหลังทำจบ)
          steps.push({
            exercise: "side plank_right", // ชื่อท่าสำหรับข้างขวา
            stepNumber: steps.length + 1,
            setNumber: i,
            reps: timePerSide,
            restTime: `${item.rest} นาที`,
          });
        }
        // --- เงื่อนไขสำหรับ Plank (ยังคงเหมือนเดิม) ---
        else if (exerciseNameLower === "plank") {
          steps.push({
            exercise: item.exercise,
            stepNumber: index + 1,
            setNumber: i,
            reps: item.reps ? parseInt(item.reps, 10) * 60 : 0, // แปลงนาทีเป็นวินาที
            restTime: `${item.rest} นาที`,
          });
        }
        // --- สำหรับท่าออกกำลังกายอื่นๆ ---
        else {
          steps.push({
            exercise: item.exercise,
            stepNumber: index + 1,
            setNumber: i,
            reps: item.reps ? +item.reps : 0, // แปลง reps เป็นตัวเลข
            restTime: `${item.rest} นาที`,
          });
        }
      }
    });

    return steps;
  };

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStepRef = useRef<TExerciseStep | null>(null);
  // เพิ่ม State เหล่านี้เข้าไป
  const [isResting, setIsResting] = useState(false);
  const [restTime, setRestTime] = useState(0);
  const restTimerRef = useRef<NodeJS.Timeout | null>(null);

  const steps = getExerciseSteps(a);
  const currentStep = steps[currentStepIndex];

  // --- เพิ่ม 2 บรรทัดนี้เข้าไป ---
  const stepsRef = useRef(steps);
  useEffect(() => {
    stepsRef.current = steps;
  }, [steps]);
  // --------------------------------
  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  // ฟังก์ชันสำหรับเริ่มการพักโดยเฉพาะ
  const startRestPeriod = () => {
    const currentStep = currentStepRef.current;
    if (!currentStep) return;

    const totalRestSeconds = timeStringToSeconds(currentStep.restTime);

    setIsResting(true);
    setRestTime(totalRestSeconds);

    if (restTimerRef.current) clearInterval(restTimerRef.current);

    restTimerRef.current = setInterval(() => {
      setRestTime((prevTime) => {
        if (prevTime <= 1) {
          if (restTimerRef.current) clearInterval(restTimerRef.current);
          setIsResting(false);

          // ไปยังท่าถัดไป
          setCurrentStepIndex((i) => {
            const nextIndex = i + 1;
            if (nextIndex >= stepsRef.current.length) {
              speak("สุดยอดมาก คุณออกกำลังกายครบแล้ว");
              return i;
            }
            const nextStep = stepsRef.current[nextIndex];
            speak(`เตรียมตัวสำหรับท่าถัดไป, ${nextStep.exercise}`);
            return nextIndex;
          });

          // รีเซ็ตค่าสำหรับท่าใหม่
          setReps(0);
          setPlankTime(0);
          setSidePlankTime(0);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  };

  // handleDoOneRep ที่ปรับปรุงใหม่
  const handleDoOneRep = (currentStepRep: TExerciseStep | null) => {
    // ป้องกันการทำงานซ้อนขณะพัก
    if (!currentStepRep || isResting) {
      return;
    }

    const isPlank = currentStepRep.exercise.toLowerCase() === "plank";
    const isSidePlank = currentStepRep.exercise.toLowerCase() === "side plank";
    let isSetComplete = false;

    if (isPlank || isSidePlank) {
      const currentTime = isPlank
        ? plankTimeRef.current
        : sidePlankTimeRef.current;
      const expectedTime = currentStepRep.reps;

      if (currentTime >= expectedTime) {
        isSetComplete = true;
        // หยุด Timer ของท่าออกกำลังกาย
        if (isPlank) {
          if (plankTimerRef.current) clearInterval(plankTimerRef.current);
          plankTimerRef.current = null;
          plankStartedRef.current = false;
        } else {
          // Side Plank
          if (sidePlankTimerRef.current)
            clearInterval(sidePlankTimerRef.current);
          sidePlankTimerRef.current = null;
          sidePlankStartedRef.current = false;
        }
      }
    } else {
      // สำหรับท่าที่นับจำนวนครั้ง (Reps)
      setReps((prevReps) => {
        const newReps = prevReps + 1;
        if (newReps >= currentStepRep.reps) {
          isSetComplete = true; // ตั้งค่าสถานะว่าครบเซ็ต
          startRestPeriod(); // เริ่มพัก
          return 0; // รีเซ็ตจำนวนครั้ง
        }
        return newReps;
      });
    }

    // ถ้าเป็น Plank หรือ Side Plank ที่ทำครบแล้ว ให้เริ่มพัก
    if (isSetComplete && (isPlank || isSidePlank)) {
      startRestPeriod();
    }
  };

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (a.length > 0 && a[0]?.exercise && !initialized) {
      setExerciseType(a[0].exercise.toLocaleLowerCase());
      setInitialized(true);
    }
  }, [a, initialized]);

  // ฟังก์ชันสำหรับการพูด
  const speak = (text: string) => {
    if (
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      soundEnabled
    ) {
      const msg = new SpeechSynthesisUtterance(text);
      msg.lang = "th-TH"; // ภาษาไทย
      window.speechSynthesis.speak(msg);
    }
  };

  // ฟังก์ชันสำหรับแสดงข้อความแจ้งเตือน
  const showFeedback = (message: string) => {
    setFeedbackMessage(message);
    speak(message);

    // ล้างข้อความหลังจาก 3 วินาที
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }

    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedbackMessage("");
    }, 3000);
  };

  // เพิ่มตัวแปรสำหรับตรวจจับการกระโดดพร้อมยกแขน
  const jumpWithArmsUpRef = useRef<boolean>(false);

  // ฟังก์ชันสำหรับการเริ่มต้นตัวตรวจจับท่าทาง
  const initDetector = async () => {
    try {
      const detectorConfig = {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
      };

      const detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        detectorConfig
      );

      detectorRef.current = detector;

      edgesRef.current = {
        "5,7": "m",
        "7,9": "m",
        "6,8": "c",
        "8,10": "c",
        "5,6": "y",
        "5,11": "m",
        "6,12": "c",
        "11,12": "y",
        "11,13": "m",
        "13,15": "m",
        "12,14": "c",
        "14,16": "c",
      };

      setLoading(false);
    } catch (error) {
      console.error("ไม่สามารถโหลดโมเดลได้:", error);
      setMessage("เกิดข้อผิดพลาดในการโหลดโมเดล กรุณาลองใหม่อีกครั้ง");
    }
  };

  // ฟังก์ชันสำหรับการประมาณท่าทาง
  const getPoses = async () => {
    if (!detectorRef.current || !videoRef.current) return;

    try {
      posesRef.current = await detectorRef.current.estimatePoses(
        videoRef.current
      );
      requestRef.current = requestAnimationFrame(getPoses);
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการประมาณท่าทาง:", error);
    }
  };

  // ฟังก์ชันสำหรับการวาดจุดสำคัญ
  const drawKeypoints = (ctx: CanvasRenderingContext2D) => {
    let count = 0;
    if (posesRef.current && posesRef.current.length > 0) {
      for (let kp of posesRef.current[0].keypoints) {
        const { x, y, score } = kp;
        if (score && score > 0.2) {
          count = count + 1;
          ctx.fillStyle = "white";
          ctx.strokeStyle = "black";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(x, y, 8, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        }
      }

      updateArmAngle();
      updateBackAngle();

      // เลือกฟังก์ชันตรวจจับตามประเภทการออกกำลังกาย
      if (exerciseTypeRef.current === "push up") {
        inUpPosition();
        inDownPosition();
      } else if (exerciseTypeRef.current === "burpee no push up") {
        detectBeginnerBurpee();
      } else if (exerciseTypeRef.current === "burpee with push up") {
        detectExpertBurpee();
      } else if (exerciseTypeRef.current === "squat") {
        detectSquat();
      } else if (exerciseTypeRef.current === "leg lunges") {
        detectLunges();
      } else if (exerciseTypeRef.current === "russian twist") {
        detectRussianTwist();
      } else if (exerciseTypeRef.current === "leg raise") {
        detectLegRaise();
      } else if (exerciseTypeRef.current === "plank") {
        detectPlank();
      } else if (exerciseTypeRef.current === "side plank") {
        detectSidePlank();
      } else if (exerciseTypeRef.current === "dumbbell bench press") {
        detectDumbbellBenchPress();
      } else if (exerciseTypeRef.current === "dumbbell bent over row") {
        detectDumbbellBentOverRows();
      } else if (exerciseTypeRef.current === "dumbbell shoulder press") {
        detectDumbbellShoulderPress();
      } else if (exerciseTypeRef.current === "dumbbell bicep curls") {
        detectDumbbellBicepCurls();
      } else if (
        exerciseTypeRef.current === "dumbbell overhead triceps extension"
      ) {
        detectDumbbellOverheadTricepExtension();
      } else if (exerciseTypeRef.current === "dumbbell romanian deadlift") {
        detectDumbbellRomanianDeadlifts();
      } else if (exerciseTypeRef.current === "dumbbell goblet squat") {
        detectDumbbellGobletSquat();
      } else if (exerciseTypeRef.current === "dumbbell side lateral raises") {
        detectDumbbellSideLateralRaises();
      }
    }
  };

  // ฟังก์ชันสำหรับการวาดโครงกระดูก
  const drawSkeleton = (ctx: CanvasRenderingContext2D) => {
    const confidence_threshold = 0.5;

    if (posesRef.current && posesRef.current.length > 0) {
      for (const [key, value] of Object.entries(edgesRef.current)) {
        const p = key.split(",");
        const p1 = parseInt(p[0]);
        const p2 = parseInt(p[1]);

        const y1 = posesRef.current[0].keypoints[p1].y;
        const x1 = posesRef.current[0].keypoints[p1].x;
        const c1 = posesRef.current[0].keypoints[p1].score;
        const y2 = posesRef.current[0].keypoints[p2].y;
        const x2 = posesRef.current[0].keypoints[p2].x;
        const c2 = posesRef.current[0].keypoints[p2].score;

        if (
          c1 &&
          c1 > confidence_threshold &&
          c2 &&
          c2 > confidence_threshold
        ) {
          if (
            highlightBackRef.current === true &&
            (p2 === 11 || (p1 === 6 && p2 === 12) || p2 === 13 || p1 === 12)
          ) {
            ctx.lineWidth = 3;
            ctx.strokeStyle = "red";
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          } else {
            ctx.lineWidth = 2;
            ctx.strokeStyle = "rgb(0, 255, 0)";
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
        }
      }
    }
  };

  // ฟังก์ชันสำหรับการอัปเดตมุมเข่า
  const updateKneeAngle = () => {
    if (!posesRef.current || posesRef.current.length === 0) return;

    const leftHip = posesRef.current[0].keypoints[11];
    const leftKnee = posesRef.current[0].keypoints[13];
    const leftAnkle = posesRef.current[0].keypoints[15];

    if (
      leftHip.score &&
      leftKnee.score &&
      leftAnkle.score &&
      leftHip.score > 0.2 &&
      leftKnee.score > 0.2 &&
      leftAnkle.score > 0.2
    ) {
      const angle =
        (Math.atan2(leftHip.y - leftKnee.y, leftHip.x - leftKnee.x) -
          Math.atan2(leftAnkle.y - leftKnee.y, leftAnkle.x - leftKnee.x)) *
        (180 / Math.PI);

      kneeAngleRef.current = Math.abs(angle);
    }
  };
  const hasJumpedInThisCycleRef = useRef(false);
  // ฟังก์ชันสำหรับการตรวจจับการกระโดด
  const detectJump = () => {
    if (!posesRef.current || posesRef.current.length === 0) return;

    const pose = posesRef.current[0];
    const get = (name: string) => pose.keypoints.find((p) => p.name === name);

    const leftHip = get("left_hip");
    const rightHip = get("right_hip");
    const leftWrist = get("left_wrist");
    const rightWrist = get("right_wrist");
    const leftShoulder = get("left_shoulder");
    const rightShoulder = get("right_shoulder");

    const minScore = 0.2;

    // ตรวจสอบว่า keypoint ทุกตัวไม่เป็น undefined และมีความแม่นยำพอ
    if (
      leftHip?.score &&
      rightHip?.score &&
      leftWrist?.score &&
      rightWrist?.score &&
      leftShoulder?.score &&
      rightShoulder?.score &&
      leftHip.score > minScore &&
      rightHip.score > minScore &&
      leftWrist.score > minScore &&
      rightWrist.score > minScore &&
      leftShoulder.score > minScore &&
      rightShoulder.score > minScore
    ) {
      const currentHipHeight = (leftHip.y + rightHip.y) / 2;
      const hipLift = Math.abs(prevHipHeightRef.current - currentHipHeight);

      if (hipLift > 0) {
        jumpDetectedRef.current = true;
        hasJumpedInThisCycleRef.current = true;

        const leftArmUp = leftWrist.y < leftShoulder.y;
        const rightArmUp = rightWrist.y < rightShoulder.y;

        if (leftArmUp && rightArmUp) {
          if (!jumpWithArmsUpRef.current) {
            jumpWithArmsUpRef.current = true;
            showFeedback("กระโดดพร้อมยกแขน! เยี่ยมมาก");
          }
        }
      } else {
        jumpDetectedRef.current = false;
        jumpWithArmsUpRef.current = false;
      }

      prevHipHeightRef.current = currentHipHeight;
    }
  };

  // ฟังก์ชันสำหรับการตรวจสอบท่า Squat
  const detectSquatPosition = () => {
    if (kneeAngleRef.current < 120) {
      squatPositionRef.current = true;
      standingPositionRef.current = false;
    } else if (kneeAngleRef.current > 160) {
      standingPositionRef.current = true;
      squatPositionRef.current = false;
    }
  };

  // ฟังก์ชันสำหรับการตรวจสอบท่า Burpee แบบผู้เริ่มต้น
  const detectBeginnerBurpee = () => {
    if (!posesRef.current || posesRef.current.length === 0) return;

    if (burpeeStep.current === 0) {
      jumpDetectedRef.current = false;
      jumpWithArmsUpRef.current = false;
      hasJumpedInThisCycleRef.current = false;
    }
    // อัปเดตสถานะท่าทางต่าง ๆ
    detectJump();
    inUpPosition();
    inDownPosition();
    updateKneeAngle();
    detectSquatPosition();

    const isStanding = standingPositionRef.current;
    const isSquatting = squatPositionRef.current;
    const isPushup = downPositionRef.current || upPositionRef.current;
    let isJumping = jumpDetectedRef.current;
    let isArmsUp = jumpWithArmsUpRef.current;

    // ตรวจสอบว่าอยู่ในท่า Push Up หรือไม่
    pushupPositionRef.current = isPushup;

    // เคลียร์ Timeout เก่าถ้ามี
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }

    // ปรับเพื่อกันการ trigger ซ้ำ
    if (burpeeStep.current === 0 && isStanding) {
      burpeeStep.current = 1;
      showFeedback("ย่อตัวลงแล้วเตรียมตั้งท่า Push Up");
    } else if (burpeeStep.current === 1 && isSquatting) {
      burpeeStep.current = 2;
      showFeedback("ทำท่า Push Up แล้วกลับมานั่งยอง");
    } else if (burpeeStep.current === 2 && isPushup) {
      burpeeStep.current = 3;
      showFeedback("กระโดดพร้อมยกแขนขึ้นเหนือศีรษะ");
    } else if (burpeeStep.current === 3 && isJumping && isArmsUp) {
      burpeeStep.current = 4;
      showFeedback("กลับมายืนตรง");
    } else if (burpeeStep.current === 4 && isStanding) {
      handleDoOneRep(currentStepRef.current);
      burpeeStep.current = 0;
      // รีเซ็ตสถานะกระโดด
      jumpDetectedRef.current = false;
      jumpWithArmsUpRef.current = false;
      hasJumpedInThisCycleRef.current = false;
      showFeedback("ดีมาก! ทำครบ 1 ครั้ง");
    }

    // รีเซ็ต step ถ้าไม่ขยับเกิน 3 วินาที
    resetTimeoutRef.current = setTimeout(() => {
      if (burpeeStep.current !== 0) {
        burpeeStep.current = 0;
        showFeedback("หยุดนานเกินไป เริ่มใหม่อีกครั้ง");
      }
    }, 3000);
  };

  // ฟังก์ชันสำหรับการตรวจสอบท่า Burpee แบบผู้เชี่ยวชาญ
  const detectExpertBurpee = () => {
    if (!posesRef.current || posesRef.current.length === 0) return;

    if (burpeeStep.current === 0) {
      jumpDetectedRef.current = false;
      jumpWithArmsUpRef.current = false;
      hasJumpedInThisCycleRef.current = false;
    }
    // อัปเดตสถานะท่าทางต่าง ๆ
    detectJump();
    inUpPosition();
    inDownPosition();
    updateKneeAngle();
    detectSquatPosition();

    const isStanding = standingPositionRef.current;
    const isSquatting = squatPositionRef.current;
    const isPushup = downPositionRef.current || upPositionRef.current;
    let isJumping = jumpDetectedRef.current;
    let isArmsUp = jumpWithArmsUpRef.current;

    // ตรวจสอบว่าอยู่ในท่า Push Up หรือไม่
    pushupPositionRef.current = isPushup;

    // เคลียร์ Timeout เดิมถ้ามี
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }

    // ปรับลำดับการตรวจสอบ step ให้เหมือนกับ beginner
    if (burpeeStep.current === 0 && isStanding) {
      burpeeStep.current = 1;
      isJumping = false;
      isArmsUp = false;
      showFeedback("ย่อตัวลงแล้วเตรียมตั้งท่า Push Up");
    } else if (burpeeStep.current === 1 && isSquatting) {
      burpeeStep.current = 2;
      showFeedback("ทำท่า Push Up แล้วกลับมานั่งยอง");
    } else if (burpeeStep.current === 2 && isPushup) {
      burpeeStep.current = 3;
      showFeedback("กระโดดพร้อมยกแขนขึ้นเหนือศีรษะ");
    } else if (burpeeStep.current === 3 && isJumping && isArmsUp) {
      burpeeStep.current = 4;
      showFeedback("กลับมายืนตรง");
    } else if (burpeeStep.current === 4 && isStanding) {
      handleDoOneRep(currentStepRef.current);
      burpeeStep.current = 0;
      jumpDetectedRef.current = false;
      jumpWithArmsUpRef.current = false;
      hasJumpedInThisCycleRef.current = false;
      showFeedback("สุดยอด! ทำครบ 1 ครั้งแล้ว");
    }

    // รีเซ็ตถ้าไม่ขยับภายใน 3 วินาที
    resetTimeoutRef.current = setTimeout(() => {
      if (burpeeStep.current !== 0) {
        burpeeStep.current = 0;
        showFeedback("หยุดนานเกินไป เริ่มใหม่อีกครั้ง");
      }
    }, 3000);
  };

  // ฟังก์ชันสำหรับการตรวจสอบท่า Squat
  const detectSquat = () => {
    if (isResting) return;

    if (!posesRef.current || posesRef.current.length === 0) return;

    updateKneeAngle();

    // ตรวจสอบว่าอยู่ในท่า Squat ลง (ย่อตัว)
    if (
      kneeAngleRef.current < kneeAngleThresholdRef.current &&
      squatUpPositionRef.current
    ) {
      squatDownPositionRef.current = true;
      squatUpPositionRef.current = false;
      showFeedback("ย่อตัวลงแล้ว ดันสะโพกไปด้านหลังพร้อมงอเข่า");
    }
    // ตรวจสอบว่ากลับมายืนตรง
    else if (kneeAngleRef.current > 160 && squatDownPositionRef.current) {
      squatUpPositionRef.current = true;
      squatDownPositionRef.current = false;
      // setReps((prev) => prev + 1);
      handleDoOneRep(currentStepRef.current);
      showFeedback("ดีมาก! ทำครบ 1 ครั้ง");
    }

    // ตรวจสอบว่าเข่าไม่เลยปลายเท้ามากเกินไป
    if (squatDownPositionRef.current) {
      const leftKnee = posesRef.current[0].keypoints[13];
      const leftAnkle = posesRef.current[0].keypoints[15];

      if (
        leftKnee.score &&
        leftAnkle.score &&
        leftKnee.score > 0.2 &&
        leftAnkle.score > 0.2
      ) {
        if (leftKnee.x > leftAnkle.x + 50) {
          // เข่าเลยปลายเท้ามากเกินไป
          showFeedback("ระวัง! เข่าไม่ควรเลยปลายเท้ามากเกินไป");
        }
      }
    }
  };

  // ฟังก์ชันสำหรับตรวจจับท่า Lunges โดยใช้แค่ front knee
  const detectLunges = () => {
    if (!posesRef.current || posesRef.current.length === 0) return;

    const pose = posesRef.current[0];
    const get = (name: string) => pose.keypoints.find((p) => p.name === name);

    // ดึงตำแหน่งทั้งสองข้าง
    const leftHip = get("left_hip");
    const leftKnee = get("left_knee");
    const leftAnkle = get("left_ankle");

    const rightHip = get("right_hip");
    const rightKnee = get("right_knee");
    const rightAnkle = get("right_ankle");

    // ตรวจสอบข้อมูลครบหรือไม่
    const allLeft =
      leftHip?.score &&
      leftKnee?.score &&
      leftAnkle?.score &&
      leftHip.score > 0.2 &&
      leftKnee.score > 0.2 &&
      leftAnkle.score > 0.2;

    const allRight =
      rightHip?.score &&
      rightKnee?.score &&
      rightAnkle?.score &&
      rightHip.score > 0.2 &&
      rightKnee.score > 0.2 &&
      rightAnkle.score > 0.2;

    if (!allLeft && !allRight) return;

    // ตรวจทีละฝั่ง
    const side = currentSideRef.current;
    const hip = side === "left" ? leftHip! : rightHip!;
    const knee = side === "left" ? leftKnee! : rightKnee!;
    const ankle = side === "left" ? leftAnkle! : rightAnkle!;

    const angle = calculateAngle(hip, knee, ankle);
    frontKneeAngleRef.current = angle;

    // ลงท่า
    if (angle >= 80 && angle <= 100 && lungeUpPositionRef.current) {
      lungeDownPositionRef.current = true;
      lungeUpPositionRef.current = false;
      showFeedback(`ย่อตัวลงแล้ว (${side === "left" ? "ขาซ้าย" : "ขาขวา"})`);

      // ตรวจเข่าเลยเท้า
      if (knee.x > ankle.x + 50) {
        if (!kneeAlignmentWarningRef.current) {
          showFeedback("เข่าเลยปลายเท้าเกินไป");
          kneeAlignmentWarningRef.current = true;
        }
      } else {
        kneeAlignmentWarningRef.current = false;
      }
    }

    // ยืนกลับ
    else if (angle > 160 && lungeDownPositionRef.current) {
      lungeUpPositionRef.current = true;
      lungeDownPositionRef.current = false;
      handleDoOneRep(currentStepRef.current);
      showFeedback(
        `ดีมาก! ทำครบ 1 ครั้ง (${side === "left" ? "ซ้าย" : "ขวา"})`
      );
      kneeAlignmentWarningRef.current = false;

      // สลับข้าง
      currentSideRef.current = side === "left" ? "right" : "left";
    }
  };

  // ฟังก์ชันสำหรับตรวจจับท่า Russian Twist
  const detectRussianTwist = () => {
    if (!posesRef.current || posesRef.current.length === 0) return;

    const pose = posesRef.current[0];
    const get = (name: string) => pose.keypoints.find((p) => p.name === name);

    const leftWrist = get("left_wrist");
    const rightWrist = get("right_wrist");
    const leftShoulder = get("left_shoulder");
    const rightShoulder = get("right_shoulder");
    const leftHip = get("left_hip");
    const rightHip = get("right_hip");
    const leftKnee = get("left_knee");
    const rightKnee = get("right_knee");

    if (
      !leftWrist?.score ||
      leftWrist.score < 0.3 ||
      !rightWrist?.score ||
      rightWrist.score < 0.3 ||
      !leftShoulder?.score ||
      leftShoulder.score < 0.3 ||
      !rightShoulder?.score ||
      rightShoulder.score < 0.3 ||
      !leftHip?.score ||
      leftHip.score < 0.3 ||
      !rightHip?.score ||
      rightHip.score < 0.3 ||
      !leftKnee?.score ||
      leftKnee.score < 0.3 ||
      !rightKnee?.score ||
      rightKnee.score < 0.3
    ) {
      return;
    }

    const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
    const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
    const hipMidX = (leftHip.x + rightHip.x) / 2;
    const hipMidY = (leftHip.y + rightHip.y) / 2;
    const kneeMidY = (leftKnee.y + rightKnee.y) / 2;

    const leftKneeAngle = calculateAngle(leftHip, leftKnee, {
      x: leftKnee.x,
      y: leftKnee.y + 100,
    });
    const rightKneeAngle = calculateAngle(rightHip, rightKnee, {
      x: rightKnee.x,
      y: rightKnee.y + 100,
    });
    const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;

    const feetOffGround = hipMidY > kneeMidY + 100;
    const isProperSitting =
      avgKneeAngle > 20 && avgKneeAngle < 50 && feetOffGround;

    if (!isProperSitting) {
      if (!russianTwistWarningGivenRef.current) {
        showFeedback("งอเข่าประมาณ 90° และยกเท้าขึ้นจากพื้น");
        russianTwistWarningGivenRef.current = true;
      }
      return;
    } else {
      russianTwistWarningGivenRef.current = false;
    }

    const torsoAngle = calculateAngle(leftHip, leftShoulder, rightHip);
    const backLeanProper = torsoAngle > 0 && torsoAngle < 35;
    if (!backLeanProper) {
      showFeedback("เอนไปข้างหลังประมาณ 45°");
      return;
    }

    const handsMidX = (leftWrist.x + rightWrist.x) / 2;
    const handsMidY = (leftWrist.y + rightWrist.y) / 2;

    const armsInPosition = handsMidY > shoulderMidY && handsMidY < hipMidY + 50;

    if (!armsInPosition) {
      showFeedback("เหยียดแขนตรงไว้ระดับอก และจับมือไว้ด้วยกัน");
      return;
    }

    const torsoMidX = (shoulderMidX + hipMidX) / 2;
    const rotationThreshold = 60;

    const isTwistingLeft = handsMidX < torsoMidX - rotationThreshold;

    const isTwistingRight = handsMidX > torsoMidX + rotationThreshold;
    const isCenter = !isTwistingLeft && !isTwistingRight;

    if (
      isTwistingLeft &&
      !russianTwistLeftRef.current &&
      russianTwistCenterRef.current
    ) {
      russianTwistLeftRef.current = true;
      russianTwistRightRef.current = false;
      russianTwistCenterRef.current = false;

      if (lastTwistDirectionRef.current === "right") {
        handleDoOneRep(currentStepRef.current);
        showFeedback("ดีมาก! หมุนซ้าย");
      } else {
        showFeedback("หมุนซ้าย");
      }
      lastTwistDirectionRef.current = "left";
    } else if (
      isTwistingRight &&
      !russianTwistRightRef.current &&
      russianTwistCenterRef.current
    ) {
      russianTwistRightRef.current = true;
      russianTwistLeftRef.current = false;
      russianTwistCenterRef.current = false;

      if (lastTwistDirectionRef.current === "left") {
        handleDoOneRep(currentStepRef.current);
        showFeedback("ดีมาก! หมุนขวา");
      } else {
        showFeedback("หมุนขวา");
      }
      lastTwistDirectionRef.current = "right";
    } else if (
      isCenter &&
      (russianTwistLeftRef.current || russianTwistRightRef.current)
    ) {
      russianTwistCenterRef.current = true;
      russianTwistLeftRef.current = false;
      russianTwistRightRef.current = false;
    }
  };

  // ฟังก์ชันสำหรับการตรวจสอบท่า Leg Raise (ปรับลดความเข้มข้น)
  const detectLegRaise = () => {
    if (!posesRef.current || posesRef.current.length === 0) return;

    const pose = posesRef.current[0];
    const get = (name: string) => pose.keypoints.find((p) => p.name === name);

    const leftHip = get("left_hip");
    const rightHip = get("right_hip");
    const leftKnee = get("left_knee");
    const rightKnee = get("right_knee");
    const leftAnkle = get("left_ankle");
    const rightAnkle = get("right_ankle");
    const leftShoulder = get("left_shoulder");
    const rightShoulder = get("right_shoulder");

    if (
      !leftHip?.score ||
      leftHip.score < 0.15 ||
      !rightHip?.score ||
      rightHip.score < 0.15 ||
      !leftKnee?.score ||
      leftKnee.score < 0.15 ||
      !rightKnee?.score ||
      rightKnee.score < 0.15 ||
      !leftAnkle?.score ||
      leftAnkle.score < 0.15 ||
      !rightAnkle?.score ||
      rightAnkle.score < 0.15
    ) {
      return;
    }

    const hipMidX = (leftHip.x + rightHip.x) / 2;
    const hipMidY = (leftHip.y + rightHip.y) / 2;
    const shoulderMidX = ((leftShoulder?.x || 0) + (rightShoulder?.x || 0)) / 2;
    const shoulderMidY = ((leftShoulder?.y || 0) + (rightShoulder?.y || 0)) / 2;
    const kneeMidX = (leftKnee.x + rightKnee.x) / 2;
    const kneeMidY = (leftKnee.y + rightKnee.y) / 2;
    const ankleMidX = (leftAnkle.x + rightAnkle.x) / 2;
    const ankleMidY = (leftAnkle.y + rightAnkle.y) / 2;

    const isLyingDown =
      leftShoulder?.score && rightShoulder?.score
        ? Math.abs(shoulderMidY - hipMidY) < 100
        : true;

    if (!isLyingDown) {
      if (!legRaiseFormWarningRef.current) {
        showFeedback("นอนหงายบนพื้น ให้ลำตัวตรง");
        legRaiseFormWarningRef.current = true;
      }
      return;
    } else {
      legRaiseFormWarningRef.current = false;
    }

    if (leftShoulder?.score && rightShoulder?.score) {
      const hipAngleLeft = calculateAngle(
        { x: shoulderMidX, y: shoulderMidY },
        { x: leftHip.x, y: leftHip.y },
        { x: leftKnee.x, y: leftKnee.y }
      );
      const hipAngleRight = calculateAngle(
        { x: shoulderMidX, y: shoulderMidY },
        { x: rightHip.x, y: rightHip.y },
        { x: rightKnee.x, y: rightKnee.y }
      );
      legRaiseHipAngleRef.current = (hipAngleLeft + hipAngleRight) / 2;
    }

    const leftLegStraight = calculateAngle(leftHip, leftKnee, leftAnkle) > 140;
    const rightLegStraight =
      calculateAngle(rightHip, rightKnee, rightAnkle) > 140;
    const bothLegsStright = leftLegStraight && rightLegStraight;

    if (!bothLegsStright && !legRaiseMomentumWarningRef.current) {
      showFeedback("พยายามเหยียดขาให้ตรงมากขึ้น");
      legRaiseMomentumWarningRef.current = true;
      setTimeout(() => {
        legRaiseMomentumWarningRef.current = false;
      }, 4000);
    }

    const backArch =
      leftShoulder?.score && rightShoulder?.score
        ? Math.abs(shoulderMidY - hipMidY)
        : 0;
    if (backArch > 60 && leftShoulder?.score && rightShoulder?.score) {
      if (!legRaiseBackArchWarningRef.current) {
        showFeedback("พยายามกดหลังลงแนบพื้น");
        legRaiseBackArchWarningRef.current = true;
      }
    } else {
      legRaiseBackArchWarningRef.current = false;
    }

    const leftLegRaised = leftAnkle.y < leftHip.y - 40;
    const rightLegRaised = rightAnkle.y < rightHip.y - 40;

    const leftLegDown = leftAnkle.y > leftHip.y + 30;

    const rightLegDown = rightAnkle.y > rightHip.y + 30;

    const bothLegsRaised =
      leftLegRaised && rightLegRaised && leftLegStraight && rightLegStraight;
    const bothLegsDown =
      leftLegDown && rightLegDown && leftLegStraight && rightLegStraight;

    const legsInMiddlePosition =
      (leftAnkle.y > leftHip.y - 40 && leftAnkle.y < leftHip.y + 40) ||
      (rightAnkle.y > rightHip.y - 40 && rightAnkle.y < rightHip.y + 40);

    const legsTooHigh =
      leftShoulder?.score && rightShoulder?.score
        ? ankleMidY < shoulderMidY - 30
        : false;

    if (legsTooHigh) {
      showFeedback("ลดการยกขาลงเล็กน้อย");
    }

    if (
      bothLegsRaised &&
      !legRaiseUpPositionRef.current &&
      legRaiseDownPositionRef.current &&
      !legsInMiddlePosition
    ) {
      legRaiseUpPositionRef.current = true;
      legRaiseDownPositionRef.current = false;
      showFeedback("ยกขาขึ้นแล้ว ค่อยๆ ลงอย่างควบคุม");
    } else if (
      bothLegsDown &&
      legRaiseUpPositionRef.current &&
      !legRaiseDownPositionRef.current &&
      !legsInMiddlePosition
    ) {
      legRaiseDownPositionRef.current = true;
      legRaiseUpPositionRef.current = false;
      handleDoOneRep(currentStepRef.current);
      showFeedback("ดีมาก! ทำครบ 1 ครั้ง");
    }

    if (
      (leftLegRaised && !rightLegRaised) ||
      (!leftLegRaised && rightLegRaised)
    ) {
      if (!legRaiseMomentumWarningRef.current) {
        showFeedback("ยกขาทั้งสองข้างพร้อมกัน");
        legRaiseMomentumWarningRef.current = true;
        setTimeout(() => {
          legRaiseMomentumWarningRef.current = false;
        }, 3000);
      }
    }

    if (bothLegsRaised && !legRaiseMomentumWarningRef.current) {
      showFeedback("เกร็งกล้ามเนื้อหน้าท้อง ควบคุมการเคลื่อนไหว");
      legRaiseMomentumWarningRef.current = true;
      setTimeout(() => {
        legRaiseMomentumWarningRef.current = false;
      }, 5000);
    }

    if (legsInMiddlePosition && legRaiseUpPositionRef.current) {
      if (!legRaiseMomentumWarningRef.current) {
        showFeedback("ลงขาให้ใกล้พื้นมากขึ้น ไม่ใช่แค่ขนานพื้น");
        legRaiseMomentumWarningRef.current = true;
        setTimeout(() => {
          legRaiseMomentumWarningRef.current = false;
        }, 3000);
      }
    }
  };

  const plankFaultTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    plankTimeRef.current = plankTime; // อัปเดต ref ทุกครั้งที่ plankTime เปลี่ยน
  }, [plankTime]);

  // ฟังก์ชันสำหรับการตรวจสอบท่า Plank
  const detectPlank = () => {
    const poses = posesRef.current;
    if (!poses || poses.length === 0) return;

    const p = poses[0];
    const get = (name: string) => p.keypoints.find((k) => k.name === name);

    const pts = [
      "left_shoulder",
      "right_shoulder",
      "left_elbow",
      "right_elbow",
      "left_hip",
      "right_hip",
      "left_knee",
      "right_knee",
      "left_ankle",
      "right_ankle",
    ].map(get);

    if (pts.some((p) => !p || (p.score !== undefined && p.score < 0.2))) return;
    const [ls, rs, le, re, lh, rh, lk, rk, la, ra] = pts as any[];

    const calcAngle = (A: any, B: any) =>
      Math.atan2(A.y - B.y, A.x - B.x) * (180 / Math.PI);

    const torsoL = calcAngle(ls, lh);
    const torsoR = calcAngle(rs, rh);
    const legL = calcAngle(lh, lk);
    const legR = calcAngle(rh, rk);

    const upperArmAngleL = calcAngle(ls, le);
    const upperArmAngleR = calcAngle(rs, re);

    const isTorsoStraight =
      Math.abs(torsoL) > 170 ||
      Math.abs(torsoL) < 10 ||
      Math.abs(torsoR) > 170 ||
      Math.abs(torsoR) < 10;

    const isLegStraight =
      Math.abs(legL) > 150 ||
      Math.abs(legL) < 20 ||
      Math.abs(legR) > 150 ||
      Math.abs(legR) < 20;

    const midX = (ls.x + rs.x) / 2;
    const midY = (ls.y + rs.y) / 2;
    const hipX = (lh.x + rh.x) / 2;
    const hipY = (lh.y + rh.y) / 2;
    backAngleRef.current = calcAngle(
      { x: midX, y: midY },
      { x: hipX, y: hipY }
    );

    // --- ส่วนที่ปรับปรุงใหม่ ---

    // ฟังก์ชันสำหรับจัดการเมื่อท่าทางผิด (ใช้ซ้ำได้)
    const handlePlankFault = (reason: string) => {
      if (plankStartedRef.current && !plankFaultTimerRef.current) {
        if (plankTimerRef.current) {
          clearInterval(plankTimerRef.current);
          plankTimerRef.current = null;
        }
        plankProperFormRef.current = false;

        if (!plankWarningGivenRef.current) {
          showFeedback(reason); // แสดงเหตุผลที่ท่าผิด
          plankWarningGivenRef.current = true;
        }

        plankFaultTimerRef.current = setTimeout(() => {
          showFeedback("ท่าไม่ถูกต้องนานเกินไป... เริ่มใหม่");
          plankStartedRef.current = false;
          setPlankTime(0);

          plankFaultTimerRef.current = null;
        }, 10000);
      }
    };

    // เงื่อนไขหลัก: อยู่ในฟอร์ม Plank (ลำตัวและขาตรง)
    if (isTorsoStraight && isLegStraight) {
      const backOk =
        Math.abs(backAngleRef.current) < 20 ||
        Math.abs(backAngleRef.current) > 160;

      const armsAreVertical =
        Math.abs(upperArmAngleL) > 75 &&
        Math.abs(upperArmAngleL) < 105 &&
        Math.abs(upperArmAngleR) > 75 &&
        Math.abs(upperArmAngleR) < 105;

      if (backOk && armsAreVertical) {
        // **ท่าถูกต้อง**
        // 1. ถ้ามี Timer จับเวลาผิดท่าอยู่ ให้ยกเลิกซะ
        if (plankFaultTimerRef.current) {
          clearTimeout(plankFaultTimerRef.current);
          plankFaultTimerRef.current = null;
          showFeedback("กลับสู่ท่าที่ถูกต้อง! นับเวลาต่อ...");
        }
        plankProperFormRef.current = true;
        plankWarningGivenRef.current = false; // รีเซ็ตสถานะการเตือน

        // 2. ถ้ายังไม่ได้เริ่ม Plank ให้เริ่มใหม่ทั้งหมด
        if (!plankStartedRef.current) {
          plankStartedRef.current = true;
          console.log("asdasdasd");
          setPlankTime(0);
          showFeedback("เริ่มท่า Plank: เกร็งท้อง ก้น และขาตลอดเวลา");
        }

        // 3. ถ้า Timer หลักยังไม่ทำงาน (อาจเพราะเพิ่งกลับมาจากท่าผิด) ให้เริ่มนับต่อ
        if (!plankTimerRef.current) {
          plankTimerRef.current = setInterval(() => {
            setPlankTime((prev) => prev + 1);
          }, 1000);
        }

        // --- ส่วนที่แก้ไข ---
        // เช็คเมื่อทำครบเวลาที่กำหนดก่อนเป็นอันดับแรก
        console.log("plankTimeRef.current:", plankTimeRef.current);
        console.log(
          "currentStepRef.current.reps:",
          currentStepRef.current && currentStepRef.current.reps
        );
        if (
          plankStartedRef.current &&
          currentStepRef.current &&
          plankTimeRef.current >= currentStepRef.current.reps // <<-- อ่านจาก ref ที่มีค่าล่าสุด
        ) {
          console.log("first");
          handleDoOneRep(currentStepRef.current);
          return; // <<-- เพิ่ม return ตรงนี้สำคัญมาก! เพื่อออกจากฟังก์ชันทันที
        }
      } else {
        // **ท่าไม่ถูกต้อง (หลังแอ่น/งอ หรือ แขนไม่ตั้งฉาก)**
        let faultReason = "ท่าไม่ถูกต้อง! จัดระเบียบร่างกาย";
        if (!backOk) {
          faultReason = "หลังไม่อยู่ในแนวตรง! อย่าให้สะโพกตกหรือยกสูงไป";
        } else if (!armsAreVertical) {
          faultReason = "จัดตำแหน่งไหล่ให้อยู่เหนือข้อศอก";
        }
        handlePlankFault(faultReason);
      }
    } else {
      // **หลุดจากฟอร์ม Plank โดยสิ้นเชิง**
      handlePlankFault("ลำตัวและขาไม่ตรง");
    }
  };

  const sidePlankFaultTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    sidePlankTimeRef.current = sidePlankTime; // อัปเดต ref ทุกครั้งที่ sidePlankTime เปลี่ยน
  }, [sidePlankTime]);

  // ฟังก์ชันสำหรับการตรวจสอบท่า Side Plank
  const detectSidePlank = () => {
    const poses = posesRef.current;
    const currentStep = currentStepRef.current;
    if (!poses || poses.length === 0 || !currentStep) return;

    // ดึง keypoints ที่จำเป็น
    const p = poses[0].keypoints;
    const getKeypoint = (name: string) => p.find((k) => k.name === name);
    const requiredPoints = [
      "left_shoulder",
      "right_shoulder",
      "left_elbow",
      "right_elbow",
      "left_hip",
      "right_hip",
      "left_knee",
      "right_knee",
      "left_ankle",
      "right_ankle",
    ];

    const points = requiredPoints.map(getKeypoint);
    if (points.some((pt) => !pt || pt.score === undefined || pt.score < 0.2))
      return;

    const [ls, rs, le, re, lh, rh, lk, rk, la, ra] = points;

    // --- คำนวณท่าทาง ---
    if (!ls || !rs || !lh || !rh || !lk || !rk || !la || !ra) return;

    const shoulderDiffX = Math.abs(ls.x - rs.x);
    const shoulderDiffY = Math.abs(ls.y - rs.y);
    const hipDiffX = Math.abs(lh.x - rh.x);
    const hipDiffY = Math.abs(lh.y - rh.y);

    const isVerticalTorso =
      shoulderDiffY > shoulderDiffX * 1.5 && hipDiffY > hipDiffX * 1.5;
    const leftLegAngle = calculateAngle(lh, lk, la);
    const rightLegAngle = calculateAngle(rh, rk, ra);
    const isStraightLegs =
      (leftLegAngle > 160 || leftLegAngle < 20) &&
      (rightLegAngle > 160 || rightLegAngle < 20);

    // ตรวจสอบว่าเป็น Side Plank หรือไม่ และอยู่ด้านไหน
    let detectedSide: "left" | "right" | null = null;
    if (isVerticalTorso && isStraightLegs) {
      // เช็ค Side Plank ซ้าย (ใช้ข้อศอกซ้ายรับน้ำหนัก)
      if (
        le &&
        ls &&
        typeof le.y === "number" &&
        typeof ls.y === "number" &&
        typeof le.x === "number" &&
        typeof ls.x === "number" &&
        le.y > ls.y &&
        Math.abs(le.x - ls.x) < 50
      ) {
        // เพิ่ม tolerance ของ x
        detectedSide = "left";
      }
      // เช็ค Side Plank ขวา (ใช้ข้อศอกขวารับน้ำหนัก)
      else if (
        re &&
        typeof re.y === "number" &&
        typeof rs.y === "number" &&
        typeof re.x === "number" &&
        typeof rs.x === "number" &&
        re.y > rs.y &&
        Math.abs(re.x - rs.x) < 50
      ) {
        detectedSide = "right";
      }
    }

    // --- ฟังก์ชันจัดการเมื่อท่าผิด ---
    const handleSidePlankFault = (
      message: string = "ท่าไม่ถูกต้อง! จัดระเบียบร่างกาย"
    ) => {
      if (sidePlankStartedRef.current && !sidePlankFaultTimerRef.current) {
        if (sidePlankTimerRef.current) {
          clearInterval(sidePlankTimerRef.current);
          sidePlankTimerRef.current = null;
        }
        sidePlankProperFormRef.current = false;

        if (!sidePlankWarningGivenRef.current) {
          showFeedback(message);
          sidePlankWarningGivenRef.current = true;
        }

        sidePlankFaultTimerRef.current = setTimeout(() => {
          showFeedback("พักนานเกินไป เริ่มเซ็ตนี้ใหม่");
          sidePlankStartedRef.current = false;
          setSidePlankTime(0);
          sidePlankFaultTimerRef.current = null;
        }, 10000); // 10 วินาที
      }
    };

    // --- ตรวจสอบเงื่อนไขหลัก ---
    const expectedSide = currentStep.exercise.includes("left")
      ? "left"
      : "right";

    if (detectedSide) {
      if (detectedSide === expectedSide) {
        console.log("detectedSide:", detectedSide);
        // **ท่าถูกต้อง และถูกด้าน**
        if (sidePlankFaultTimerRef.current) {
          clearTimeout(sidePlankFaultTimerRef.current);
          sidePlankFaultTimerRef.current = null;
          showFeedback("ดีมาก! กลับมานับเวลาต่อ");
        }
        sidePlankProperFormRef.current = true;
        sidePlankWarningGivenRef.current = false;

        if (!sidePlankStartedRef.current) {
          sidePlankStartedRef.current = true;
          setSidePlankTime(0);
          showFeedback(
            `เริ่ม Side Plank ด้าน${expectedSide === "left" ? "ซ้าย" : "ขวา"}`
          );
        }

        if (!sidePlankTimerRef.current) {
          console.log("first");
          sidePlankTimerRef.current = setInterval(() => {
            setSidePlankTime((prev) => prev + 1);
          }, 1000);
        }

        // เช็คเมื่อทำครบเวลา
        if (sidePlankTimeRef.current >= currentStep.reps) {
          handleDoOneRep(currentStep);
        }
      } else {
        // **ทำถูกท่า แต่ผิดด้าน**
        handleSidePlankFault(
          `ผิดด้าน! กรุณาทำ Side Plank ด้าน${
            expectedSide === "left" ? "ซ้าย" : "ขวา"
          }`
        );
      }
    } else {
      // **หลุดจากฟอร์มโดยสิ้นเชิง**
      // ถ้าเคยเริ่มไปแล้ว ให้ถือว่าท่าผิด
      if (sidePlankStartedRef.current) {
        handleSidePlankFault("หลุดจากท่า! กลับเข้าฟอร์มภายใน 10 วินาที");
      }
    }
  };

  // ฟังก์ชันสำหรับการตรวจจับท่า Dumbbell Bench Press
  const detectDumbbellBenchPress = () => {
    if (!posesRef.current || posesRef.current.length === 0) return;

    const pose = posesRef.current[0];
    const get = (name: string) => pose.keypoints.find((p) => p.name === name);

    const leftWrist = get("left_wrist");
    const rightWrist = get("right_wrist");
    const leftElbow = get("left_elbow");
    const rightElbow = get("right_elbow");
    const leftShoulder = get("left_shoulder");
    const rightShoulder = get("right_shoulder");
    const leftHip = get("left_hip");
    const rightHip = get("right_hip");

    // ตรวจสอบว่า keypoints ทั้งหมดมีค่า confidence ที่เพียงพอ
    if (
      !leftWrist?.score ||
      leftWrist.score < 0.3 ||
      !rightWrist?.score ||
      rightWrist.score < 0.3 ||
      !leftElbow?.score ||
      leftElbow.score < 0.3 ||
      !rightElbow?.score ||
      rightElbow.score < 0.3 ||
      !leftShoulder?.score ||
      leftShoulder.score < 0.3 ||
      !rightShoulder?.score ||
      rightShoulder.score < 0.3 ||
      !leftHip?.score ||
      leftHip.score < 0.3 ||
      !rightHip?.score ||
      rightHip.score < 0.3
    ) {
      return;
    }

    // ตรวจสอบว่าอยู่ในท่านอนหงาย (สะโพกและไหล่อยู่ในระดับเดียวกัน)
    const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
    const hipMidY = (leftHip.y + rightHip.y) / 2;
    const isLyingDown = Math.abs(shoulderMidY - hipMidY) < 50;

    if (!isLyingDown) {
      if (!dumbbellFormWarningRef.current) {
        showFeedback("นอนหงายบนม้านั่ง เท้าแตะพื้น");
        dumbbellFormWarningRef.current = true;
      }
      return;
    } else {
      dumbbellFormWarningRef.current = false;
    }

    // คำนวณมุมแขนซ้ายและขวา (ไหล่-ข้อศอก-ข้อมือ)
    const leftArmAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightArmAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
    const avgArmAngle = (leftArmAngle + rightArmAngle) / 2;
    dumbbellArmAngleRef.current = avgArmAngle;

    // ตรวจสอบตำแหน่งข้อศอก (ควรอยู่ในมุม 45 องศาจากลำตัว)
    const leftElbowPosition = Math.abs(leftElbow.x - leftShoulder.x);
    const rightElbowPosition = Math.abs(rightElbow.x - rightShoulder.x);
    const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
    const properElbowPosition =
      (leftElbowPosition + rightElbowPosition) / 2 > shoulderWidth * 0.3;
    dumbbellElbowPositionRef.current = properElbowPosition;

    // ตรวจสอบท่าดันขึ้น (แขนเหยียดตรง)
    if (
      avgArmAngle > 160 &&
      dumbbellDownPositionRef.current &&
      properElbowPosition
    ) {
      dumbbellUpPositionRef.current = true;
      dumbbellDownPositionRef.current = false;
      handleDoOneRep(currentStepRef.current);
      showFeedback("ดีมาก! ดันขึ้นสำเร็จ");
    }
    // ตรวจสอบท่าลดลง (แขนงอประมาณ 90 องศา)
    else if (
      avgArmAngle < 100 &&
      dumbbellUpPositionRef.current &&
      properElbowPosition
    ) {
      dumbbellDownPositionRef.current = true;
      dumbbellUpPositionRef.current = false;
      showFeedback("ลดลงช้าๆ ควบคุมน้ำหนัก");
    }

    // ตรวจสอบท่าทางที่ไม่ถูกต้อง
    if (!properElbowPosition && !dumbbellFormWarningRef.current) {
      showFeedback("จัดท่าแขนให้ถูกต้อง ข้อศอกทำมุม 45 องศาจากลำตัว");
      dumbbellFormWarningRef.current = true;
      setTimeout(() => {
        dumbbellFormWarningRef.current = false;
      }, 3000);
    }
  };

  // ฟังก์ชันสำหรับการตรวจจับท่า Dumbbell Bent-Over Rows
  const detectDumbbellBentOverRows = () => {
    if (!posesRef.current || posesRef.current.length === 0) return;

    const pose = posesRef.current[0];
    const get = (name: string) => pose.keypoints.find((p) => p.name === name);

    const leftWrist = get("left_wrist");
    const rightWrist = get("right_wrist");
    const leftElbow = get("left_elbow");
    const rightElbow = get("right_elbow");
    const leftShoulder = get("left_shoulder");
    const rightShoulder = get("right_shoulder");
    const leftHip = get("left_hip");
    const rightHip = get("right_hip");
    const leftKnee = get("left_knee");
    const rightKnee = get("right_knee");

    if (
      !leftWrist?.score ||
      leftWrist.score < 0.3 ||
      !rightWrist?.score ||
      rightWrist.score < 0.3 ||
      !leftElbow?.score ||
      leftElbow.score < 0.3 ||
      !rightElbow?.score ||
      rightElbow.score < 0.3 ||
      !leftShoulder?.score ||
      leftShoulder.score < 0.3 ||
      !rightShoulder?.score ||
      rightShoulder.score < 0.3 ||
      !leftHip?.score ||
      leftHip.score < 0.3 ||
      !rightHip?.score ||
      rightHip.score < 0.3 ||
      !leftKnee?.score ||
      leftKnee.score < 0.3 ||
      !rightKnee?.score ||
      rightKnee.score < 0.3
    ) {
      return;
    }

    // คำนวณมุมลำตัว
    const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
    const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
    const hipMidX = (leftHip.x + rightHip.x) / 2;
    const hipMidY = (leftHip.y + rightHip.y) / 2;

    const torsoAngle =
      Math.atan2(shoulderMidY - hipMidY, shoulderMidX - hipMidX) *
      (180 / Math.PI);
    bentOverRowBackAngleRef.current = Math.abs(torsoAngle);

    const isProperBentPosition =
      bentOverRowBackAngleRef.current > 30 &&
      bentOverRowBackAngleRef.current < 85;
    bentOverRowProperBentRef.current = isProperBentPosition;

    if (!isProperBentPosition) {
      if (!bentOverRowFormWarningRef.current) {
        showFeedback("โน้มตัวไปข้างหน้าประมาณ 45-60 องศา เกร็งหลัง");
        bentOverRowFormWarningRef.current = true;
      }
      return;
    } else {
      bentOverRowFormWarningRef.current = false;
    }

    // มุมแขน
    const leftArmAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightArmAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
    const avgArmAngle = (leftArmAngle + rightArmAngle) / 2;
    bentOverRowArmAngleRef.current = avgArmAngle;

    const leftElbowToTorso = Math.abs(leftElbow.x - shoulderMidX);
    const rightElbowToTorso = Math.abs(rightElbow.x - shoulderMidX);
    const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
    const properElbowPosition =
      (leftElbowToTorso + rightElbowToTorso) / 2 < shoulderWidth * 0.8;

    // ดึงขึ้น
    if (
      avgArmAngle < 120 &&
      bentOverRowDownPositionRef.current &&
      properElbowPosition
    ) {
      bentOverRowUpPositionRef.current = true;
      bentOverRowDownPositionRef.current = false;
      handleDoOneRep(currentStepRef.current);
      showFeedback("ดีมาก! หนีบรักแร้ เกร็งหลัง");
    }
    // ลดลง
    else if (
      avgArmAngle > 150 &&
      bentOverRowUpPositionRef.current &&
      properElbowPosition
    ) {
      bentOverRowDownPositionRef.current = true;
      bentOverRowUpPositionRef.current = false;
      showFeedback("ลดลงช้าๆ ควบคุมน้ำหนัก");
    }

    // ฟอร์มไม่ถูก
    if (!properElbowPosition && !bentOverRowFormWarningRef.current) {
      showFeedback("ไม่กางศอกออกด้านข้างมากเกินไป หนีบรักแร้");
      bentOverRowFormWarningRef.current = true;
      setTimeout(() => {
        bentOverRowFormWarningRef.current = false;
      }, 3000);
    }

    if (
      bentOverRowBackAngleRef.current < 20 &&
      !bentOverRowFormWarningRef.current
    ) {
      showFeedback("ระวังปวดหลังส่วนล่าง ไม่แอ่นหลังมากจนเกินไป");
      bentOverRowFormWarningRef.current = true;
      setTimeout(() => {
        bentOverRowFormWarningRef.current = false;
      }, 3000);
    }
  };

  // ฟังก์ชันสำหรับการตรวจจับท่า Dumbbell Shoulder Press (ปรับปรุงแล้ว)
  const detectDumbbellShoulderPress = () => {
    if (!posesRef.current || posesRef.current.length === 0) return;

    const pose = posesRef.current[0];
    const get = (name: string) => pose.keypoints.find((p) => p.name === name);

    const leftWrist = get("left_wrist");
    const rightWrist = get("right_wrist");
    const leftElbow = get("left_elbow");
    const rightElbow = get("right_elbow");
    const leftShoulder = get("left_shoulder");
    const rightShoulder = get("right_shoulder");
    const leftHip = get("left_hip");
    const rightHip = get("right_hip");
    const nose = get("nose");

    // ลดเงื่อนไข confidence score และไม่ต้องการ hip สำหรับท่ายืน
    if (
      !leftWrist?.score ||
      leftWrist.score < 0.2 ||
      !rightWrist?.score ||
      rightWrist.score < 0.2 ||
      !leftElbow?.score ||
      leftElbow.score < 0.2 ||
      !rightElbow?.score ||
      rightElbow.score < 0.2 ||
      !leftShoulder?.score ||
      leftShoulder.score < 0.2 ||
      !rightShoulder?.score ||
      rightShoulder.score < 0.2
    ) {
      return;
    }

    // การตรวจสอบท่าทางพื้นฐาน (ทำได้ทั้งยืนและนั่ง)
    const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
    const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;

    // ไม่ต้องตรวจสอบท่านั่งเข้มงวด - ให้ทำได้ทั้งยืนและนั่ง
    shoulderPressProperPostureRef.current = true;

    // คำนวณมุมแขนซ้ายและขวา
    const leftArmAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightArmAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
    const avgArmAngle = (leftArmAngle + rightArmAngle) / 2;
    shoulderPressArmAngleRef.current = avgArmAngle;

    // ปรับปรุงการตรวจสอบตำแหน่งข้อศอก (หลวมขึ้น)
    const leftElbowAlignment = leftElbow.y > leftWrist.y - 20; // เพิ่ม tolerance
    const rightElbowAlignment = rightElbow.y > rightWrist.y - 20; // เพิ่ม tolerance
    const properElbowAlignment = leftElbowAlignment && rightElbowAlignment;
    shoulderPressElbowAlignmentRef.current = properElbowAlignment;

    // ปรับปรุงการตรวจสอบท่าดันขึ้น (ง่ายขึ้น)
    const isUpPosition =
      avgArmAngle > 150 && // ลดจาก 160
      leftWrist.y < leftShoulder.y - 30 &&
      rightWrist.y < rightShoulder.y - 30; // ข้อมือสูงกว่าไหล่

    const isDownPosition =
      avgArmAngle < 110 && // เพิ่มจาก 100
      leftWrist.y > leftShoulder.y - 10 &&
      rightWrist.y > rightShoulder.y - 10; // ข้อมือใกล้ระดับไหล่

    // ตรวจจับท่าดันขึ้น
    if (isUpPosition && shoulderPressDownPositionRef.current) {
      shoulderPressUpPositionRef.current = true;
      shoulderPressDownPositionRef.current = false;
      handleDoOneRep(currentStepRef.current);
      showFeedback("ดีมาก! ดันขึ้นสำเร็จ 💪");
    }
    // ตรวจจับท่าลดลง
    else if (isDownPosition && shoulderPressUpPositionRef.current) {
      shoulderPressDownPositionRef.current = true;
      shoulderPressUpPositionRef.current = false;
      showFeedback("ลดลงช้าๆ ดีมาก! 👍");
    }
    // เพิ่มการเริ่มต้นท่าที่ชัดเจนสำหรับท่ายืน
    else if (
      isDownPosition &&
      !shoulderPressDownPositionRef.current &&
      !shoulderPressUpPositionRef.current
    ) {
      shoulderPressDownPositionRef.current = true;
      showFeedback("เตรียมพร้อม! ยืนตัวตรง ดันขึ้นเหนือศีรษะ 🏋️‍♂️");
    }

    // คำแนะนำท่าทาง
    if (!properElbowAlignment && !shoulderPressFormWarningRef.current) {
      showFeedback("⚠️ ข้อศอกควรอยู่ใต้ข้อมือ");
      shoulderPressFormWarningRef.current = true;
      setTimeout(() => {
        shoulderPressFormWarningRef.current = false;
      }, 2000); // ลดเวลาเตือน
    }
  };

  // ฟังก์ชันสำหรับการตรวจจับท่า Dumbbell Bicep Curls
  const detectDumbbellBicepCurls = () => {
    if (!posesRef.current || posesRef.current.length === 0) return;

    const pose = posesRef.current[0];
    const get = (name: string) => pose.keypoints.find((p) => p.name === name);

    const leftWrist = get("left_wrist");
    const rightWrist = get("right_wrist");
    const leftElbow = get("left_elbow");
    const rightElbow = get("right_elbow");
    const leftShoulder = get("left_shoulder");
    const rightShoulder = get("right_shoulder");
    const leftHip = get("left_hip");
    const rightHip = get("right_hip");
    const leftKnee = get("left_knee");
    const rightKnee = get("right_knee");

    // ตรวจสอบว่า keypoints ทั้งหมดมีค่า confidence ที่เพียงพอ
    if (
      !leftWrist?.score ||
      leftWrist.score < 0.3 ||
      !rightWrist?.score ||
      rightWrist.score < 0.3 ||
      !leftElbow?.score ||
      leftElbow.score < 0.3 ||
      !rightElbow?.score ||
      rightElbow.score < 0.3 ||
      !leftShoulder?.score ||
      leftShoulder.score < 0.3 ||
      !rightShoulder?.score ||
      rightShoulder.score < 0.3 ||
      !leftHip?.score ||
      leftHip.score < 0.3 ||
      !rightHip?.score ||
      rightHip.score < 0.3 ||
      !leftKnee?.score ||
      leftKnee.score < 0.3 ||
      !rightKnee?.score ||
      rightKnee.score < 0.3
    ) {
      return;
    }

    // ความต่างระหว่าง hip กับ knee ในแนว Y (ถ้ายืนจะต่างกันเยอะ)
    const leftHipAboveKnee = leftKnee.y - leftHip.y > 40;
    const rightHipAboveKnee = rightKnee.y - rightHip.y > 40;

    // เข่าต้องต่ำกว่าไหล่เยอะ (เพื่อตัดกรณีนั่งที่เข่าบางครั้งสูง)
    const leftKneeBelowShoulder = leftKnee.y - leftShoulder.y > 40;
    const rightKneeBelowShoulder = rightKnee.y - rightShoulder.y > 40;

    // รวมเงื่อนไข standing
    const isStanding =
      leftHipAboveKnee &&
      rightHipAboveKnee &&
      leftKneeBelowShoulder &&
      rightKneeBelowShoulder;

    if (!isStanding) {
      showFeedback("โปรดทำท่านี้ในขณะยืน");
      return;
    }

    // คำนวณมุมแขนซ้ายและขวา (ไหล่-ข้อศอก-ข้อมือ)
    const leftArmAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightArmAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
    const avgArmAngle = (leftArmAngle + rightArmAngle) / 2;
    bicepCurlArmAngleRef.current = avgArmAngle;

    // ตรวจสอบตำแหน่งข้อศอกที่ถูกต้อง (ควรอยู่ชิดข้างลำตัว)
    const leftElbowToShoulder = Math.abs(leftElbow.x - leftShoulder.x);
    const rightElbowToShoulder = Math.abs(rightElbow.x - rightShoulder.x);
    const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
    const properElbowPosition =
      (leftElbowToShoulder + rightElbowToShoulder) / 2 < shoulderWidth * 0.3;
    bicepCurlElbowStabilityRef.current = properElbowPosition;

    // ตรวจสอบตำแหน่งข้อมือ (ไม่งอข้อมือ)
    const leftWristAlignment = Math.abs(leftWrist.y - leftElbow.y) > 20;
    const rightWristAlignment = Math.abs(rightWrist.y - rightElbow.y) > 20;
    const properWristPosition = leftWristAlignment && rightWristAlignment;
    bicepCurlWristPositionRef.current = properWristPosition;

    // ตรวจสอบท่าขึ้น (แขนงอ ข้อศอกชิดลำตัว)
    if (
      avgArmAngle < 60 &&
      bicepCurlDownPositionRef.current &&
      properElbowPosition &&
      properWristPosition
    ) {
      bicepCurlUpPositionRef.current = true;
      bicepCurlDownPositionRef.current = false;
      handleDoOneRep(currentStepRef.current);
      showFeedback("ดีมาก! เก็บศอกชิดลำตัว");
    }
    // ตรวจสอบท่าลง (แขนเหยียดลง)
    else if (
      avgArmAngle > 150 &&
      bicepCurlUpPositionRef.current &&
      properElbowPosition &&
      properWristPosition
    ) {
      bicepCurlDownPositionRef.current = true;
      bicepCurlUpPositionRef.current = false;
      showFeedback("ลดลงช้าๆ ควบคุมน้ำหนัก");
    }

    // ตรวจสอบท่าทางที่ไม่ถูกต้อง - ข้อศอกไม่ชิดลำตัว
    if (!properElbowPosition && !bicepCurlFormWarningRef.current) {
      showFeedback("เก็บศอกให้ชิดข้างลำตัว ไม่แกว่งเวลาออกแรง");
      bicepCurlFormWarningRef.current = true;
      setTimeout(() => {
        bicepCurlFormWarningRef.current = false;
      }, 3000);
    }

    // ตรวจสอบท่าทางที่ไม่ถูกต้อง - งอข้อมือ
    if (!properWristPosition && !bicepCurlFormWarningRef.current) {
      showFeedback("ไม่งอข้อมือ เพื่อโฟกัสที่กล้ามเนื้อต้นแขน");
      bicepCurlFormWarningRef.current = true;
      setTimeout(() => {
        bicepCurlFormWarningRef.current = false;
      }, 3000);
    }
  };

  const tricepExtensionMaxAngleRef = useRef<number>(0);

  // ฟังก์ชันสำหรับการตรวจจับท่า Dumbbell Overhead Tricep Extension
  const detectDumbbellOverheadTricepExtension = () => {
    if (!posesRef.current?.length) return;
    const pose = posesRef.current[0];
    const get = (n: string) => pose.keypoints.find((k) => k.name === n);

    const Ls = get("left_shoulder"),
      Rs = get("right_shoulder");
    const Le = get("left_elbow"),
      Re = get("right_elbow");
    const Lw = get("left_wrist"),
      Rw = get("right_wrist");
    const nose = get("nose");

    if (
      ![Ls, Rs, Le, Re, Lw, Rw, nose].every(
        (kp) => kp?.score != null && kp.score >= 0.3
      )
    )
      return;

    if (!Ls || !Rs || !Le || !Re || !Lw || !Rw || !nose) return;

    // คำนวณมุมแขน (Shoulder-Elbow-Wrist)
    const angleL = calculateAngle(Ls, Le, Lw);
    const angleR = calculateAngle(Rs, Re, Rw);
    const avgAngle = (angleL + angleR) / 2;
    tricepExtensionArmAngleRef.current = avgAngle;

    const shoulderWidth = Math.abs(Ls.x - Rs.x);

    // ✅ เช็คว่าศอกอยู่เหนือไหล่ (ท่าเริ่มต้น)
    const elbowsAboveShoulders = Le.y < Ls.y - 10 && Re.y < Rs.y - 10;

    // ✅ เช็คว่าศอกอยู่ใกล้หู ไม่กางออกข้าง
    const LeXdiff = Math.abs(Le.x - nose.x);
    const ReXdiff = Math.abs(Re.x - nose.x);
    const elbowsNearHead =
      LeXdiff < shoulderWidth * 1.2 && ReXdiff < shoulderWidth * 1.2;

    // ✅ เช็คว่าข้อมืออยู่เหนือศีรษะในท่าเหยียด
    const wristsAboveHead = Lw.y < nose.y - 30 && Rw.y < nose.y - 30;

    // ✅ เช็คว่าข้อมืออยู่ใกล้แนวกลางของร่างกาย (ไม่กางออกข้าง)
    const centerX = (Ls.x + Rs.x) / 2;
    const LwCenterDiff = Math.abs(Lw.x - centerX);
    const RwCenterDiff = Math.abs(Rw.x - centerX);
    const wristsNearCenter =
      LwCenterDiff < shoulderWidth * 0.4 && RwCenterDiff < shoulderWidth * 0.4;

    // ✅ เช็คว่าข้อมืออยู่ข้างหลังศีรษะในท่างอ (ลงต่ำกว่าศอก)
    const wristsBehindHead = Lw.y > Le.y + 20 && Rw.y > Re.y + 20;

    // กำหนดสถานะท่า
    const isDownPosition =
      avgAngle < 90 &&
      elbowsAboveShoulders &&
      elbowsNearHead &&
      wristsBehindHead;
    const isUpPosition =
      avgAngle > 160 &&
      elbowsAboveShoulders &&
      elbowsNearHead &&
      wristsAboveHead &&
      wristsNearCenter;

    const minAngleChange = 70; // เพิ่มช่วงมุมที่ต้องเปลี่ยนแปลง

    // ตรวจจับการเคลื่อนไหว Down → Up
    if (isDownPosition && tricepExtensionUpPositionRef.current) {
      tricepExtensionDownPositionRef.current = true;
      tricepExtensionUpPositionRef.current = false;
      tricepExtensionMaxAngleRef.current = Math.max(
        tricepExtensionMaxAngleRef.current || 0,
        avgAngle
      );
      showFeedback("งอแขนลงข้างหลังศีรษะ");
    } else if (isUpPosition && tricepExtensionDownPositionRef.current) {
      const delta = Math.abs(
        avgAngle - (tricepExtensionMaxAngleRef.current || 0)
      );
      if (delta >= minAngleChange) {
        tricepExtensionUpPositionRef.current = true;
        tricepExtensionDownPositionRef.current = false;
        tricepExtensionMaxAngleRef.current = 0;
        setReps((r) => r + 1);
        showFeedback("✅ เหยียดแขนตรงเหนือศีรษะสมบูรณ์");
      } else {
        showFeedback("เหยียดแขนไม่เต็มที่ ลองเหยียดให้ตรงขึ้นอีก");
      }
    }

    // 💡 แจ้งเตือนท่าผิด
    // if (
    //   elbowsAboveShoulders &&
    //   !elbowsNearHead &&
    //   !tricepExtensionFormWarningRef.current
    // ) {
    //   tricepExtensionFormWarningRef.current = true;
    //   showFeedback("⚠️ ศอกควรอยู่ใกล้หู ไม่กางออกข้าง");
    //   setTimeout(() => (tricepExtensionFormWarningRef.current = false), 3000);
    // }

    // if (
    //   isUpPosition &&
    //   !wristsNearCenter &&
    //   !tricepExtensionFormWarningRef.current
    // ) {
    //   tricepExtensionFormWarningRef.current = true;
    //   showFeedback("⚠️ เหยียดแขนให้ตรงเหนือศีรษะ อย่าให้กางออกข้าง");
    //   setTimeout(() => (tricepExtensionFormWarningRef.current = false), 3000);
    // }

    // if (!elbowsAboveShoulders && !tricepExtensionFormWarningRef.current) {
    //   tricepExtensionFormWarningRef.current = true;
    //   showFeedback("⚠️ ยกศอกให้สูงเหนือไหล่");
    //   setTimeout(() => (tricepExtensionFormWarningRef.current = false), 3000);
    // }
  };

  // ฟังก์ชันสำหรับการตรวจจับท่า Dumbbell Side Lateral Raises
  const detectDumbbellSideLateralRaises = () => {
    if (!posesRef.current || posesRef.current.length === 0) return;

    const pose = posesRef.current[0];
    const get = (name: string) => pose.keypoints.find((p) => p.name === name);

    const leftWrist = get("left_wrist");
    const rightWrist = get("right_wrist");
    const leftElbow = get("left_elbow");
    const rightElbow = get("right_elbow");
    const leftShoulder = get("left_shoulder");
    const rightShoulder = get("right_shoulder");
    const leftHip = get("left_hip");
    const rightHip = get("right_hip");

    // ตรวจสอบว่า keypoints ทั้งหมดมีค่า confidence ที่เพียงพอ
    if (
      !leftWrist?.score ||
      leftWrist.score < 0.3 ||
      !rightWrist?.score ||
      rightWrist.score < 0.3 ||
      !leftElbow?.score ||
      leftElbow.score < 0.3 ||
      !rightElbow?.score ||
      rightElbow.score < 0.3 ||
      !leftShoulder?.score ||
      leftShoulder.score < 0.3 ||
      !rightShoulder?.score ||
      rightShoulder.score < 0.3 ||
      !leftHip?.score ||
      leftHip.score < 0.3 ||
      !rightHip?.score ||
      rightHip.score < 0.3
    ) {
      return;
    }

    // คำนวณมุมแขนซ้ายและขวา (ไหล่-ข้อศอก-ข้อมือ)
    const leftArmAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightArmAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
    const avgArmAngle = (leftArmAngle + rightArmAngle) / 2;
    lateralRaiseArmAngleRef.current = avgArmAngle;

    // ตรวจสอบว่าแขนยกขึ้นระดับไหล่ (ข้อมือควรอยู่ระดับไหล่หรือสูงกว่า)
    const shoulderHeight = (leftShoulder.y + rightShoulder.y) / 2;
    const wristHeight = (leftWrist.y + rightWrist.y) / 2;
    const armsAtShoulderHeight = wristHeight <= shoulderHeight + 20; // อนุญาตให้สูงกว่าไหล่เล็กน้อย
    lateralRaiseShoulderHeightRef.current = armsAtShoulderHeight;

    // ตรวจสอบว่าข้อศอกงอเล็กน้อย (ไม่ตรงสนิท)
    const elbowsBent = avgArmAngle > 160 && avgArmAngle < 180;
    lateralRaiseElbowBentRef.current = elbowsBent;

    // ตรวจสอบว่าอยู่ในท่ายกแขนขึ้น
    if (
      armsAtShoulderHeight &&
      elbowsBent &&
      lateralRaiseDownPositionRef.current
    ) {
      lateralRaiseUpPositionRef.current = true;
      lateralRaiseDownPositionRef.current = false;
      showFeedback("ยกแขนขึ้นระดับไหล่แล้ว ค้างไว้สักครู่");
    }
    // ตรวจสอบว่าลดแขนลงแล้ว
    else if (
      !armsAtShoulderHeight &&
      wristHeight > shoulderHeight + 50 &&
      lateralRaiseUpPositionRef.current
    ) {
      lateralRaiseDownPositionRef.current = true;
      lateralRaiseUpPositionRef.current = false;
      handleDoOneRep(currentStepRef.current);
      showFeedback("ดีมาก! ทำครบ 1 ครั้ง");
    }

    // ตรวจสอบท่าทางที่ไม่ถูกต้อง - ยกแขนสูงเกินไป
    if (
      wristHeight < shoulderHeight - 30 &&
      !lateralRaiseFormWarningRef.current
    ) {
      showFeedback("อย่ายกแขนสูงเกินไป ยกแค่ระดับไหล่");
      lateralRaiseFormWarningRef.current = true;
      setTimeout(() => {
        lateralRaiseFormWarningRef.current = false;
      }, 3000);
    }

    // ตรวจสอบท่าทางที่ไม่ถูกต้อง - ข้อศอกตรงเกินไป
    if (avgArmAngle > 175 && !lateralRaiseFormWarningRef.current) {
      showFeedback("งอข้อศอกเล็กน้อย อย่าเหยียดแขนตรงสนิท");
      lateralRaiseFormWarningRef.current = true;
      setTimeout(() => {
        lateralRaiseFormWarningRef.current = false;
      }, 3000);
    }

    // ตรวจสอบท่าทางที่ไม่ถูกต้อง - ข้อศอกงอมากเกินไป
    if (avgArmAngle < 140 && !lateralRaiseFormWarningRef.current) {
      showFeedback("อย่างอข้อศอกมากเกินไป ให้แขนเกือบตรง");
      lateralRaiseFormWarningRef.current = true;
      setTimeout(() => {
        lateralRaiseFormWarningRef.current = false;
      }, 3000);
    }

    // ตรวจสอบการเอียงตัว (ไหล่และสะโพกควรอยู่ในแนวเดียวกัน)
    const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
    const hipMidX = (leftHip.x + rightHip.x) / 2;
    const bodyTilted = Math.abs(shoulderMidX - hipMidX) > 40;

    if (bodyTilted && !lateralRaiseFormWarningRef.current) {
      showFeedback("ยืนตรง อย่าเอียงตัวเวลายกแขน");
      lateralRaiseFormWarningRef.current = true;
      setTimeout(() => {
        lateralRaiseFormWarningRef.current = false;
      }, 3000);
    }
  };

  // ฟังก์ชันสำหรับการตรวจจับท่า Dumbbell Goblet Squat
  const detectDumbbellGobletSquat = () => {
    if (!posesRef.current || posesRef.current.length === 0) return;

    const pose = posesRef.current[0];
    const get = (name: string) => pose.keypoints.find((p) => p.name === name);

    const leftWrist = get("left_wrist");
    const rightWrist = get("right_wrist");
    const leftElbow = get("left_elbow");
    const rightElbow = get("right_elbow");
    const leftShoulder = get("left_shoulder");
    const rightShoulder = get("right_shoulder");
    const leftHip = get("left_hip");
    const rightHip = get("right_hip");
    const leftKnee = get("left_knee");
    const rightKnee = get("right_knee");
    const leftAnkle = get("left_ankle");
    const rightAnkle = get("right_ankle");

    // ตรวจสอบว่า keypoints ทั้งหมดมีค่า confidence ที่เพียงพอ
    if (
      !leftWrist?.score ||
      leftWrist.score < 0.3 ||
      !rightWrist?.score ||
      rightWrist.score < 0.3 ||
      !leftElbow?.score ||
      leftElbow.score < 0.3 ||
      !rightElbow?.score ||
      rightElbow.score < 0.3 ||
      !leftShoulder?.score ||
      leftShoulder.score < 0.3 ||
      !rightShoulder?.score ||
      rightShoulder.score < 0.3 ||
      !leftHip?.score ||
      leftHip.score < 0.3 ||
      !rightHip?.score ||
      rightHip.score < 0.3 ||
      !leftKnee?.score ||
      leftKnee.score < 0.3 ||
      !rightKnee?.score ||
      rightKnee.score < 0.3 ||
      !leftAnkle?.score ||
      leftAnkle.score < 0.3 ||
      !rightAnkle?.score ||
      rightAnkle.score < 0.3
    ) {
      return;
    }

    // คำนวณมุมเข่าซ้ายและขวา
    const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
    const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;
    gobletSquatKneeAngleRef.current = avgKneeAngle;

    // ตรวจสอบตำแหน่งดัมเบล (ข้อมือควรอยู่ระดับอกหรือสูงกว่า)
    const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
    const wristMidY = (leftWrist.y + rightWrist.y) / 2;
    const dumbbellAtChest = wristMidY <= shoulderMidY + 30; // อนุญาตให้ต่ำกว่าไหล่เล็กน้อย
    gobletSquatDumbbellPositionRef.current = dumbbellAtChest;

    // ตรวจสอบท่าทางหลังตรง (ไหล่และสะโพกควรอยู่ในแนวเดียวกัน)
    const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
    const hipMidX = (leftHip.x + rightHip.x) / 2;
    const backStraight = Math.abs(shoulderMidX - hipMidX) < 30;
    gobletSquatBackPostureRef.current = backStraight;

    // ตรวจสอบว่าอยู่ในท่า Goblet Squat ลง (ย่อตัว)
    if (
      avgKneeAngle < 120 &&
      gobletSquatUpPositionRef.current &&
      dumbbellAtChest &&
      backStraight
    ) {
      gobletSquatDownPositionRef.current = true;
      gobletSquatUpPositionRef.current = false;
      showFeedback("ย่อตัวลงแล้ว ดันสะโพกไปด้านหลังพร้อมงอเข่า");
    }
    // ตรวจสอบว่ากลับมายืนตรง
    else if (
      avgKneeAngle > 160 &&
      gobletSquatDownPositionRef.current &&
      dumbbellAtChest &&
      backStraight
    ) {
      gobletSquatUpPositionRef.current = true;
      gobletSquatDownPositionRef.current = false;
      handleDoOneRep(currentStepRef.current);
      showFeedback("ดีมาก! ทำครบ 1 ครั้ง");
    }

    // ตรวจสอบท่าทางที่ไม่ถูกต้อง - ตำแหน่งดัมเบล
    if (!dumbbellAtChest && !gobletSquatFormWarningRef.current) {
      showFeedback("ถือดัมเบลไว้ที่อก ใกล้ลำตัว");
      gobletSquatFormWarningRef.current = true;
      setTimeout(() => {
        gobletSquatFormWarningRef.current = false;
      }, 3000);
    }

    // ตรวจสอบท่าทางที่ไม่ถูกต้อง - ท่าทางหลัง
    if (!backStraight && !gobletSquatFormWarningRef.current) {
      showFeedback("รักษาหลังให้ตรง อย่าโค้งหลังมากเกินไป");
      gobletSquatFormWarningRef.current = true;
      setTimeout(() => {
        gobletSquatFormWarningRef.current = false;
      }, 3000);
    }

    // ตรวจสอบว่าเข่าไม่เลยปลายเท้ามากเกินไป
    if (gobletSquatDownPositionRef.current) {
      const leftKneeOverToe = leftKnee.x > leftAnkle.x + 50;
      const rightKneeOverToe = rightKnee.x > rightAnkle.x + 50;

      if (
        (leftKneeOverToe || rightKneeOverToe) &&
        !gobletSquatFormWarningRef.current
      ) {
        showFeedback("ระวัง! เข่าไม่เลยปลายเท้ามากจนเกินไป");
        gobletSquatFormWarningRef.current = true;
        setTimeout(() => {
          gobletSquatFormWarningRef.current = false;
        }, 3000);
      }
    }
  };

  const SmoothFactor = 0.7;

  const smoothAngle = (prev: number, current: number, factor = SmoothFactor) =>
    prev * factor + current * (1 - factor);

  // ฟังก์ชันสำหรับการตรวจจับท่า Dumbbell Romanian Deadlifts
  const detectDumbbellRomanianDeadlifts = () => {
    if (!posesRef.current || posesRef.current.length === 0) return;

    const pose = posesRef.current[0];
    const get = (name: string) => pose.keypoints.find((p) => p.name === name);

    const leftWrist = get("left_wrist");
    const rightWrist = get("right_wrist");
    const leftShoulder = get("left_shoulder");
    const rightShoulder = get("right_shoulder");
    const leftHip = get("left_hip");
    const rightHip = get("right_hip");
    const leftKnee = get("left_knee");
    const rightKnee = get("right_knee");
    const leftAnkle = get("left_ankle");
    const rightAnkle = get("right_ankle");

    if (
      !leftWrist ||
      !rightWrist ||
      !leftShoulder ||
      !rightShoulder ||
      !leftHip ||
      !rightHip ||
      !leftKnee ||
      !rightKnee ||
      !leftAnkle ||
      !rightAnkle
    )
      return;

    // ลดเกณฑ์ score ลงเหลือ 0.2
    const minScore = 0.2;
    const keypoints = [
      leftWrist,
      rightWrist,
      leftShoulder,
      rightShoulder,
      leftHip,
      rightHip,
      leftKnee,
      rightKnee,
      leftAnkle,
      rightAnkle,
    ];
    if (keypoints.some((p) => p.score! < minScore)) return;

    // คำนวณศูนย์กลางไหล่-สะโพก-เข่า และมุมสะโพก
    const shoulderMid = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
    };
    const hipMid = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
    };
    const kneeMid = {
      x: (leftKnee.x + rightKnee.x) / 2,
      y: (leftKnee.y + rightKnee.y) / 2,
    };

    const hipAngleRaw = calculateAngle(shoulderMid, hipMid, kneeMid);
    const hipAngle = smoothAngle(
      romanianDeadliftHipAngleRef.current,
      hipAngleRaw
    );
    romanianDeadliftHipAngleRef.current = hipAngle;

    const properHipHinge = hipAngle > 40 && hipAngle < 130;
    romanianDeadliftHipHingeRef.current = properHipHinge;

    // มุมเข่า
    const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
    const avgKneeAngle = smoothAngle(
      (leftKneeAngle + rightKneeAngle) / 2,
      (leftKneeAngle + rightKneeAngle) / 2
    );
    const kneeStability = avgKneeAngle > 150 && avgKneeAngle < 180;
    romanianDeadliftKneeStabilityRef.current = kneeStability;

    // มุมหลัง
    const rawBackAngle = Math.abs(
      Math.atan2(shoulderMid.y - hipMid.y, shoulderMid.x - hipMid.x) *
        (180 / Math.PI)
    );
    const backAngle = smoothAngle(
      romanianDeadliftBackAngleRef.current,
      rawBackAngle
    );
    romanianDeadliftBackAngleRef.current = backAngle;
    // const straightBack = backAngle < 40 || backAngle > 140;

    // ตำแหน่งดัมเบล
    const wristMidX = (leftWrist.x + rightWrist.x) / 2;
    const dumbbellCloseToLegs = Math.abs(wristMidX - kneeMid.x) < 60;

    if (
      properHipHinge &&
      kneeStability &&
      // straightBack &&
      dumbbellCloseToLegs &&
      romanianDeadliftUpPositionRef.current
    ) {
      romanianDeadliftDownPositionRef.current = true;
      romanianDeadliftUpPositionRef.current = false;
      showFeedback("ดันสะโพกไปด้านหลัง รู้สึกยืดที่หลังขา");
    } else if (
      hipAngle > 160 &&
      kneeStability &&
      // straightBack &&
      dumbbellCloseToLegs &&
      romanianDeadliftDownPositionRef.current
    ) {
      romanianDeadliftUpPositionRef.current = true;
      romanianDeadliftDownPositionRef.current = false;
      handleDoOneRep(currentStepRef.current);
      showFeedback("ดีมาก! ดันสะโพกไปข้างหน้า ยืนตรง");
    }

    if (!properHipHinge && !romanianDeadliftFormWarningRef.current) {
      showFeedback("ดันสะโพกไปด้านหลัง ไม่ใช่งอเข่า");
      romanianDeadliftFormWarningRef.current = true;
      setTimeout(() => {
        romanianDeadliftFormWarningRef.current = false;
      }, 3000);
    }
    if (!kneeStability && !romanianDeadliftFormWarningRef.current) {
      showFeedback("เข่างอเล็กน้อยเท่านั้น โฟกัสที่การดันสะโพก");
      romanianDeadliftFormWarningRef.current = true;
      setTimeout(() => {
        romanianDeadliftFormWarningRef.current = false;
      }, 3000);
    }
    // if (!straightBack && !romanianDeadliftFormWarningRef.current) {
    //   showFeedback("รักษาหลังให้ตรง อกผาย ไหล่ถอยหลัง");
    //   romanianDeadliftFormWarningRef.current = true;
    //   setTimeout(() => {
    //     romanianDeadliftFormWarningRef.current = false;
    //   }, 3000);
    // }
    if (!dumbbellCloseToLegs && !romanianDeadliftFormWarningRef.current) {
      showFeedback("เก็บดัมเบลให้ใกล้ขา ลื่นไปตามขา");
      romanianDeadliftFormWarningRef.current = true;
      setTimeout(() => {
        romanianDeadliftFormWarningRef.current = false;
      }, 3000);
    }
  };

  // ฟังก์ชันคำนวณมุมระหว่างจุด 3 จุด
  const calculateAngle = (pointA: any, pointB: any, pointC: any) => {
    if (!pointA || !pointB || !pointC) return 0;

    const angleRadians =
      Math.atan2(pointC.y - pointB.y, pointC.x - pointB.x) -
      Math.atan2(pointA.y - pointB.y, pointA.x - pointB.x);

    let angleDegrees = Math.abs(angleRadians * (180 / Math.PI));
    if (angleDegrees > 180) {
      angleDegrees = 360 - angleDegrees;
    }

    return angleDegrees;
  };

  // ฟังก์ชันสำหรับการอัปเดตมุมข้อศอก
  const updateArmAngle = () => {
    if (!posesRef.current || posesRef.current.length === 0) return;

    const leftWrist = posesRef.current[0].keypoints[9];
    const leftShoulder = posesRef.current[0].keypoints[5];
    const leftElbow = posesRef.current[0].keypoints[7];

    const angle =
      (Math.atan2(leftWrist.y - leftElbow.y, leftWrist.x - leftElbow.x) -
        Math.atan2(
          leftShoulder.y - leftElbow.y,
          leftShoulder.x - leftElbow.x
        )) *
      (180 / Math.PI);

    if (
      leftWrist.score &&
      leftElbow.score &&
      leftShoulder.score &&
      leftWrist.score > 0.2 &&
      leftElbow.score > 0.2 &&
      leftShoulder.score > 0.2
    ) {
      elbowAngleRef.current = angle;
    }
  };

  // ฟังก์ชันสำหรับการอัปเดตมุมหลัง
  const updateBackAngle = () => {
    if (!posesRef.current || posesRef.current.length === 0) return;

    const leftShoulder = posesRef.current[0].keypoints[5];
    const leftHip = posesRef.current[0].keypoints[11];
    const leftKnee = posesRef.current[0].keypoints[13];

    const angle =
      (Math.atan2(leftKnee.y - leftHip.y, leftKnee.x - leftHip.x) -
        Math.atan2(leftShoulder.y - leftHip.y, leftShoulder.x - leftHip.x)) *
      (180 / Math.PI);

    const normalizedAngle = angle % 180;

    if (
      leftKnee.score &&
      leftHip.score &&
      leftShoulder.score &&
      leftKnee.score > 0.2 &&
      leftHip.score > 0.2 &&
      leftShoulder.score > 0.2
    ) {
      backAngleRef.current = normalizedAngle;
    }

    if (backAngleRef.current < 20 || backAngleRef.current > 160) {
      highlightBackRef.current = false;
    } else {
      highlightBackRef.current = true;
      if (backWarningGivenRef.current !== true) {
        showFeedback("รักษาหลังให้ตรง");
        backWarningGivenRef.current = true;
      }
    }
  };

  // ฟังก์ชันสำหรับการตรวจสอบท่าขึ้น
  const inUpPosition = () => {
    if (elbowAngleRef.current > 170 && elbowAngleRef.current < 200) {
      if (downPositionRef.current === true) {
        // แก้ไขเงื่อนความตรงนี้
        if (exerciseTypeRef.current === "push up") {
          handleDoOneRep(currentStepRef.current);
          showFeedback("ดีมาก!");
        }
        // เพิ่มเงื่อนความสำหรับ burpee-expert เพื่อไม่ให้นับเมื่อทำเพียงท่า push up
        else if (exerciseTypeRef.current === "burpee with push up") {
          // ไม่เพิ่มจำนวนครั้งที่นี่ แต่ให้ไปเพิ่มในฟังก์ชัน detectExpertBurpee เมื่อทำครบทุกขั้นตอน
          showFeedback("ท่า Push Up ถูกต้อง");
        }
      }
      upPositionRef.current = true;
      downPositionRef.current = false;
    }
  };

  // ฟังก์ชันสำหรับการตรวจสอบท่าลง
  const inDownPosition = () => {
    if (!posesRef.current || posesRef.current.length === 0) return;

    let elbowAboveNose = false;
    if (
      posesRef.current[0].keypoints[0].y > posesRef.current[0].keypoints[7].y
    ) {
      elbowAboveNose = true;
    }

    if (
      highlightBackRef.current === false &&
      elbowAboveNose &&
      Math.abs(elbowAngleRef.current) > 70 &&
      Math.abs(elbowAngleRef.current) < 100
    ) {
      if (upPositionRef.current === true) {
        showFeedback("ขึ้น");
      }
      downPositionRef.current = true;
      upPositionRef.current = false;
    }
  };

  // ฟังก์ชันสำหรับการวาดภาพ
  const draw = () => {
    if (!canvasRef.current || !videoRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // ตั้งค่าขนาดของ canvas ให้ตรงกับวิดีโอ
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;

    // ล้างพื้นหลัง
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // กลับภาพเพื่อให้เหมือนกระจก
    ctx.save();
    ctx.translate(canvasRef.current.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0);

    // วาดจุดสำคัญและโครงกระดูก
    drawKeypoints(ctx);
    drawSkeleton(ctx);

    ctx.restore();

    // เขียนข้อความ
    ctx.fillStyle = "white";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.font = "30px Arial";

    requestAnimationFrame(draw);
  };

  // ฟังก์ชันสำหรับการเริ่มต้นกล้อง
  const setupCamera = async () => {
    if (!videoRef.current) return;

    try {
      // ปรับการตั้งค่ากล้องให้เหมาะกับมือถือ
      const constraints = {
        video: {
          facingMode: "user",
          width: { ideal: isMobile ? 720 : 1280 },
          height: { ideal: isMobile ? 1280 : 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      videoRef.current.srcObject = stream;

      return new Promise<void>((resolve) => {
        if (!videoRef.current) return;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play();
          }
          resolve();
        };
      });
    } catch (error) {
      console.error("ไม่สามารถเข้าถึงกล้องได้:", error);
      setMessage("ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการใช้งานกล้อง");
    }
  };

  // ตรวจสอบว่าเป็นอุปกรณ์มือถือหรือไม่
  const checkIfMobile = () => {
    const userAgent =
      typeof window !== "undefined" ? window.navigator.userAgent : "";
    const mobileRegex =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    setIsMobile(mobileRegex.test(userAgent));
  };

  // ฟังก์ชันสำหรับการปรับขนาดหน้าจอ
  const handleResize = () => {
    checkIfMobile();
  };

  // ใช้ useEffect สำหรับการเริ่มต้นแอปพลิเคชัน
  useEffect(() => {
    checkIfMobile();
    window.addEventListener("resize", handleResize);

    const init = async () => {
      // เพิ่มการแจ้งเตือนเสียงเมื่อเริ่มต้น
      setTimeout(() => {
        speak("ระบบเสียงพร้อมใช้งาน");
      }, 2000); // รอ 2 วินาทีหลังจากโหลดเสร็จ

      // เริ่มต้น TensorFlow.js
      await tf.ready();

      // ตั้งค่ากล้อง
      await setupCamera();

      // เริ่มต้นตัวตรวจจับท่าทาง
      await initDetector();

      // เริ่มการประมาณท่าทาง
      getPoses();

      // เริ่มการวาดภาพ
      draw();
    };

    init();

    // ทำความสะอาดเมื่อคอมโพเนนต์ถูกทำลาย
    return () => {
      window.removeEventListener("resize", handleResize);

      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }

      // หยุดตัวจับเวลา Plank
      if (plankTimerRef.current) {
        clearInterval(plankTimerRef.current);
      }

      // หยุดตัวจับเวลา Side Plank
      if (sidePlankTimerRef.current) {
        clearInterval(sidePlankTimerRef.current);
      }

      // หยุดการสตรีมกล้อง
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        const tracks = stream.getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    exerciseTypeRef.current = exerciseType;
  }, [exerciseType]);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    const target = b.find((i) => i.name === currentStepRef.current?.exercise);
    if (target?.videoUrl) {
      setVideoUrl(target.videoUrl);
    }
  }, [b]);

  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="relative flex flex-col items-center justify-start p-4 md:p-6 bg-gray-900 text-white w-full min-h-screen font-sans gap-4">
      {/* ==============================================
          ปุ่มสำหรับเปิดวิดีโอสาธิต
          ==============================================
      */}
      <div className="w-full max-w-lg mt-4 flex justify-end">
        {videoUrl ? (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-green-500 transition-transform transform hover:scale-105"
          >
            🎬 ดูวิดีโอสาธิต
          </button>
        ) : (
          <div className="h-[40px]"></div> // จองพื้นที่ให้ layout ไม่กระโดด
        )}
      </div>

      {/* ส่วนวิดีโอและ Canvas */}
      <div className="relative w-full max-w-lg shadow-2xl rounded-xl">
        <video ref={videoRef} className="hidden" autoPlay playsInline muted />
        <canvas
          ref={canvasRef}
          className="w-full h-auto border-2 border-gray-700 rounded-xl"
        />

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-75 rounded-xl text-white">
            <div className="w-12 h-12 border-4 border-t-green-500 border-gray-600 rounded-full animate-spin mb-4"></div>
            <p className="text-xl">กำลังโหลดโมเดล...</p>
          </div>
        )}

        {/* Dashboard Overlay */}
        {currentStep && (
          <div className="absolute top-0 left-0 w-full p-3 bg-gray-900/60 backdrop-blur-sm rounded-t-xl border-b border-gray-700">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-green-400 uppercase">ท่าปัจจุบัน</p>
                <h2 className="text-xl font-bold capitalize tracking-tight">
                  {currentStep.exercise}
                </h2>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div>
                  <p className="text-xs text-gray-400 uppercase">เซ็ต</p>
                  <p className="text-2xl font-bold">{currentStep.setNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase">
                    {currentStep.exercise.toLocaleLowerCase() === "plank" ||
                    currentStep.exercise.toLocaleLowerCase() === "side plank"
                      ? "จำนวนวินาที"
                      : "จำนวนครั้ง"}
                  </p>
                  <p className="text-2xl font-bold">
                    <span className="text-green-400">
                      {currentStep.exercise.toLocaleLowerCase() === "plank"
                        ? plankTime
                        : currentStep.exercise
                            .toLocaleLowerCase()
                            .includes("side plank")
                        ? sidePlankTime
                        : reps}
                    </span>
                    <span className="text-gray-500 mx-1">/</span>
                    <span>{currentStep.reps}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cooldown Overlay */}
      {isResting && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300">
          <p className="text-2xl font-bold uppercase tracking-wider text-green-400 animate-pulse">
            พักสักครู่
          </p>
          <p className="text-8xl font-mono font-bold my-4 text-white">
            {restTime}
          </p>
          <p className="text-xl uppercase tracking-wider text-gray-400">
            วินาที
          </p>
        </div>
      )}

      {/* ==============================================
      Modal สำหรับแสดงวิดีโอ
      ==============================================
   */}
      {isModalOpen && videoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)} // ปิด Modal เมื่อคลิกที่พื้นหลัง
        >
          <div
            className="relative bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl border border-gray-700"
            onClick={(e) => e.stopPropagation()} // ป้องกันการปิดเมื่อคลิกที่ตัววิดีโอ
          >
            {/* ปุ่มปิด Modal */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute -top-4 -right-4 z-10 w-10 h-10 bg-red-600 text-white text-2xl font-bold rounded-full flex items-center justify-center hover:bg-red-700 transition-transform transform hover:scale-110"
              aria-label="Close"
            >
              &times;
            </button>

            {/* วิดีโอ */}
            <div className="p-2">
              <video
                className="w-full h-auto rounded"
                controls
                autoPlay
                muted
                loop
              >
                <source src={videoUrl} type="video/mp4" />
                เบราว์เซอร์ของคุณไม่รองรับวิดีโอ
              </video>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
