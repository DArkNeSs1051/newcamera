"use client";

import { useEffect, useRef, useState } from "react";
import * as poseDetection from "@tensorflow-models/pose-detection";
import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs";

const Home = () => {
  const version = "1.0.2"; // กำหนดเวอร์ชันของแอปพลิเคชัน
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

  // ตัวแปรสำหรับการตรวจจับท่า Russian Twists
  const twistLeftPositionRef = useRef<boolean>(false);
  const twistRightPositionRef = useRef<boolean>(false);
  const twistCenterPositionRef = useRef<boolean>(true);
  const torsoAngleRef = useRef<number>(0);
  const properFormWarningRef = useRef<boolean>(false);
  const hasCompletedLeftTwist = useRef<boolean>(false);
  const hasCompletedRightTwist = useRef<boolean>(false);

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
        // ตรวจสอบว่ายกแขนขึ้นเหนือหะคะอะคะคะคะคะคะคะคะคะคะคะคะ → ยกแขน
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

  // ฟังก์ชันสำหรับการตรวจสอบท่า Russian Twist
  const detectRussianTwist = () => {
    if (!posesRef.current || posesRef.current.length === 0) return;

    // ตรวจสอบตำแหน่งของร่างกาย
    const leftShoulder = posesRef.current[0].keypoints[5];
    const rightShoulder = posesRef.current[0].keypoints[6];
    const leftHip = posesRef.current[0].keypoints[11];
    const rightHip = posesRef.current[0].keypoints[12];
    const leftWrist = posesRef.current[0].keypoints[9];
    const rightWrist = posesRef.current[0].keypoints[10];
    const leftKnee = posesRef.current[0].keypoints[13];
    const rightKnee = posesRef.current[0].keypoints[14];
    const leftAnkle = posesRef.current[0].keypoints[15];
    const rightAnkle = posesRef.current[0].keypoints[16];

    if (
      leftShoulder.score &&
      rightShoulder.score &&
      leftHip.score &&
      rightHip.score &&
      leftWrist.score &&
      rightWrist.score &&
      leftShoulder.score > 0.2 &&
      rightShoulder.score > 0.2 &&
      leftHip.score > 0.2 &&
      rightHip.score > 0.2 &&
      leftWrist.score > 0.2 &&
      rightWrist.score > 0.2
    ) {
      // คำนวณจุดกึ่งกลางของไหล่และสะโพก
      const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
      const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
      const hipMidX = (leftHip.x + rightHip.x) / 2;
      const hipMidY = (leftHip.y + rightHip.y) / 2;

      // คำนวณจุดกึ่งกลางของข้อมือ
      const wristMidX = (leftWrist.x + rightWrist.x) / 2;
      const wristMidY = (leftWrist.y + rightWrist.y) / 2;

      // คำนวณมุมของลำตัว (torso) เทียบกับแนวดิ่ง
      const torsoAngle =
        Math.atan2(shoulderMidX - hipMidX, shoulderMidY - hipMidY) *
        (180 / Math.PI);
      torsoAngleRef.current = Math.abs(torsoAngle);

      // ตรวจสอบว่าเท้ายกขึ้นจากพื้น (ตามท่า Russian twist ที่ถูกต้อง)
      const feetLifted =
        leftKnee.score &&
        rightKnee.score &&
        leftAnkle.score &&
        rightAnkle.score &&
        leftKnee.score > 0.2 &&
        rightKnee.score > 0.2 &&
        leftAnkle.score > 0.2 &&
        rightAnkle.score > 0.2 &&
        (leftKnee.y < leftAnkle.y - 10 || rightKnee.y < rightAnkle.y - 10);

      // ตรวจสอบว่าแขนยื่นไปข้างหน้า (ตามท่า Russian twist ที่ถูกต้อง)
      const armsExtended =
        wristMidY < shoulderMidY && Math.abs(wristMidX - shoulderMidX) < 100; // แขนอยู่ด้านหน้าลำตัว

      // ตรวจสอบมุมลำตัวที่เหมาะสม (ประมาณ 45 องศา)
      const properTorsoAngle =
        torsoAngleRef.current >= 30 && torsoAngleRef.current <= 60;

      // ให้คำแนะนำเกี่ยวกับท่าทางที่ถูกต้อง
      if (!properTorsoAngle && !properFormWarningRef.current) {
        if (torsoAngleRef.current < 30) {
          showFeedback("พยายามเอียงลำตัวให้มากขึ้น ประมาณ 45 องศา");
        } else if (torsoAngleRef.current > 60) {
          showFeedback("อย่าเอียงลำตัวมากเกินไป ประมาณ 45 องศา");
        }
        properFormWarningRef.current = true;
      } else if (properTorsoAngle) {
        properFormWarningRef.current = false;
      }

      // ให้คำแนะนำเกี่ยวกับการยกเท้า
      if (!feetLifted && !properFormWarningRef.current) {
        showFeedback("ลองยกเท้าขึ้นจากพื้นเล็กน้อย");
        properFormWarningRef.current = true;
      }

      // ตรวจสอบว่าลำตัวบิดไปทางซ้ายอย่างชัดเจน (เพิ่มค่าจาก 20 เป็น 30)
      if (
        shoulderMidX < hipMidX - 30 &&
        !twistLeftPositionRef.current &&
        (twistCenterPositionRef.current || twistRightPositionRef.current) &&
        properTorsoAngle
      ) {
        twistLeftPositionRef.current = true;
        twistRightPositionRef.current = false;
        twistCenterPositionRef.current = false;
        hasCompletedLeftTwist.current = true;
        showFeedback("บิดไปทางซ้าย ดีมาก!");
      }
      // ตรวจสอบว่าลำตัวบิดไปทางขวาอย่างชัดเจน (เพิ่มค่าจาก 20 เป็น 30)
      else if (
        shoulderMidX > hipMidX + 30 &&
        !twistRightPositionRef.current &&
        (twistCenterPositionRef.current || twistLeftPositionRef.current) &&
        properTorsoAngle
      ) {
        twistRightPositionRef.current = true;
        twistLeftPositionRef.current = false;
        twistCenterPositionRef.current = false;
        hasCompletedRightTwist.current = true;
        showFeedback("บิดไปทางขวา ดีมาก!");
      }
      // ตรวจสอบว่ากลับมาอยู่ตรงกลาง
      else if (
        Math.abs(shoulderMidX - hipMidX) < 15 &&
        !twistCenterPositionRef.current
      ) {
        twistCenterPositionRef.current = true;
        twistLeftPositionRef.current = false;
        twistRightPositionRef.current = false;
      }

      // นับจำนวนครั้งเมื่อบิดครบทั้งซ้ายและขวา (1 ครั้ง = บิดซ้าย-ขวา หรือ ขวา-ซ้าย)
      if (hasCompletedLeftTwist.current && hasCompletedRightTwist.current) {
        setReps((prev) => prev + 1);
        showFeedback("ดีมาก! ทำครบ 1 ครั้ง");
        // รีเซ็ตทั้งสองค่าเพื่อเริ่มนับใหม่
        hasCompletedLeftTwist.current = false;
        hasCompletedRightTwist.current = false;
      }
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
      // ตรวจสอบว่าเป็น Side Plank ด้านซ้ายหรือขวา
      // Side Plank ด้านซ้าย: ข้อศอกซ้ายอยู่ใต้ไหล่ซ้าย และลำตัวตั้งฉากกับพื้น
      // Side Plank ด้านขวา: ข้อศอกขวาอยู่ใต้ไหล่ขวา และลำตัวตั้งฉากกับพื้น

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

    if (posesRef.current && posesRef.current.length > 0) {
      // แสดงสถานะการตรวจจับ (สำหรบการดีบัก)
      if (exerciseTypeRef.current.includes("burpee")) {
        const statusText = `สถานะ: ${
          standingPositionRef.current ? "ยืน" : ""
        } ${squatPositionRef.current ? "ย่อตัว" : ""} ${
          jumpDetectedRef.current ? "กระโดด" : ""
        } ${jumpWithArmsUpRef.current ? "ยกแขน" : ""} ${
          pushupPositionRef.current ? "Push Up" : ""
        }`;
        ctx.font = "20px Arial";
        ctx.fillText(statusText, 20, 90);
        ctx.strokeText(statusText, 20, 90);

        // แสดงขั้นตอนปัจจุบันสำหรับ burpee แบบผู้เชี่ยวชาญ
        if (exerciseTypeRef.current === "burpee-expert") {
          const stepText = `ขั้นตอน: ${burpeeStep.current}`;
          ctx.fillText(stepText, 20, 120);
          ctx.strokeText(stepText, 20, 120);
        }
      }

      // แสดงข้อความแจ้งเตือน
      if (feedbackMessage) {
        ctx.font = "24px Arial";
        ctx.fillStyle = "red";
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1;
        ctx.fillText(feedbackMessage, 20, canvasRef.current.height - 30);
        ctx.strokeText(feedbackMessage, 20, canvasRef.current.height - 30);
      }
    } else {
      ctx.fillText(message, 20, 50);
      ctx.strokeText(message, 20, 50);
    }

    requestAnimationFrame(draw);
  };

  // ฟังก์ชันสำหรับการเริ่มต้นกล้อง
  const setupCamera = async () => {
    if (!videoRef.current) return;

    try {
      // ปรับการตั้งค่ากล้องให้เหมาะกับมือถือ
      const constraints = {
        video: {
          facingMode: "user", // เปลี่ยนจาก isMobile ? "environment" : "user" เป็น "user" เพื่อใช้กล้องหน้าเสมอ
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
            <option value={v.value}>{v.label}</option>
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

        {exerciseType === "pushup" && (
          <p className="mt-1 text-sm md:text-base text-black">
            ให้แน่ใจว่าคุณอยู่ในระยะที่กล้องสามารถมองเห็นร่างกายทั้งหมดได้
          </p>
        )}

        {exerciseType === "burpee-beginner" && (
          <p className="mt-1 text-sm md:text-base text-black">
            ท่า Burpee สำหรับผู้เริ่มต้น: ยืน → ย่อตัว →
            กระโดดพร้อมยกแขนเหนือศีรษะ → ยืน
          </p>
        )}

        {exerciseType === "burpee-expert" && (
          <p className="mt-1 text-sm md:text-base text-black">
            ท่า Burpee สำหรับผู้เชี่ยวชาญ: ยืน → ย่อตัว → Push Up → ย่อตัว →
            กระโดดพร้อมยกแขนเหนือศีรษะ → ยืน
          </p>
        )}

        {exerciseType === "squat" && (
          <p className="mt-1 text-sm md:text-base text-black">
            ท่า Squat: ยืนตรง → ย่อตัวลงโดยดันสะโพกไปด้านหลังพร้อมงอเข่า →
            กลับมายืนตรง (ระวังไม่ให้เข่าเลยปลายเท้ามากเกินไป)
          </p>
        )}

        {exerciseType === "lunges" && (
          <p className="mt-1 text-sm md:text-base text-black">
            ท่า Leg Lunges: ยืนตรง → ก้าวขาข้างหนึ่งไปข้างหน้า →
            ย่อตัวลงให้เข่าหน้างอประมาณ 90 องศา → กลับมายืนตรง
            (ระวังไม่ให้เข่าหน้าเลยปลายเท้ามากเกินไป)
          </p>
        )}

        {exerciseType === "legraise" && (
          <p className="mt-1 text-sm md:text-base text-black">
            ท่า Leg Raise: นอนหงาย → เกร็งท้องค่อยๆม้วนก้นและยกขาขึ้น →
            ค่อยๆลดขาลงสู่พื้น (ระวังอย่าแอ่นหลังส่วนล่างมากเกินไป)
          </p>
        )}

        {exerciseType === "russiantwist" && (
          <p className="mt-1 text-sm md:text-base text-black">
            ท่า Russian Twist: นั่งเอียงลำตัวประมาณ 45 องศา → บิดลำตัวไปทางซ้าย
            → กลับมาตรงกลาง → บิดลำตัวไปทางขวา → กลับมาตรงกลาง
            (เกร็งกล้ามเนื้อหน้าท้องตลอดการทำท่า)
          </p>
        )}

        {exerciseType === "plank" && (
          <p className="mt-1 text-sm md:text-base text-black">
            ท่า Plank: คว่ำหน้าลงพื้น
            ยกลำตัวขึ้นโดยใช้ปลายเท้าและข้อศอกรับน้ำหนัก → เกร็งท้อง
            ก้นและขาตลอดเวลา → รักษาลำตัวให้เป็นเส้นตรง
            (ระวังอย่าห่อสะบักและยื่นคอลงพื้น อย่าหลังแอ่น หรือกระดกก้น)
          </p>
        )}

        {exerciseType === "sideplank" && (
          <p className="mt-1 text-sm md:text-base text-black">
            ท่า Side Plank: นอนตะแคงข้าง →
            ยกลำตัวขึ้นโดยใช้ข้อศอกและปลายเท้าด้านเดียวกันรับน้ำหนัก → เกร็งท้อง
            ก้นและขาตลอดเวลา → รักษาลำตัวให้ตรงและตั้งฉากกับพื้น →
            เปลี่ยนข้างเพื่อทำอีกด้านหนึ่ง
          </p>
        )}

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
