"use client";

import { useEffect, useRef, useState } from "react";
import * as poseDetection from "@tensorflow-models/pose-detection";
import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs";

const Home = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reps, setReps] = useState(0);
  const [exerciseType, setExerciseType] = useState<
    "pushup" | "burpee-beginner" | "burpee-expert"
  >("pushup");
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
      if (exerciseType === "pushup") {
        inUpPosition();
        inDownPosition();
      } else if (exerciseType === "burpee-beginner") {
        detectBeginnerBurpee();
        detectJump();
      } else if (exerciseType === "burpee-expert") {
        inUpPosition();
        inDownPosition();
        detectExpertBurpee();
        detectJump();
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
        // ตรวจสอบว่ายกแขนขึ้นเหนือหะคะอะคะคะคะคะ → ยกแขน
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

    updateKneeAngle();
    detectSquatPosition();

    // ตรวจสอบลำดับท่าทาง: ยืน -> นั่งยอง -> กระโดดพร้อมยกแขน -> ยืน
    if (jumpDetectedRef.current && squatPositionRef.current) {
      // ตรวจสอบว่ายกแขนขึ้นเหนือศีรษะหรือไม่กี่
      if (!jumpWithArmsUpRef.current) {
        showFeedback("กรุณายกแขนขึ้นเหนือศีรษะเมื่อกระโดด");
      } else if (standingPositionRef.current) {
        setReps((prev) => prev + 1);
        squatPositionRef.current = false;
        showFeedback("ดีมาก!");
      }
    }

    // ตรวจสอบว่าย่อตัวลงต่ำพอหรือไม่กี่
    if (
      standingPositionRef.current &&
      kneeAngleRef.current > 120 &&
      kneeAngleRef.current < 160
    ) {
      showFeedback("ย่อตัวให้ต่ำกว่านี้");
    }
  };

  // ฟังก์ชันสำหรับการตรวจสอบท่า Burpee แบบผู้เชี่ยวชาญ
  const detectExpertBurpee = () => {
    if (!posesRef.current || posesRef.current.length === 0) return;

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
        if (exerciseType === "pushup") {
          setReps((prev) => prev + 1);
          showFeedback("ดีมาก!");
        }
        // เพิ่มเงื่อนความสำหรับ burpee-expert เพื่อไม่ให้นับเมื่อทำเพียงท่า push up
        else if (exerciseType === "burpee-expert") {
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
      if (exerciseType.includes("burpee")) {
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
        if (exerciseType === "burpee-expert") {
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

      // หยุดการสตรีมกล้อง
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        const tracks = stream.getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-2 md:p-8 gap-2 md:gap-4 bg-gray-100 w-full min-h-screen">
      <h1 className="text-xl md:text-3xl font-bold mb-2 md:mb-4">
        ระบบตรวจจับท่าออกกำลังกาย
      </h1>

      <div className="flex flex-wrap justify-center gap-2 mb-2 md:mb-4 w-full max-w-md md:max-w-lg">
        <select
          value={exerciseType}
          onChange={(e) => {
            setExerciseType(
              e.target.value as "pushup" | "burpee-beginner" | "burpee-expert"
            );
            setReps(0);
          }}
          className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 w-full md:w-auto"
        >
          <option value="pushup">Push Up</option>
          <option value="burpee-beginner">Burpee (ผู้เริ่มต้น)</option>
          <option value="burpee-expert">Burpee (ผู้เชี่ยวชาญ)</option>
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
        <h2 className="text-xl md:text-2xl font-semibold">
          {exerciseType === "pushup" && `จำนวน Push-up ที่ทำได้: ${reps}`}
          {exerciseType === "burpee-beginner" &&
            `จำนวน Burpee (ผู้เริ่มต้น) ที่ทำได้: ${reps}`}
          {exerciseType === "burpee-expert" &&
            `จำนวน Burpee (ผู้เชี่ยวชาญ) ที่ทำได้: ${reps}`}
        </h2>
        <p className="mt-1 md:mt-2 text-sm md:text-base text-black">
          ระบบจะนับจำนวนครั้งและตรวจสอบท่าทางของคุณอัตโนมัติ
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

        {isMobile && (
          <p className="mt-1 text-sm text-red-600 font-medium">
            คำแนะนำ: วางโทรศัพท์ในแนวตั้งและถอยห่างจากกล้องประมาณ 2-3 เมตร
          </p>
        )}
      </div>
      <div className="">version 0.1</div>
    </div>
  );
};

export default Home;
