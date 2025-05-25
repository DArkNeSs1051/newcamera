"use client";

import { useEffect, useRef, useState } from "react";
import * as poseDetection from "@tensorflow-models/pose-detection";
import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs";
import { Keypoint } from "@tensorflow-models/pose-detection";

const Home = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reps, setReps] = useState(0);
  const [exerciseType, setExerciseType] = useState<'pushup' | 'burpee-beginner' | 'burpee-expert'>('pushup');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("กำลังโหลด กรุณารอสักครู่...");
  const [isMobile, setIsMobile] = useState(false);

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

  // ฟังก์ชันสำหรับการพูด
  // const speak = (text: string) => {
  //   const msg = new SpeechSynthesisUtterance(text);
  //   window.speechSynthesis.speak(msg);
  // };

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
      // speak("พร้อมสำหรับการตรวจจับท่า Push Up แล้ว");
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
      if (exerciseType === 'pushup') {
        inUpPosition();
        inDownPosition();
      } else if (exerciseType === 'burpee-beginner') {
        detectBeginnerBurpee();
      } else if (exerciseType === 'burpee-expert') {
        inUpPosition(); // ยังคงต้องตรวจจับท่า Push Up สำหรับ Burpee แบบผู้เชี่ยวชาญ
        inDownPosition();
        detectExpertBurpee();
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
    
    if (leftHip.score && leftHip.score > 0.2) {
      prevHipHeightRef.current = hipHeightRef.current;
      hipHeightRef.current = leftHip.y;
      
      // ตรวจจับการกระโดด (สะโพกเคลื่อนที่ขึ้นอย่างรวดเร็ว)
      const hipMovement = prevHipHeightRef.current - hipHeightRef.current;
      
      if (hipMovement > 30 && standingPositionRef.current) {
        jumpDetectedRef.current = true;
        setTimeout(() => {
          jumpDetectedRef.current = false;
        }, 500); // รีเซ็ตหลังจาก 0.5 วินาที
      }
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
    detectJump();
    detectSquatPosition();
    
    // ตรวจสอบลำดับท่าทาง: ยืน -> นั่งยอง -> กระโดด -> ยืน
    if (jumpDetectedRef.current && squatPositionRef.current) {
      if (standingPositionRef.current) {
        setReps((prev) => prev + 1);
        squatPositionRef.current = false;
      }
    }
  };

  // ฟังก์ชันสำหรับการตรวจสอบท่า Burpee แบบผู้เชี่ยวชาญ
  const detectExpertBurpee = () => {
    if (!posesRef.current || posesRef.current.length === 0) return;
    
    updateKneeAngle();
    detectJump();
    detectSquatPosition();
    
    // ตรวจสอบว่าอยู่ในท่า Push Up หรือไม่
    if (downPositionRef.current || upPositionRef.current) {
      pushupPositionRef.current = true;
    } else {
      pushupPositionRef.current = false;
    }
    
    // ตรวจสอบลำดับท่าทาง: ยืน -> นั่งยอง -> Push Up -> นั่งยอง -> กระโดด -> ยืน
    if (jumpDetectedRef.current && squatPositionRef.current && pushupPositionRef.current) {
      if (standingPositionRef.current) {
        setReps((prev) => prev + 1);
        squatPositionRef.current = false;
        pushupPositionRef.current = false;
      }
    }
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
        // ตัดระบบเสียงออก
        // speak("รักษาหลังให้ตรง");
        backWarningGivenRef.current = true;
      }
    }
  };

  // ฟังก์ชันสำหรับการตรวจสอบท่าขึ้น
  const inUpPosition = () => {
    if (elbowAngleRef.current > 170 && elbowAngleRef.current < 200) {
      if (downPositionRef.current === true) {
        // ตัดระบบเสียงออก
        // speak((reps + 1).toString());
        setReps((prev) => prev + 1);
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
        // ตัดระบบเสียงออก
        // speak("ขึ้น");
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
      let exerciseText = '';
      
      if (exerciseType === 'pushup') {
        exerciseText = `จำนวน Push-up ที่ทำได้: ${reps}`;
      } else if (exerciseType === 'burpee-beginner') {
        exerciseText = `จำนวน Burpee (ผู้เริ่มต้น) ที่ทำได้: ${reps}`;
      } else if (exerciseType === 'burpee-expert') {
        exerciseText = `จำนวน Burpee (ผู้เชี่ยวชาญ) ที่ทำได้: ${reps}`;
      }
      
      ctx.fillText(exerciseText, 20, 50);
      ctx.strokeText(exerciseText, 20, 50);
      
      // แสดงสถานะการตรวจจับ (สำหรับการดีบัก)
      if (exerciseType.includes('burpee')) {
        const statusText = `สถานะ: ${standingPositionRef.current ? 'ยืน' : ''} ${squatPositionRef.current ? 'ย่อตัว' : ''} ${jumpDetectedRef.current ? 'กระโดด' : ''} ${pushupPositionRef.current ? 'Push Up' : ''}`;
        ctx.font = "20px Arial";
        ctx.fillText(statusText, 20, 90);
        ctx.strokeText(statusText, 20, 90);
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
      // ตัดระบบเสียงออก
      // speak("กำลังโหลด กรุณารอสักครู่...");

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
        <button 
          onClick={() => { setExerciseType('pushup'); setReps(0); }}
          className={`px-3 py-2 rounded-lg ${exerciseType === 'pushup' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
        >
          Push Up
        </button>
        <button 
          onClick={() => { setExerciseType('burpee-beginner'); setReps(0); }}
          className={`px-3 py-2 rounded-lg ${exerciseType === 'burpee-beginner' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
        >
          Burpee (ผู้เริ่มต้น)
        </button>
        <button 
          onClick={() => { setExerciseType('burpee-expert'); setReps(0); }}
          className={`px-3 py-2 rounded-lg ${exerciseType === 'burpee-expert' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}
        >
          Burpee (ผู้เชี่ยวชาญ)
        </button>
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
          {exerciseType === 'pushup' && `จำนวน Push-up ที่ทำได้: ${reps}`}
          {exerciseType === 'burpee-beginner' && `จำนวน Burpee (ผู้เริ่มต้น) ที่ทำได้: ${reps}`}
          {exerciseType === 'burpee-expert' && `จำนวน Burpee (ผู้เชี่ยวชาญ) ที่ทำได้: ${reps}`}
        </h2>
        <p className="mt-1 md:mt-2 text-sm md:text-base text-gray-600">
          ระบบจะนับจำนวนครั้งและตรวจสอบท่าทางของคุณอัตโนมัติ
        </p>
        
        {exerciseType === 'pushup' && (
          <p className="mt-1 text-sm md:text-base text-gray-600">
            ให้แน่ใจว่าคุณอยู่ในระยะที่กล้องสามารถมองเห็นร่างกายทั้งหมดได้
          </p>
        )}
        
        {exerciseType === 'burpee-beginner' && (
          <p className="mt-1 text-sm md:text-base text-gray-600">
            ท่า Burpee สำหรับผู้เริ่มต้น: ยืน → ย่อตัว → กระโดด → ยืน
          </p>
        )}
        
        {exerciseType === 'burpee-expert' && (
          <p className="mt-1 text-sm md:text-base text-gray-600">
            ท่า Burpee สำหรับผู้เชี่ยวชาญ: ยืน → ย่อตัว → Push Up → ย่อตัว → กระโดด → ยืน
          </p>
        )}
        
        {isMobile && (
          <p className="mt-1 text-sm text-red-600 font-medium">
            คำแนะนำ: วางโทรศัพท์ในแนวตั้งและถอยห่างจากกล้องประมาณ 2-3 เมตร
          </p>
        )}
      </div>
    </div>
  );
};

export default Home;
