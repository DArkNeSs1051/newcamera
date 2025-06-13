"use client";

import { useEffect, useRef, useState } from "react";
import * as poseDetection from "@tensorflow-models/pose-detection";
import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs";

const Home = () => {
  const version = "1.0.5"; // กำหนดเวอร์ชันของแอปพลิเคชัน
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reps, setReps] = useState(0);
  const [exerciseType, setExerciseType] = useState("pushup");
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
  const hipHeightRef = useRef<number>(0);
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
  const backKneeAngleRef = useRef<number>(180);
  const kneeAlignmentWarningRef = useRef<boolean>(false);

  // ตัวแปรสำหรับการตรวจจับท่า Leg Raise
  const legRaiseUpPositionRef = useRef<boolean>(false);
  const legRaiseDownPositionRef = useRef<boolean>(true);
  const legAngleRef = useRef<number>(180);
  const lowerBackWarningRef = useRef<boolean>(false);

  // เพิ่มตัวแปรสำหรับการจับเวลา Plank
  const [plankTime, setPlankTime] = useState(0);
  const plankTimerRef = useRef<NodeJS.Timeout | null>(null);
  const plankStartedRef = useRef<boolean>(false);
  const plankProperFormRef = useRef<boolean>(false);
  const plankWarningGivenRef = useRef<boolean>(false);

  // เพิ่มตัวแปรสำหรับการจับเวลา Side Plank
  const [sidePlankTime, setSidePlankTime] = useState(0);
  const sidePlankTimerRef = useRef<NodeJS.Timeout | null>(null);
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
  const tricepExtensionFormWarningRef = useRef<boolean>(false);
  const tricepExtensionElbowStabilityRef = useRef<boolean>(false);
  const tricepExtensionUpperArmPositionRef = useRef<boolean>(false);

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

  // ฟังก์ชันสำหรับการพูด
  const speak = (text: string) => {
    if (soundEnabled) {
      const msg = new SpeechSynthesisUtterance(text);
      msg.lang = "th-TH"; // ตั้งค่าภาษาเป็นภาษาไทย
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
      if (exerciseTypeRef.current === "pushup") {
        inUpPosition();
        inDownPosition();
      } else if (exerciseTypeRef.current === "burpee-beginner") {
        detectBeginnerBurpee();
        detectJump();
      } else if (exerciseTypeRef.current === "burpee-expert") {
        detectExpertBurpee();
        detectJump();
      } else if (exerciseTypeRef.current === "squat") {
        detectSquat();
      } else if (exerciseTypeRef.current === "lunges") {
        detectLunges();
      } else if (exerciseTypeRef.current === "legraise") {
        detectLegRaise();
      } else if (exerciseTypeRef.current === "russiantwist") {
        detectRussianTwist();
      } else if (exerciseTypeRef.current === "plank") {
        detectPlank();
      } else if (exerciseTypeRef.current === "sideplank") {
        detectSidePlank();
      } else if (exerciseTypeRef.current === "dumbbellbenchpress") {
        detectDumbbellBenchPress();
      } else if (exerciseTypeRef.current === "dumbbellbentoverrows") {
        detectDumbbellBentOverRows();
      } else if (exerciseTypeRef.current === "dumbbellshoulderpress") {
        detectDumbbellShoulderPress();
      } else if (exerciseTypeRef.current === "dumbbellbicepcurls") {
        detectDumbbellBicepCurls();
      } else if (
        exerciseTypeRef.current === "dumbbelloverheadtricepextension"
      ) {
        detectDumbbellOverheadTricepExtension();
      } else if (exerciseTypeRef.current === "dumbbellromaniandeadlifts") {
        detectDumbbellRomanianDeadlifts();
      } else if (exerciseTypeRef.current === "dumbbellgobletsquat") {
        detectDumbbellGobletSquat();
      } else if (exerciseTypeRef.current === "dumbbellsidelateralraises") {
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

  // ฟังก์ชันสำหรับการตรวจจับการกระโดด
  const detectJump = () => {
    if (!posesRef.current || posesRef.current.length === 0) return;

    const leftHip = posesRef.current[0].keypoints[11];
    const rightHip = posesRef.current[0].keypoints[12];
    const leftWrist = posesRef.current[0].keypoints[9];
    const rightWrist = posesRef.current[0].keypoints[10];
    const leftShoulder = posesRef.current[0].keypoints[5];
    const rightShoulder = posesRef.current[0].keypoints[6];

    if (
      leftHip.score &&
      rightHip.score &&
      leftWrist.score &&
      rightWrist.score &&
      leftShoulder.score &&
      rightShoulder.score &&
      leftHip.score > 0.2 &&
      rightHip.score > 0.2 &&
      leftWrist.score > 0.2 &&
      rightWrist.score > 0.2 &&
      leftShoulder.score > 0.2 &&
      rightShoulder.score > 0.2
    ) {
      // คำนวณความสูงเฉลี่ยของสะโพก
      const currentHipHeight = (leftHip.y + rightHip.y) / 2;

      // ตรวจจับว่ากระโดดขึ้น (เมื่อสะโพกสูงขึ้นจากตำแหน่งก่อนหน้า)
      if (prevHipHeightRef.current - currentHipHeight > 30) {
        // กำหนดค่า jumpDetectedRef.current เป็น true เมื่อตรวจพบการกระโดด
        jumpDetectedRef.current = true;

        // ตรวจสอบว่ายกแขนขึ้นเหนือไหล่
        const leftArmUp = leftWrist.y < leftShoulder.y;
        const rightArmUp = rightWrist.y < rightShoulder.y;

        if (leftArmUp && rightArmUp) {
          if (!jumpWithArmsUpRef.current) {
            jumpWithArmsUpRef.current = true;
            showFeedback("กระโดดพร้อมยกแขน! เยี่ยมมาก");
            setReps((prev) => prev + 1);
          }
        }
      } else {
        jumpWithArmsUpRef.current = false;
        // รีเซ็ต jumpDetectedRef.current เป็น false เมื่อไม่ได้กระโดด
        jumpDetectedRef.current = false;
      }

      prevHipHeightRef.current = currentHipHeight;
    }
  };

  // ฟังก์ชันสำหรับการตรวจสอบท่า Squat
  const detectSquatPosition = () => {
    if (kneeAngleRef.current < 120 && !jumpDetectedRef.current) {
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

    inUpPosition();
    inDownPosition();
    updateKneeAngle();
    detectSquatPosition();

    // ตรวจสอบว่าอยู่ในท่า Push Up หรือไม่
    if (downPositionRef.current || upPositionRef.current) {
      pushupPositionRef.current = true;
    } else {
      pushupPositionRef.current = false;
    }

    // Step 0: เริ่มจากยืน
    if (burpeeStep.current === 0 && standingPositionRef.current) {
      if (squatPositionRef.current) {
        burpeeStep.current = 1;
        showFeedback("ย่อตัวลงแล้วเตรียมตั้งท่า Push Up");
      }
    }
    // Step 1: ย่อตัวไปตั้งท่า Push Up
    else if (burpeeStep.current === 1) {
      if (pushupPositionRef.current) {
        burpeeStep.current = 2;
        showFeedback("ทำท่า Push Up แล้วกลับมาอยู่ในท่าย่อตัว");
      } else if (!squatPositionRef.current && !pushupPositionRef.current) {
        showFeedback("ทำท่า Push Up");
      }
    }
    // Step 2: จากท่า Push Up กลับขึ้นมานั่งยอง
    else if (burpeeStep.current === 2) {
      if (squatPositionRef.current && !pushupPositionRef.current) {
        burpeeStep.current = 3;
        showFeedback("กระโดดพร้อมยกแขนขึ้นเหนือศีรษะ");
      } else if (!pushupPositionRef.current && !squatPositionRef.current) {
        showFeedback("กลับมาอยู่ในท่าย่อตัว");
      }
    }
    // Step 3: จากท่าย่อตัว → กระโดด + ยกแขน
    else if (burpeeStep.current === 3) {
      if (jumpDetectedRef.current) {
        if (!jumpWithArmsUpRef.current) {
          showFeedback("กรุณายกแขนขึ้นเหนือศีรษะเมื่อกระโดด");
        } else {
          burpeeStep.current = 0;
          setReps((prev) => prev + 1);
          showFeedback("ดีมาก! ทำครบ 1 ครั้ง");
        }
      }
    }

    // Optional: หากไม่ทำต่อใน 3 วินาทีให้รีเซ็ต step
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }

    resetTimeoutRef.current = setTimeout(() => {
      if (burpeeStep.current !== 0) {
        showFeedback("เริ่มใหม่อีกครั้ง");
        burpeeStep.current = 0;
      }
    }, 3000);
  };

  // ฟังก์ชันสำหรับการตรวจสอบท่า Burpee แบบผู้เชี่ยวชาญ
  const detectExpertBurpee = () => {
    if (!posesRef.current || posesRef.current.length === 0) return;

    inUpPosition();
    inDownPosition();
    updateKneeAngle();
    detectSquatPosition();

    // ตรวจสอบว่าอยู่ในท่า Push Up หรือไม่
    if (downPositionRef.current || upPositionRef.current) {
      pushupPositionRef.current = true;
    } else {
      pushupPositionRef.current = false;
    }

    // Step 0: เริ่มจากยืน
    if (burpeeStep.current === 0 && standingPositionRef.current) {
      if (squatPositionRef.current) {
        burpeeStep.current = 1;
        showFeedback("ลงไปอยู่ในท่า Push Up");
      }
    }
    // Step 1: squat ไป pushup
    else if (burpeeStep.current === 1) {
      if (pushupPositionRef.current) {
        burpeeStep.current = 2;
        showFeedback("ทำท่า Push Up แล้วกลับมาอยู่ในท่าย่อตัว");
      } else if (!squatPositionRef.current && !pushupPositionRef.current) {
        showFeedback("ลงไปอยู่ในท่า Push Up");
      }
    }
    // Step 2: pushup กลับขึ้นมานั่งยอง
    else if (burpeeStep.current === 2) {
      if (squatPositionRef.current && !pushupPositionRef.current) {
        burpeeStep.current = 3;
        showFeedback("กระโดดพร้อมยกแขนขึ้นเหนือศีรษะ");
      } else if (!pushupPositionRef.current && !squatPositionRef.current) {
        showFeedback("กลับมาอยู่ในท่าย่อตัว");
      }
    }
    // Step 3: squat → กระโดด + ยกแขน
    else if (burpeeStep.current === 3) {
      if (jumpDetectedRef.current) {
        if (!jumpWithArmsUpRef.current) {
          showFeedback("กรุณายกแขนขึ้นเหนือศีรษะเมื่อกระโดด");
        } else {
          burpeeStep.current = 4;
          showFeedback("กลับมายืนตรง");
        }
      }
    }
    // Step 4: landing แล้วกลับมายืน = นับครบ 1 ครั้ง
    else if (burpeeStep.current === 4 && standingPositionRef.current) {
      setReps((prev) => prev + 1);
      burpeeStep.current = 0; // reset เพื่อเริ่มรอบใหม่
      showFeedback("ดีมาก! ทำครบ 1 ครั้ง");
    }
    // Optional: หากไม่ทำต่อใน 3 วินาทีให้รีเซ็ต step
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }

    resetTimeoutRef.current = setTimeout(() => {
      if (burpeeStep.current !== 0) {
        showFeedback("เริ่มใหม่อีกครั้ง");
        burpeeStep.current = 0;
      }
    }, 3000);
  };

  // ฟังก์ชันสำหรับการตรวจสอบท่า Squat
  const detectSquat = () => {
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
      setReps((prev) => prev + 1);
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

  // ฟังก์ชันสำหรับการตรวจสอบท่า Lunges
  const detectLunges = () => {
    if (!posesRef.current || posesRef.current.length === 0) return;

    // ตรวจสอบมุมเข่าหน้าและเข่าหลัง
    const leftHip = posesRef.current[0].keypoints[11];
    const leftKnee = posesRef.current[0].keypoints[13];
    const leftAnkle = posesRef.current[0].keypoints[15];
    const rightHip = posesRef.current[0].keypoints[12];
    const rightKnee = posesRef.current[0].keypoints[14];
    const rightAnkle = posesRef.current[0].keypoints[16];

    // ตรวจสอบว่าจุดสำคัญทั้งหมดถูกตรวจจับได้
    const allPointsDetected =
      leftHip.score &&
      leftKnee.score &&
      leftAnkle.score &&
      rightHip.score &&
      rightKnee.score &&
      rightAnkle.score &&
      leftHip.score > 0.2 &&
      leftKnee.score > 0.2 &&
      leftAnkle.score > 0.2 &&
      rightHip.score > 0.2 &&
      rightKnee.score > 0.2 &&
      rightAnkle.score > 0.2;

    if (allPointsDetected) {
      // คำนวณมุมเข่าหน้า (สมมติว่าเข่าซ้ายเป็นเข่าหน้า)
      const frontAngle =
        (Math.atan2(leftHip.y - leftKnee.y, leftHip.x - leftKnee.x) -
          Math.atan2(leftAnkle.y - leftKnee.y, leftAnkle.x - leftKnee.x)) *
        (180 / Math.PI);

      // คำนวณมุมเข่าหลัง (สมมติว่าเข่าขวาเป็นเข่าหลัง)
      const backAngle =
        (Math.atan2(rightHip.y - rightKnee.y, rightHip.x - rightKnee.x) -
          Math.atan2(rightAnkle.y - rightKnee.y, rightAnkle.x - rightKnee.x)) *
        (180 / Math.PI);

      frontKneeAngleRef.current = Math.abs(frontAngle);
      backKneeAngleRef.current = Math.abs(backAngle);

      // ตรวจสอบว่าอยู่ในท่า Lunge ลง (ย่อตัว)
      // ต้องมีทั้งเข่าหน้างอและเข่าหลังงอในระดับที่เหมาะสม
      if (
        frontKneeAngleRef.current < 110 &&
        backKneeAngleRef.current < 130 &&
        lungeUpPositionRef.current
      ) {
        lungeDownPositionRef.current = true;
        lungeUpPositionRef.current = false;
        showFeedback("ย่อตัวลงแล้ว รักษาหลังให้ตรง");

        // ตรวจสอบการวางตำแหน่งเข่า
        if (leftKnee.x > leftAnkle.x + 50) {
          // เข่าเลยปลายเท้ามากเกินไป
          if (!kneeAlignmentWarningRef.current) {
            showFeedback("ระวัง! เข่าหน้าไม่ควรเลยปลายเท้ามากเกินไป");
            kneeAlignmentWarningRef.current = true;
          }
        } else {
          kneeAlignmentWarningRef.current = false;
        }
      }
      // ตรวจสอบว่ากลับมายืนตรง
      else if (
        frontKneeAngleRef.current > 160 &&
        backKneeAngleRef.current > 160 &&
        lungeDownPositionRef.current
      ) {
        lungeUpPositionRef.current = true;
        lungeDownPositionRef.current = false;
        setReps((prev) => prev + 1);
        showFeedback("ดีมาก! ทำครบ 1 ครั้ง");
        kneeAlignmentWarningRef.current = false;
      }
    }
  };

  // ฟังก์ชันสำหรับการตรวจสอบท่า Leg Raise
  const detectLegRaise = () => {
    if (!posesRef.current || posesRef.current.length === 0) return;

    // ตรวจสอบมุมขาและสะโพก
    const leftHip = posesRef.current[0].keypoints[11];
    const leftKnee = posesRef.current[0].keypoints[13];
    const leftAnkle = posesRef.current[0].keypoints[15];
    const leftShoulder = posesRef.current[0].keypoints[5];

    if (
      leftHip.score &&
      leftKnee.score &&
      leftAnkle.score &&
      leftShoulder.score &&
      leftHip.score > 0.2 &&
      leftKnee.score > 0.2 &&
      leftAnkle.score > 0.2 &&
      leftShoulder.score > 0.2
    ) {
      // คำนวณมุมระหว่างลำตัวและขา
      const legAngle =
        (Math.atan2(leftKnee.y - leftHip.y, leftKnee.x - leftHip.x) -
          Math.atan2(leftShoulder.y - leftHip.y, leftShoulder.x - leftHip.x)) *
        (180 / Math.PI);

      legAngleRef.current = Math.abs(legAngle);

      // ตรวจสอบว่าขายกขึ้น (ท่า Leg Raise ขึ้น)
      if (legAngleRef.current < 45 && legRaiseDownPositionRef.current) {
        legRaiseUpPositionRef.current = true;
        legRaiseDownPositionRef.current = false;
        showFeedback("ยกขาขึ้นแล้ว เกร็งท้องไว้");

        // ตรวจสอบหลังส่วนล่าง
        const backAngle = Math.abs(backAngleRef.current);
        if (backAngle > 20 && backAngle < 160) {
          if (!lowerBackWarningRef.current) {
            showFeedback("ระวัง! อย่าแอ่นหลังส่วนล่างมากเกินไป");
            lowerBackWarningRef.current = true;
          }
        } else {
          lowerBackWarningRef.current = false;
        }
      }
      // ตรวจสอบว่าขาลดลงกลับสู่พื้น (ท่า Leg Raise ลง)
      else if (legAngleRef.current > 160 && legRaiseUpPositionRef.current) {
        legRaiseDownPositionRef.current = true;
        legRaiseUpPositionRef.current = false;
        setReps((prev) => prev + 1);
        showFeedback("ดีมาก! ทำครบ 1 ครั้ง");
        lowerBackWarningRef.current = false;
      }
    }
  };

  // ตัวแปรสำหรับการตรวจจับท่า Russian Twist
  const russianTwistLeftRef = useRef<boolean>(false);
  const russianTwistRightRef = useRef<boolean>(false);
  const russianTwistCenterRef = useRef<boolean>(true);
  const russianTwistWarningGivenRef = useRef<boolean>(false);
  const lastTwistDirectionRef = useRef<string>("");

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

    // ตรวจสอบว่า keypoints ทั้งหมดมีค่า confidence ที่เพียงพอ
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

    // คำนวณจุดกึ่งกลางของไหล่และสะโพก
    const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
    const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
    const hipMidX = (leftHip.x + rightHip.x) / 2;
    const hipMidY = (leftHip.y + rightHip.y) / 2;
    const kneeMidX = (leftKnee.x + rightKnee.x) / 2;
    const kneeMidY = (leftKnee.y + rightKnee.y) / 2;

    // ตรวจสอบท่านั่งที่ถูกต้อง (เข่างอประมาณ 90 องศา)
    const leftKneeAngle = calculateAngle(leftHip, leftKnee, {
      x: leftKnee.x,
      y: leftKnee.y + 100,
    });
    const rightKneeAngle = calculateAngle(rightHip, rightKnee, {
      x: rightKnee.x,
      y: rightKnee.y + 100,
    });
    const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;

    // ตรวจสอบว่าเท้าไม่แตะพื้น (สะโพกสูงกว่าเข่า)
    const feetOffGround = hipMidY < kneeMidY - 20;

    // ตรวจสอบท่านั่งที่ถูกต้อง
    const isProperSittingPosition =
      avgKneeAngle > 70 && avgKneeAngle < 110 && feetOffGround;

    if (!isProperSittingPosition) {
      if (!russianTwistWarningGivenRef.current) {
        showFeedback("นั่งโดยงอเข่าประมาณ 90 องศา และยกเท้าขึ้นจากพื้น");
        russianTwistWarningGivenRef.current = true;
      }
      return;
    } else {
      russianTwistWarningGivenRef.current = false;
    }

    // คำนวณจุดกึ่งกลางของข้อมือ (แทนการจับมือ)
    const handsMidX = (leftWrist.x + rightWrist.x) / 2;
    const handsMidY = (leftWrist.y + rightWrist.y) / 2;

    // ตรวจสอบว่าแขนอยู่ในตำแหน่งที่ถูกต้อง (ข้อมือต่ำกว่าไหล่แต่สูงกว่าสะโพก)
    const armsInCorrectPosition =
      handsMidY > shoulderMidY && handsMidY < hipMidY + 50;

    if (!armsInCorrectPosition) {
      showFeedback("ยกแขนขึ้นระดับอก และจับมือไว้ด้วยกัน");
      return;
    }

    // คำนวณการหมุนลำตัว โดยเปรียบเทียบตำแหน่งมือกับแกนกึ่งกลางของลำตัว
    const torsoMidX = (shoulderMidX + hipMidX) / 2;
    const rotationThreshold = 40; // ระยะห่างขั้นต่ำสำหรับการหมุน

    // ตรวจสอบการหมุนไปทางซ้าย
    const isTwistingLeft = handsMidX < torsoMidX - rotationThreshold;
    // ตรวจสอบการหมุนไปทางขวา
    const isTwistingRight = handsMidX > torsoMidX + rotationThreshold;
    // ตรวจสอบการอยู่ตรงกลาง
    const isCenter = !isTwistingLeft && !isTwistingRight;

    // ตรวจจับการเคลื่อนไหวและนับครั้ง
    if (
      isTwistingLeft &&
      !russianTwistLeftRef.current &&
      russianTwistCenterRef.current
    ) {
      russianTwistLeftRef.current = true;
      russianTwistRightRef.current = false;
      russianTwistCenterRef.current = false;

      if (lastTwistDirectionRef.current === "right") {
        setReps((prev) => prev + 1);
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
        setReps((prev) => prev + 1);
        showFeedback("ดีมาก! หมุนขวา");
      } else {
        showFeedback("หมุนขวา");
      }
      lastTwistDirectionRef.current = "right";
    } else if (
      isCenter &&
      (russianTwistLeftRef.current || russianTwistRightRef.current)
    ) {
      // กลับมาตรงกลาง - เตรียมพร้อมสำหรับการหมุนครั้งต่อไป
      russianTwistCenterRef.current = true;
      russianTwistLeftRef.current = false;
      russianTwistRightRef.current = false;
    }
  };

  // ฟังก์ชันสำหรับการตรวจสอบท่า Plank
  const detectPlank = () => {
    if (!posesRef.current || posesRef.current.length === 0) return;

    // ตรวจสอบตำแหน่งของร่างกาย
    const leftShoulder = posesRef.current[0].keypoints[5];
    const rightShoulder = posesRef.current[0].keypoints[6];
    const leftElbow = posesRef.current[0].keypoints[7];
    const rightElbow = posesRef.current[0].keypoints[8];
    const leftHip = posesRef.current[0].keypoints[11];
    const rightHip = posesRef.current[0].keypoints[12];
    const leftKnee = posesRef.current[0].keypoints[13];
    const rightKnee = posesRef.current[0].keypoints[14];
    const leftAnkle = posesRef.current[0].keypoints[15];
    const rightAnkle = posesRef.current[0].keypoints[16];

    if (
      leftShoulder.score &&
      rightShoulder.score &&
      leftElbow.score &&
      rightElbow.score &&
      leftHip.score &&
      rightHip.score &&
      leftKnee.score &&
      rightKnee.score &&
      leftAnkle.score &&
      rightAnkle.score &&
      leftShoulder.score > 0.2 &&
      rightShoulder.score > 0.2 &&
      leftElbow.score > 0.2 &&
      rightElbow.score > 0.2 &&
      leftHip.score > 0.2 &&
      rightHip.score > 0.2 &&
      leftKnee.score > 0.2 &&
      rightKnee.score > 0.2 &&
      leftAnkle.score > 0.2 &&
      rightAnkle.score > 0.2
    ) {
      // คำนวณมุมของลำตัว (torso) เทียบกับแนวราบ
      const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
      const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
      const hipMidX = (leftHip.x + rightHip.x) / 2;
      const hipMidY = (leftHip.y + rightHip.y) / 2;
      const kneeMidX = (leftKnee.x + rightKnee.x) / 2;
      const kneeMidY = (leftKnee.y + rightKnee.y) / 2;

      // คำนวณมุมของลำตัวเทียบกับแนวราบ
      const torsoAngle =
        Math.atan2(shoulderMidY - hipMidY, shoulderMidX - hipMidX) *
        (180 / Math.PI);
      const legAngle =
        Math.atan2(hipMidY - kneeMidY, hipMidX - kneeMidX) * (180 / Math.PI);

      const isTorsoStraight =
        Math.abs(torsoAngle) > 170 || Math.abs(torsoAngle) < 10;
      const isLegStraight = Math.abs(legAngle) > 170 || Math.abs(legAngle) < 10;

      // ตรวจสอบว่าอยู่ในท่า Plank ที่ถูกต้อง
      if (isTorsoStraight && isLegStraight) {
        // ตรวจสอบว่าหลังไม่แอ่น
        if (
          Math.abs(backAngleRef.current) < 20 ||
          Math.abs(backAngleRef.current) > 160
        ) {
          if (!plankStartedRef.current) {
            plankStartedRef.current = true;
            plankProperFormRef.current = true;
            showFeedback("เริ่มท่า Plank แล้ว เกร็งท้อง ก้นและขาตลอดเวลา");

            // เริ่มจับเวลา
            if (plankTimerRef.current) {
              clearInterval(plankTimerRef.current);
            }

            setPlankTime(0);
            plankTimerRef.current = setInterval(() => {
              setPlankTime((prev) => prev + 1);
            }, 1000);
          }

          // รีเซ็ตการแจ้งเตือน
          plankWarningGivenRef.current = false;
        } else {
          // หลังแอ่น
          plankProperFormRef.current = false;
          if (!plankWarningGivenRef.current) {
            showFeedback(
              "อย่าห่อสะบักและยื่นคอลงพื้น อย่าหลังแอ่น หรือกระดกก้น"
            );
            plankWarningGivenRef.current = true;
          }
        }
      } else {
        // ไม่ได้อยู่ในท่า Plank แล้ว
        if (plankStartedRef.current) {
          plankStartedRef.current = false;
          plankProperFormRef.current = false;

          // หยุดจับเวลา
          if (plankTimerRef.current) {
            clearInterval(plankTimerRef.current);
            plankTimerRef.current = null;
          }

          showFeedback(`จบท่า Plank แล้ว คุณทำได้ ${plankTime} วินาที`);
        }
      }
    }
  };

  // ฟังก์ชันสำหรับการตรวจสอบท่า Side Plank
  const detectSidePlank = () => {
    if (!posesRef.current || posesRef.current.length === 0) return;

    // ตรวจสอบตำแหน่งของร่างกาย
    const leftShoulder = posesRef.current[0].keypoints[5];
    const rightShoulder = posesRef.current[0].keypoints[6];
    const leftElbow = posesRef.current[0].keypoints[7];
    const rightElbow = posesRef.current[0].keypoints[8];
    const leftWrist = posesRef.current[0].keypoints[9];
    const rightWrist = posesRef.current[0].keypoints[10];
    const leftHip = posesRef.current[0].keypoints[11];
    const rightHip = posesRef.current[0].keypoints[12];
    const leftKnee = posesRef.current[0].keypoints[13];
    const rightKnee = posesRef.current[0].keypoints[14];
    const leftAnkle = posesRef.current[0].keypoints[15];
    const rightAnkle = posesRef.current[0].keypoints[16];

    if (
      leftShoulder.score &&
      rightShoulder.score &&
      leftElbow.score &&
      rightElbow.score &&
      leftHip.score &&
      rightHip.score &&
      leftKnee.score &&
      rightKnee.score &&
      leftAnkle.score &&
      rightAnkle.score &&
      leftShoulder.score > 0.2 &&
      rightShoulder.score > 0.2 &&
      leftElbow.score > 0.2 &&
      rightElbow.score > 0.2 &&
      leftHip.score > 0.2 &&
      rightHip.score > 0.2 &&
      leftKnee.score > 0.2 &&
      rightKnee.score > 0.2 &&
      leftAnkle.score > 0.2 &&
      rightAnkle.score > 0.2
    ) {
      // คำนวณมุมของลำตัวเทียบกับแนวดิ่ง
      const shoulderDiffX = Math.abs(leftShoulder.x - rightShoulder.x);
      const shoulderDiffY = Math.abs(leftShoulder.y - rightShoulder.y);
      const hipDiffX = Math.abs(leftHip.x - rightHip.x);
      const hipDiffY = Math.abs(leftHip.y - rightHip.y);

      // ตรวจสอบว่าลำตัวตั้งฉากกับพื้น (ไหล่และสะโพกอยู่ในแนวดิ่ง)
      const isVerticalTorso =
        shoulderDiffY > shoulderDiffX * 1.5 && hipDiffY > hipDiffX * 1.5;

      // ตรวจสอบว่าขาเหยียดตรง
      const leftLegAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
      const rightLegAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
      const isStraightLegs =
        (leftLegAngle > 160 || leftLegAngle < 20) &&
        (rightLegAngle > 160 || rightLegAngle < 20);

      // ตรวจสอบว่าเป็น Side Plank ด้านซ้าย
      const isLeftSidePlank =
        leftElbow.y > leftShoulder.y &&
        Math.abs(leftElbow.x - leftShoulder.x) < 30 &&
        leftWrist.y > leftElbow.y;

      // ตรวจสอบว่าเป็น Side Plank ด้านขวา
      const isRightSidePlank =
        rightElbow.y > rightShoulder.y &&
        Math.abs(rightElbow.x - rightShoulder.x) < 30 &&
        rightWrist.y > rightElbow.y;

      // ตรวจสอบว่าอยู่ในท่า Side Plank ที่ถูกต้อง
      if (
        (isLeftSidePlank || isRightSidePlank) &&
        isVerticalTorso &&
        isStraightLegs
      ) {
        // บันทึกด้านที่กำลังทำ Side Plank
        sidePlankSideRef.current = isLeftSidePlank ? "left" : "right";

        if (!sidePlankStartedRef.current) {
          sidePlankStartedRef.current = true;
          sidePlankProperFormRef.current = true;
          showFeedback(
            `เริ่มท่า Side Plank ด้าน${
              isLeftSidePlank ? "ซ้าย" : "ขวา"
            } แล้ว เกร็งท้อง ก้นและขาตลอดเวลา`
          );

          // เริ่มจับเวลา
          if (sidePlankTimerRef.current) {
            clearInterval(sidePlankTimerRef.current);
          }

          setSidePlankTime(0);
          sidePlankTimerRef.current = setInterval(() => {
            setSidePlankTime((prev) => prev + 1);
          }, 1000);
        }

        // รีเซ็ตการแจ้งเตือน
        sidePlankWarningGivenRef.current = false;
      } else {
        // ไม่ได้อยู่ในท่า Side Plank แล้ว
        if (sidePlankStartedRef.current) {
          sidePlankStartedRef.current = false;
          sidePlankProperFormRef.current = false;

          // หยุดจับเวลา
          if (sidePlankTimerRef.current) {
            clearInterval(sidePlankTimerRef.current);
            sidePlankTimerRef.current = null;
          }

          showFeedback(
            `จบท่า Side Plank ด้าน${
              sidePlankSideRef.current === "left" ? "ซ้าย" : "ขวา"
            } แล้ว คุณทำได้ ${sidePlankTime} วินาที`
          );
        }
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
      setReps((prev) => prev + 1);
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

    // คำนวณมุมของลำตัว (ไหล่-สะโพก-เข่า) เพื่อตรวจสอบท่าโน้มตัวไปข้างหน้า
    const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
    const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
    const hipMidX = (leftHip.x + rightHip.x) / 2;
    const hipMidY = (leftHip.y + rightHip.y) / 2;
    const kneeMidX = (leftKnee.x + rightKnee.x) / 2;
    const kneeMidY = (leftKnee.y + rightKnee.y) / 2;

    // คำนวณมุมของลำตัวเทียบกับแนวดิ่ง (ควรโน้มไปข้างหน้าประมาณ 45-60 องศา)
    const torsoAngle =
      Math.atan2(shoulderMidY - hipMidY, shoulderMidX - hipMidX) *
      (180 / Math.PI);
    bentOverRowBackAngleRef.current = Math.abs(torsoAngle);

    // ตรวจสอบท่าโน้มตัวที่ถูกต้อง (ลำตัวโน้มไปข้างหน้าประมาณ 45-75 องศา)
    const isProperBentPosition =
      bentOverRowBackAngleRef.current > 30 &&
      bentOverRowBackAngleRef.current < 80;
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

    // คำนวณมุมแขนซ้ายและขวา (ไหล่-ข้อศอก-ข้อมือ)
    const leftArmAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightArmAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
    const avgArmAngle = (leftArmAngle + rightArmAngle) / 2;
    bentOverRowArmAngleRef.current = avgArmAngle;

    // ตรวจสอบตำแหน่งข้อศอก (ควรอยู่ใกล้ลำตัวและไม่กางออกด้านข้างมากเกินไป)
    const leftElbowToTorso = Math.abs(leftElbow.x - shoulderMidX);
    const rightElbowToTorso = Math.abs(rightElbow.x - shoulderMidX);
    const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
    const properElbowPosition =
      (leftElbowToTorso + rightElbowToTorso) / 2 < shoulderWidth * 0.8;

    // ตรวจสอบท่าดึงขึ้น (แขนงอ ข้อศอกใกล้ลำตัว)
    if (
      avgArmAngle < 90 &&
      bentOverRowDownPositionRef.current &&
      properElbowPosition
    ) {
      bentOverRowUpPositionRef.current = true;
      bentOverRowDownPositionRef.current = false;
      setReps((prev) => prev + 1);
      showFeedback("ดีมาก! หนีบรักแร้ เกร็งหลัง");
    }
    // ตรวจสอบท่าลดลง (แขนเหยียดลง)
    else if (
      avgArmAngle > 150 &&
      bentOverRowUpPositionRef.current &&
      properElbowPosition
    ) {
      bentOverRowDownPositionRef.current = true;
      bentOverRowUpPositionRef.current = false;
      showFeedback("ลดลงช้าๆ ควบคุมน้ำหนัก");
    }

    // ตรวจสอบท่าทางที่ไม่ถูกต้อง
    if (!properElbowPosition && !bentOverRowFormWarningRef.current) {
      showFeedback("ไม่กางศอกออกด้านข้างมากเกินไป หนีบรักแร้");
      bentOverRowFormWarningRef.current = true;
      setTimeout(() => {
        bentOverRowFormWarningRef.current = false;
      }, 3000);
    }

    // ตรวจสอบการแอ่นหลังมากเกินไป
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
      setReps((prev) => prev + 1);
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

    // เพิ่มการแสดงข้อมูล debug (สำหรับการปรับแต่ง)
    console.log({
      avgArmAngle: avgArmAngle.toFixed(1),
      isUpPosition,
      isDownPosition,
      leftWristY: leftWrist.y.toFixed(1),
      rightWristY: rightWrist.y.toFixed(1),
      leftShoulderY: leftShoulder.y.toFixed(1),
      rightShoulderY: rightShoulder.y.toFixed(1),
      exerciseMode: "ทำได้ทั้งยืนและนั่ง",
    });
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
      rightShoulder.score < 0.3
    ) {
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
      setReps((prev) => prev + 1);
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
        (kp) => kp?.score && kp.score >= 0.3
      )
    )
      return;

    if (!Ls || !Rs || !Le || !Re || !Lw || !Rw || !nose) return;

    const angleL = calculateAngle(Ls, Le, Lw);
    const angleR = calculateAngle(Rs, Re, Rw);
    const avgAngle = (angleL + angleR) / 2;
    tricepExtensionArmAngleRef.current = avgAngle;

    const shoulderWidth = Math.abs(Ls.x - Rs.x);

    // เช็คว่าแขนเหยียดตรงแนวดิ่งข้างศีรษะ
    const LwOffset = Math.abs(Ls.x - Lw.x);
    const RwOffset = Math.abs(Rs.x - Rw.x);
    const isVertical =
      LwOffset < shoulderWidth * 0.15 && RwOffset < shoulderWidth * 0.15;

    // ข้อศอกแนบข้างศรีษะ
    const LeXfromN = Math.abs(Le.x - nose.x);
    const ReXfromN = Math.abs(Re.x - nose.x);
    const elbowClose =
      LeXfromN < shoulderWidth * 0.6 && ReXfromN < shoulderWidth * 0.6;

    // ศอกอยู่หลังศรีษะ (ระดับ y สูงกว่าหัวไหล่)
    const LeY = Le.y < Ls.y + 20;
    const ReY = Re.y < Rs.y + 20;
    const elbowHigh = LeY && ReY;

    // ตำแหน่ง Down & Up
    const isDown = avgAngle < 100 && elbowClose && elbowHigh;
    const isUp = avgAngle > 150 && isVertical && elbowHigh;

    const minChange = 50;

    // ท่าเริ่มจาก Up → ลง
    if (isDown && tricepExtensionUpPositionRef.current) {
      tricepExtensionDownPositionRef.current = true;
      tricepExtensionUpPositionRef.current = false;
      tricepExtensionMaxAngleRef.current = Math.max(
        tricepExtensionMaxAngleRef.current || 0,
        avgAngle
      );
      showFeedback("งอแขนหลังศีรษะ");
    }

    // Up จนสุดจาก Down
    else if (isUp && tricepExtensionDownPositionRef.current) {
      const delta = Math.abs(
        (tricepExtensionMaxAngleRef.current || 0) - avgAngle
      );
      if (delta >= minChange) {
        tricepExtensionUpPositionRef.current = true;
        tricepExtensionDownPositionRef.current = false;
        tricepExtensionMaxAngleRef.current = 0;
        setReps((r) => r + 1);
        showFeedback("✅ เหยียดแขนตรงเหนือศีรษะแบบคลิป!");
      } else {
        showFeedback("เหยียดไม่สุด ลองให้แขนตรงขึ้นอีกหน่อย");
      }
    }

    // Feedback ตรวจรูปท่า
    if (!elbowClose && !tricepExtensionFormWarningRef.current) {
      showFeedback("ศอกควรแนบข้างศีรษะ ไม่กางออก");
      tricepExtensionFormWarningRef.current = true;
      setTimeout(() => (tricepExtensionFormWarningRef.current = false), 3000);
    }
    if (!isVertical && isUp && !tricepExtensionFormWarningRef.current) {
      showFeedback("เหยียดแขนให้ตรงแนวดิ่งเหนือศีรษะ");
      tricepExtensionFormWarningRef.current = true;
      setTimeout(() => (tricepExtensionFormWarningRef.current = false), 3000);
    }
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
      setReps((prev) => prev + 1);
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
      setReps((prev) => prev + 1);
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

  // ฟังก์ชันสำหรับการตรวจจับท่า Dumbbell Romanian Deadlifts
  const detectDumbbellRomanianDeadlifts = () => {
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

    // คำนวณมุมสะโพก (Hip Hinge) - มุมระหว่างลำตัวและขา
    const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
    const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
    const hipMidX = (leftHip.x + rightHip.x) / 2;
    const hipMidY = (leftHip.y + rightHip.y) / 2;
    const kneeMidX = (leftKnee.x + rightKnee.x) / 2;
    const kneeMidY = (leftKnee.y + rightKnee.y) / 2;

    // คำนวณมุมของลำตัว (ไหล่-สะโพก-เข่า) สำหรับ Hip Hinge
    const hipAngle = calculateAngle(
      { x: shoulderMidX, y: shoulderMidY },
      { x: hipMidX, y: hipMidY },
      { x: kneeMidX, y: kneeMidY }
    );
    romanianDeadliftHipAngleRef.current = hipAngle;

    // ตรวจสอบการ Hip Hinge ที่ถูกต้อง (มุมสะโพกควรอยู่ระหว่าง 45-90 องศา)
    const properHipHinge = hipAngle > 45 && hipAngle < 120;
    romanianDeadliftHipHingeRef.current = properHipHinge;

    // คำนวณมุมเข่า (ควรงอเล็กน้อยเท่านั้น)
    const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
    const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;

    // ตรวจสอบความมั่นคงของเข่า (ควรงอเล็กน้อย 15-30 องศา)
    const kneeStability = avgKneeAngle > 150 && avgKneeAngle < 180;
    romanianDeadliftKneeStabilityRef.current = kneeStability;

    // ตรวจสอบท่าทางหลังตรง
    const backAngle =
      Math.atan2(shoulderMidY - hipMidY, shoulderMidX - hipMidX) *
      (180 / Math.PI);
    romanianDeadliftBackAngleRef.current = Math.abs(backAngle);
    const straightBack =
      romanianDeadliftBackAngleRef.current < 30 ||
      romanianDeadliftBackAngleRef.current > 150;

    // ตรวจสอบตำแหน่งดัมเบล (ควรอยู่ใกล้ขา)
    const wristMidX = (leftWrist.x + rightWrist.x) / 2;
    const dumbbellCloseToLegs = Math.abs(wristMidX - kneeMidX) < 50;

    // ตรวจสอบท่าลง (Hip Hinge)
    if (
      properHipHinge &&
      kneeStability &&
      straightBack &&
      dumbbellCloseToLegs &&
      romanianDeadliftUpPositionRef.current
    ) {
      romanianDeadliftDownPositionRef.current = true;
      romanianDeadliftUpPositionRef.current = false;
      showFeedback("ดันสะโพกไปด้านหลัง รู้สึกยืดที่หลังขา");
    }
    // ตรวจสอบท่าขึ้น (กลับสู่ท่ายืนตรง)
    else if (
      hipAngle > 160 &&
      kneeStability &&
      straightBack &&
      dumbbellCloseToLegs &&
      romanianDeadliftDownPositionRef.current
    ) {
      romanianDeadliftUpPositionRef.current = true;
      romanianDeadliftDownPositionRef.current = false;
      setReps((prev) => prev + 1);
      showFeedback("ดีมาก! ดันสะโพกไปข้างหน้า ยืนตรง");
    }

    // ตรวจสอบท่าทางที่ไม่ถูกต้อง - Hip Hinge
    if (!properHipHinge && !romanianDeadliftFormWarningRef.current) {
      showFeedback("ดันสะโพกไปด้านหลัง ไม่ใช่งอเข่า");
      romanianDeadliftFormWarningRef.current = true;
      setTimeout(() => {
        romanianDeadliftFormWarningRef.current = false;
      }, 3000);
    }

    // ตรวจสอบท่าทางที่ไม่ถูกต้อง - เข่างอมากเกินไป
    if (!kneeStability && !romanianDeadliftFormWarningRef.current) {
      showFeedback("เข่างอเล็กน้อยเท่านั้น โฟกัสที่การดันสะโพก");
      romanianDeadliftFormWarningRef.current = true;
      setTimeout(() => {
        romanianDeadliftFormWarningRef.current = false;
      }, 3000);
    }

    // ตรวจสอบท่าทางที่ไม่ถูกต้อง - หลังโค้ง
    if (!straightBack && !romanianDeadliftFormWarningRef.current) {
      showFeedback("รักษาหลังให้ตรง อกผาย ไหล่ถอยหลัง");
      romanianDeadliftFormWarningRef.current = true;
      setTimeout(() => {
        romanianDeadliftFormWarningRef.current = false;
      }, 3000);
    }

    // ตรวจสอบท่าทางที่ไม่ถูกต้อง - ดัมเบลห่างจากขา
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
        if (exerciseTypeRef.current === "pushup") {
          setReps((prev) => prev + 1);
          showFeedback("ดีมาก!");
        }
        // เพิ่มเงื่อนความสำหรับ burpee-expert เพื่อไม่ให้นับเมื่อทำเพียงท่า push up
        else if (exerciseTypeRef.current === "burpee-expert") {
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

  const poseOption = [
    { value: "pushup", label: "Push Up" },
    { value: "burpee-beginner", label: "Burpee (ผู้เริ่มต้น)" },
    { value: "burpee-expert", label: "Burpee (ผู้เชี่ยวชาญ)" },
    { value: "squat", label: "Squat" },
    { value: "lunge", label: "Lunge" },
    { value: "legraise", label: "Leg Raise" },
    { value: "russiantwist", label: "Russian Twist" },
    { value: "plank", label: "Plank" },
    { value: "sideplank", label: "Side Plank" },
    { value: "dumbbellbenchpress", label: "Dumbbell Bench Press" },
    { value: "dumbbellbentoverrows", label: "Dumbbell Bent-Over Rows" },
    { value: "dumbbellshoulderpress", label: "Dumbbell Shoulder Press" },
    { value: "dumbbellbicepcurls", label: "Dumbbell Bicep Curls" },
    {
      value: "dumbbelloverheadtricepextension",
      label: "Dumbbell Overhead Tricep Extension",
    },
    {
      value: "dumbbellromaniandeadlifts",
      label: "Dumbbell Romanian Deadlifts",
    },
    { value: "dumbbellgobletsquat", label: "Dumbbell Goblet Squat" },
    {
      value: "dumbbellsidelateralraises",
      label: "Dumbbell Side Lateral Raises",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center p-2 md:p-8 gap-2 md:gap-4 bg-gray-100 w-full min-h-screen">
      <h1 className="text-xl md:text-3xl font-bold mb-2 md:mb-4">
        ระบบตรวจจับท่าออกกำลังกาย
      </h1>

      <div className="flex flex-wrap justify-center gap-2 mb-2 md:mb-4 w-full max-w-md md:max-w-lg">
        <select
          value={exerciseType}
          onChange={(e) => {
            setExerciseType(e.target.value);
            setReps(0);
            setPlankTime(0);
            setSidePlankTime(0);
            if (plankTimerRef.current) {
              clearInterval(plankTimerRef.current);
              plankTimerRef.current = null;
            }
            if (sidePlankTimerRef.current) {
              clearInterval(sidePlankTimerRef.current);
              sidePlankTimerRef.current = null;
            }
            plankStartedRef.current = false;
            sidePlankStartedRef.current = false;
          }}
          className="px-4 py-2 rounded-lg bg-gray-200 text-black w-full md:w-auto"
        >
          {poseOption.map((v) => (
            <option key={v.value} value={v.value}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      <div className="relative w-full max-w-md md:max-w-lg">
        <video ref={videoRef} className="hidden" autoPlay playsInline muted />
        <canvas
          ref={canvasRef}
          className="w-full h-auto border-2 md:border-4 border-blue-500 rounded-lg shadow-lg"
        />

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white text-lg md:text-xl">
            กำลังโหลด กรุณารอสักครู่...
          </div>
        )}
      </div>

      <div className="mt-2 md:mt-4 p-3 md:p-4 bg-white rounded-lg shadow-md w-full max-w-md md:max-w-lg">
        <h2 className="text-xl md:text-2xl font-semibold text-black">
          {exerciseType === "plank"
            ? `เวลา Plank: ${plankTime} วินาที`
            : exerciseType === "sideplank"
            ? `เวลา Side Plank: ${sidePlankTime} วินาที (ด้าน${
                sidePlankSideRef.current === "left" ? "ซ้าย" : "ขวา"
              })`
            : `จำนวน ${exerciseType} ที่ทำได้: ${reps}`}
        </h2>
        <p className="mt-1 md:mt-2 text-sm md:text-base text-black">
          {exerciseType === "plank" || exerciseType === "sideplank"
            ? "ระบบจะจับเวลาและตรวจสอบท่าทางของคุณอัตโนมัติ"
            : "ระบบจะนับจำนวนครั้งและตรวจสอบท่าทางของคุณอัตโนมัติ"}
        </p>

        {isMobile && (
          <p className="mt-1 text-sm text-red-600 font-medium">
            คำแนะนำ: วางโทรศัพท์ในแนวตั้งและถอยห่างจากกล้องประมาณ 2-3 เมตร
          </p>
        )}
      </div>
      <div className="text-sm">Version {version}</div>
    </div>
  );
};

export default Home;
