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
      drawSkeleton(keypoints, ctx);

      // อัปเดตมุมข้อศอกและมุมหลัง
      updateArmAngle(keypoints);
      updateBackAngle(keypoints);

      // ตรวจสอบท่า Push-Up
      checkPushUpPosition(keypoints);

      // วาดเส้นแนะนำ
      if (showGuideLines) {
        drawGuideLines(keypoints, ctx);
      }
    }

    requestAnimationFrame(poseDetectionFrame);
  };

  // ฟังก์ชันคำนวณมุมข้อศอก (ปรับจากโค้ดตัวอย่าง)
  const updateArmAngle = (keypoints: Keypoint[]) => {
    const leftWrist = keypoints[9];
    const leftShoulder = keypoints[5];
    const leftElbow = keypoints[7];

    if (
      (leftWrist.score ?? 0) > 0.3 &&
      (leftElbow.score ?? 0) > 0.3 &&
      (leftShoulder.score ?? 0) > 0.3
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

  // ฟังก์ชันคำนวณมุมหลัง (ปรับจากโค้ดตัวอย่าง)
  const updateBackAngle = (keypoints: Keypoint[]) => {
    const leftShoulder = keypoints[5];
    const leftHip = keypoints[11];
    const leftKnee = keypoints[13];

    if (
      (leftShoulder.score ?? 0) > 0.3 &&
      (leftHip.score ?? 0) > 0.3 &&
      (leftKnee.score ?? 0) > 0.3
    ) {
      const angle =
        (Math.atan2(leftKnee.y - leftHip.y, leftKnee.x - leftHip.x) -
          Math.atan2(leftShoulder.y - leftHip.y, leftShoulder.x - leftHip.x)) *
        (180 / Math.PI);

      const normalizedAngle = angle % 180;
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

  // ฟังก์ชันตรวจสอบท่า Push-Up (ปรับจากโค้ดตัวอย่าง)
  const checkPushUpPosition = (keypoints: Keypoint[]) => {
    // ดึงจุดสำคัญที่ต้องใช้
    const nose = keypoints[0];
    const leftElbow = keypoints[7];
    const rightElbow = keypoints[8];

    // ตรวจสอบว่าจุดสำคัญมีความเชื่อมั่นเพียงพอ
    if (
      (nose.score ?? 0) < 0.3 ||
      (leftElbow.score ?? 0) < 0.3 ||
      (rightElbow.score ?? 0) < 0.3
    ) {
      return;
    }

    // คำนวณตำแหน่งเฉลี่ยของข้อศอกทั้งสองข้าง
    const avgElbowY = (leftElbow.y + rightElbow.y) / 2;

    // ตรวจสอบว่าจมูก (ศีรษะ) อยู่ต่ำกว่าข้อศอกหรือไม่
    const isHeadBelowElbows = nose.y > avgElbowY;

    // ตรวจสอบท่าขึ้น - ใช้มุมข้อศอกเป็นเกณฑ์เสริม
    if (
      Math.abs(elbowAngle) > 150 &&
      Math.abs(elbowAngle) < 200 &&
      !isHeadBelowElbows
    ) {
      if (downPositionRef.current) {
        // นับจำนวน push-up เมื่อเปลี่ยนจากท่าลงเป็นท่าขึ้น
        setPushupCount((prev) => prev + 1);

        // แจ้งจำนวนครั้งด้วยเสียง
        if ("speechSynthesis" in window) {
          const msg = new SpeechSynthesisUtterance(`${pushupCount + 1}`);
          window.speechSynthesis.speak(msg);
        }
      }

      upPositionRef.current = true;
      downPositionRef.current = false;
      setPushupState("up");
    }

    // ตรวจสอบท่าลง - ใช้ตำแหน่งของศีรษะเทียบกับข้อศอกเป็นหลัก
    if (!highlightBack && isHeadBelowElbows) {
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

    // อัปเดตสถานะล่าสุด
    setLastPushupState(pushupState);
  };

  // เพิ่มฟังก์ชันวาดเส้นแนะนำ
  const drawGuideLines = (
    keypoints: Keypoint[],
    ctx: CanvasRenderingContext2D
  ) => {
    // ตรวจสอบว่ามีจุดสำคัญครบหรือไม่
    const nose = keypoints[0];
    const leftShoulder = keypoints[5];
    const rightShoulder = keypoints[6];
    const leftHip = keypoints[11];
    const rightHip = keypoints[12];
    const leftAnkle = keypoints[15];
    const rightAnkle = keypoints[16];

    // ตรวจสอบว่าจุดสำคัญมีความเชื่อมั่นเพียงพอ
    const keyPointsConfident = [
      nose,
      leftShoulder,
      rightShoulder,
      leftHip,
      rightHip,
      leftAnkle,
      rightAnkle,
    ].every((point) => (point.score ?? 0) > 0.2);

    if (!keyPointsConfident) return;

    // คำนวณจุดกึ่งกลางของร่างกาย
    const shoulderX = (leftShoulder.x + rightShoulder.x) / 2;
    const hipX = (leftHip.x + rightHip.x) / 2;
    const ankleX = (leftAnkle.x + rightAnkle.x) / 2;

    // วาดเส้นแนวตรงที่ควรจะเป็นสำหรับท่า Push-Up ที่ถูกต้อง
    ctx.save();

    // เส้นแนวตรงของลำตัว (จากศีรษะถึงส้นเท้า)
    ctx.beginPath();
    ctx.moveTo(nose.x, nose.y);
    ctx.lineTo(shoulderX, (leftShoulder.y + rightShoulder.y) / 2);
    ctx.lineTo(hipX, (leftHip.y + rightHip.y) / 2);
    ctx.lineTo(ankleX, (leftAnkle.y + rightAnkle.y) / 2);

    ctx.strokeStyle = "rgba(255, 255, 0, 0.5)"; // สีเหลืองโปร่งใส
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]); // เส้นประ
    ctx.stroke();

    // วาดเส้นแนวนอนที่ควรจะเป็นเมื่อลงต่ำสุด
    const idealLowPosition = (leftHip.y + rightHip.y) / 2 + 20; // ปรับตามความเหมาะสม
    ctx.beginPath();
    ctx.moveTo(0, idealLowPosition);
    ctx.lineTo(ctx.canvas.width, idealLowPosition);

    ctx.strokeStyle = "rgba(255, 0, 0, 0.5)"; // สีแดงโปร่งใส
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]); // เส้นประ
    ctx.stroke();

    ctx.restore();

    // แสดงข้อความแนะนำ
    ctx.save();
    ctx.translate(ctx.canvas.width, 0);
    ctx.scale(-1, 1);

    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(ctx.canvas.width - 300, 230, 250, 30);
    ctx.fillStyle = "#FFFF33";
    ctx.font = "bold 16px Arial";
    ctx.fillText("เส้นเหลือง: แนวลำตัวควรตรง", ctx.canvas.width - 290, 250);

    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(ctx.canvas.width - 300, 270, 250, 30);
    ctx.fillStyle = "#FF5555";
    ctx.font = "bold 16px Arial";
    ctx.fillText("เส้นแดง: ระดับต่ำสุดที่ควรลง", ctx.canvas.width - 290, 290);

    ctx.restore();
  };

  const drawKeypoints = (
    keypoints: Keypoint[],
    ctx: CanvasRenderingContext2D
  ) => {
    keypoints.forEach((keypoint) => {
      const { x, y, score } = keypoint;
      if (score !== undefined && score > 0.2) {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = "Red";
        ctx.fill();
      }
    });
  };

  const drawSkeleton = (
    keypoints: Keypoint[],
    ctx: CanvasRenderingContext2D
  ) => {
    const adjacentPairs = poseDetection.util.getAdjacentPairs(
      poseDetection.SupportedModels.MoveNet
    );

    adjacentPairs.forEach(([i, j]) => {
      const kp1 = keypoints[i];
      const kp2 = keypoints[j];

      if (
        kp1.score !== undefined &&
        kp2.score !== undefined &&
        kp1.score > 0.2 &&
        kp2.score > 0.2
      ) {
        ctx.beginPath();
        ctx.moveTo(kp1.x, kp1.y);
        ctx.lineTo(kp2.x, kp2.y);

        // เน้นเส้นหลังถ้าหลังไม่ตรง
        if (
          highlightBack &&
          ((i === 5 && j === 11) || // leftShoulder to leftHip
            (i === 6 && j === 12) || // rightShoulder to rightHip
            (i === 11 && j === 13) || // leftHip to leftKnee
            (i === 12 && j === 14))
        ) {
          // rightHip to rightKnee
          ctx.strokeStyle = "Red";
          ctx.lineWidth = 3;
        } else {
          ctx.strokeStyle = "Green";
          ctx.lineWidth = 2;
        }

        ctx.stroke();
      }
    });
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
