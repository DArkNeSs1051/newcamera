"use client";

import * as poseDetection from "@tensorflow-models/pose-detection";
import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs";

import { useEffect, useRef, useState } from "react";
import { Keypoint } from "@tensorflow-models/pose-detection";

const Home = () => {
  const [pushupState, setPushupState] = useState("none"); // สถานะของ push-up
  const [pushupCount, setPushupCount] = useState(0); // ตัวนับจำนวน push-up
  const [lastPushupState, setLastPushupState] = useState("none"); // สถานะล่าสุด
  const [showGuideLines, setShowGuideLines] = useState(true); // สถานะการแสดงเส้นแนะนำ
  const [backAngle, setBackAngle] = useState(0); // มุมของหลัง
  const [elbowAngle, setElbowAngle] = useState(999); // มุมของข้อศอก
  const [highlightBack, setHighlightBack] = useState(false); // สถานะการเน้นหลัง
  const [backWarningGiven, setBackWarningGiven] = useState(false); // สถานะการแจ้งเตือนเรื่องหลัง

  // refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<poseDetection.PoseDetector | null>(null);

  // เพิ่มค่าเฉลี่ย่สำหรับความสูงของลำตัว
  const bodyHeightHistoryRef = useRef<number[]>([]);
  const MAX_HISTORY_LENGTH = 10; // จำนวนเฟรมที่เก็บประวัติ

  // เพิ่ม ref สำหรับเก็บสถานะ
  const upPositionRef = useRef(false);
  const downPositionRef = useRef(false);

  // เพิ่ม edges สำหรับการวาด skeleton
  const edgesRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const init = async () => {
      try {
        await tf.setBackend("webgl");
        await tf.ready();
        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
            enableSmoothing: true,
          }
        );
        detectorRef.current = detector;

        // กำหนด edges สำหรับการวาด skeleton
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

        // เปิดกล้อง
        if (navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: false,
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
          }
        }

        // แจ้งเตือนด้วยเสียงว่ากำลังโหลด
        if ("speechSynthesis" in window) {
          const msg = new SpeechSynthesisUtterance(
            "กำลังโหลด กรุณารอสักครู่..."
          );
          window.speechSynthesis.speak(msg);
        }

        requestAnimationFrame(poseDetectionFrame);
      } catch (error) {
        console.error(error);
      }
    };

    init();
  }, []);

  // ฟังก์ชันวนลูปดึง keypoints และวาด
  const poseDetectionFrame = async () => {
    if (
      !detectorRef.current ||
      !videoRef.current ||
      !canvasRef.current ||
      videoRef.current.readyState < 2
    ) {
      requestAnimationFrame(poseDetectionFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ตั้งขนาด canvas เท่ากับ video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // ตรวจจับท่าทาง
    const poses = await detectorRef.current.estimatePoses(video);

    // ล้าง canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // วาด video ลง canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // ถ้ามี keypoints
    if (poses.length > 0) {
      const keypoints = poses[0].keypoints;

      drawKeypoints(keypoints, ctx);
      drawSkeleton(keypoints, ctx, poses[0]);

      // อัปเดตมุมข้อศอกและมุมหลัง
      updateArmAngle(keypoints);
      updateBackAngle(keypoints);

      // ตรวจสอบท่า Push-Up
      inUpPosition(keypoints);
      inDownPosition(keypoints);

      // วาดเส้นแนำ
      if (showGuideLines) {
        drawGuideLines(keypoints, ctx);
      }
    }

    requestAnimationFrame(poseDetectionFrame);
  };

  // ฟังก์ชันคำนวณมุมข้อศอก (ปรับตามโค้ดตัวอย่าง)
  const updateArmAngle = (keypoints: Keypoint[]) => {
    const leftWrist = keypoints[9];
    const leftShoulder = keypoints[5];
    const leftElbow = keypoints[7];

    if (
      (leftWrist.score ?? 0) > 0.2 &&
      (leftElbow.score ?? 0) > 0.2 &&
      (leftShoulder.score ?? 0) > 0.2
    ) {
      const angle =
        (Math.atan2(leftWrist.y - leftElbow.y, leftWrist.x - leftElbow.x) -
          Math.atan2(
            leftShoulder.y - leftElbow.y,
            leftShoulder.x - leftElbow.x
          )) *
        (180 / Math.PI);

      setElbowAngle(angle);
    }
  };

  // ฟังก์ชันคำนวณมุมหลัง (ปรับตามโค้ดตัวอย่าง)
  const updateBackAngle = (keypoints: Keypoint[]) => {
    const leftShoulder = keypoints[5];
    const leftHip = keypoints[11];
    const leftKnee = keypoints[13];

    if (
      (leftShoulder.score ?? 0) > 0.2 &&
      (leftHip.score ?? 0) > 0.2 &&
      (leftKnee.score ?? 0) > 0.2
    ) {
      const angle =
        (Math.atan2(leftKnee.y - leftHip.y, leftKnee.x - leftHip.x) -
          Math.atan2(leftShoulder.y - leftHip.y, leftShoulder.x - leftHip.x)) *
        (180 / Math.PI);

      const normalizedAngle = Math.abs(angle % 180);
      setBackAngle(normalizedAngle);

      // ตรวจสอบความตรงของหลัง
      const isBackStraight = normalizedAngle < 20 || normalizedAngle > 160;
      setHighlightBack(!isBackStraight);

      // แจ้งเตือนถ้าหลังไม่ตรง
      if (!isBackStraight && !backWarningGiven) {
        if ("speechSynthesis" in window) {
          const msg = new SpeechSynthesisUtterance("รักษาหลังให้ตรง");
          window.speechSynthesis.speak(msg);
          setBackWarningGiven(true);
        }
      } else if (isBackStraight) {
        setBackWarningGiven(false);
      }
    }
  };

  // ฟังก์ชันตรวจสอบท่าขึ้น (ปรับตามโค้ดตัวอย่าง)
  const inUpPosition = (keypoints: Keypoint[]) => {
    if (elbowAngle > 170 && elbowAngle < 200) {
      if (downPositionRef.current) {
        // นับจำนวน push-up เมื่อเปลี่ยนจากท่าลงเป็นท่าขึ้น
        setPushupCount((prev) => {
          const newCount = prev + 1;
          if ("speechSynthesis" in window) {
            const msg = new SpeechSynthesisUtterance(`${newCount}`);
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(msg);
          }
          return newCount;
        });
      }

      upPositionRef.current = true;
      downPositionRef.current = false;
      setPushupState("up");
    }
  };

  // ฟังก์ชันตรวจสอบท่าลง (ปรับตามโค้ดตัวอย่าง)
  const inDownPosition = (keypoints: Keypoint[]) => {
    // ตรวจสอบว่าข้อศอกอยู่เหนือจมูกหรือไม่
    let elbowAboveNose = false;
    if (keypoints[0].y > keypoints[7].y) {
      elbowAboveNose = true;
    }

    // ตรวจสอบท่าลง - ใช้ตำแหน่งของศีรษะเทียบกับข้อศอก
    if (
      !highlightBack &&
      elbowAboveNose &&
      Math.abs(elbowAngle) > 70 &&
      Math.abs(elbowAngle) < 100
    ) {
      if (upPositionRef.current) {
        // แจ้งเตือนให้ขึ้น
        if ("speechSynthesis" in window) {
          const msg = new SpeechSynthesisUtterance("ขึ้น");
          window.speechSynthesis.speak(msg);
        }
      }

      downPositionRef.current = true;
      upPositionRef.current = false;
      setPushupState("down");
    }
  };

  // เพิ่มฟังก์ชันวาดเส้นแนำ
  const drawGuideLines = (
    keypoints: Keypoint[],
    ctx: CanvasRenderingContext2D
  ) => {
    // ... existing code ...
  };

  const drawKeypoints = (
    keypoints: Keypoint[],
    ctx: CanvasRenderingContext2D
  ) => {
    let count = 0;
    keypoints.forEach((keypoint) => {
      const { x, y, score } = keypoint;
      if (score !== undefined && score > 0.2) {
        count++;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = "Red";
        ctx.fill();
        ctx.strokeStyle = "White";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  };

  const drawSkeleton = (
    keypoints: Keypoint[],
    ctx: CanvasRenderingContext2D,
    pose: poseDetection.Pose
  ) => {
    const confidence_threshold = 0.5;
    const edges = edgesRef.current;

    for (const [key, value] of Object.entries(edges)) {
      const p = key.split(",");
      const p1 = parseInt(p[0]);
      const p2 = parseInt(p[1]);

      const y1 = keypoints[p1].y;
      const x1 = keypoints[p1].x;
      const c1 = keypoints[p1].score ?? 0;
      const y2 = keypoints[p2].y;
      const x2 = keypoints[p2].x;
      const c2 = keypoints[p2].score ?? 0;

      if (c1 > confidence_threshold && c2 > confidence_threshold) {
        if (
          highlightBack &&
          (p2 == 11 || (p1 == 6 && p2 == 12) || p2 == 13 || p1 == 12)
        ) {
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = "Red";
          ctx.lineWidth = 3;
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = "Green";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }
  };

  const calculateAngle = (a: Keypoint, b: Keypoint, c: Keypoint): number => {
    const ab = { x: b.x - a.x, y: b.y - a.y };
    const cb = { x: b.x - c.x, y: b.y - c.y };

    const dot = ab.x * cb.x + ab.y * cb.y;
    const magAB = Math.sqrt(ab.x ** 2 + ab.y ** 2);
    const magCB = Math.sqrt(cb.x ** 2 + cb.y ** 2);

    // ป้องกัน division by zero
    if (magAB === 0 || magCB === 0) return 0;

    const angleRad = Math.acos(
      Math.min(Math.max(dot / (magAB * magCB), -1), 1)
    );
    return (angleRad * 180) / Math.PI;
  };

  return (
    <div className="flex flex-1 p-8 gap-4 bg-gray-100 w-full h-full">
      <div className="relative flex flex-1 w-screen h-screen ">
        <video
          ref={videoRef}
          className="absolute top-0 left-0 object-contain w-full h-full"
          style={{ transform: "scaleX(-1)" }} // กล้องกลับภาพเหมือนกระจก
          muted
          playsInline
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 object-contain w-full h-full"
          style={{ transform: "scaleX(-1)" }}
        />

        {/* เพิ่มส่วนแสดงผลสถานะและจำนวน Push-Up */}
        <div className="absolute top-4 right-4 bg-black bg-opacity-70 p-4 rounded-lg text-white">
          <h2 className="text-xl font-bold mb-2">ท่า Push-Up</h2>
          <p className="text-lg">
            สถานะ:{" "}
            {pushupState === "up"
              ? "ขึ้น"
              : pushupState === "down"
              ? "ลง"
              : "ไม่ใช่ท่า Push-Up"}
          </p>
          <p className="text-lg">จำนวน: {pushupCount}</p>

          {/* แสดงคำเตือนเรื่องหลัง */}
          {highlightBack && (
            <p className="text-lg text-red-500 font-bold">
              คำเตือน: รักษาหลังให้ตรง
            </p>
          )}

          {/* เพิ่มปุ่มเปิด/ปิดเส้นแนำ */}
          <button
            className="mt-2 px-3 py-1 bg-blue-500 hover:bg-blue-600 rounded text-white"
            onClick={() => setShowGuideLines(!showGuideLines)}
          >
            {showGuideLines ? "ซ่อนเส้นแนำ" : "แสดงเส้นแนำ"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
