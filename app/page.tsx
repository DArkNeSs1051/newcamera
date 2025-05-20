"use client";

import * as poseDetection from "@tensorflow-models/pose-detection";
import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs";

import { useEffect, useRef, useState } from "react";
import { Keypoint } from "@tensorflow-models/pose-detection";

const Home = () => {
  const [pushupState, setPushupState] = useState("none"); // เพิ่มสถานะของ push-up
  const [pushupCount, setPushupCount] = useState(0); // เพิ่มตัวนับจำนวน push-up
  const [lastPushupState, setLastPushupState] = useState("none"); // เก็บสถานะล่าสุดเพื่อตรวจจับการเปลี่ยนแปลง
  const [showGuideLines, setShowGuideLines] = useState(true); // เพิ่มสถานะการแสดงเส้นแนำเส้นแนะนำ

  // refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<poseDetection.PoseDetector | null>(null);

  // เพิ่มค่าเฉลี่ย่สำหรับความสูงของลำตัว
  const bodyHeightHistoryRef = useRef<number[]>([]);
  const MAX_HISTORY_LENGTH = 10; // จำนวนเฟรมที่เก็บประวัติ

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

    // วาด video ลง canvas (ถ้าต้องการซ้อนทับ)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // ถ้ามี keypoints
    if (poses.length > 0) {
      const keypoints = poses[0].keypoints;

      drawKeypoints(keypoints, ctx);
      drawSkeleton(keypoints, ctx);

      // ตรวจจับท่า Push-Up
      detectPushUp(keypoints, ctx);

      // วาดเส้นแนะนำเส้นแนะนำ
      if (showGuideLines) {
        drawGuideLines(keypoints, ctx);
      }

      // ฟังก์ชันสำหรับแสดงข้อความมุมองศา
      const displayAngle = (
        text: string,
        x: number,
        y: number,
        color: string = "#FF5733"
      ) => {
        ctx.save();

        // พลิก canvas แนวนอน (mirror) เพื่อให้ตัวอักษรไม่กลับด้าน
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);

        // สร้างพื้นหลังสำหรับข้อความเพื่อให้อ่านง่ายขึ้น
        const textWidth = ctx.measureText(text).width;
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(canvas.width - x - 5, y - 20, textWidth + 10, 30);

        // แสดงข้อความ
        ctx.fillStyle = color;
        ctx.font = "bold 20px Arial";
        ctx.fillText(text, canvas.width - x, y);

        ctx.restore();
      };

      // คำนวณและแสดงมุมข้อศอกซ้าย (left elbow)
      // จุดที่สนใจ: leftShoulder(5), leftElbow(7), leftWrist(9)
      const leftShoulder = keypoints[5];
      const leftElbow = keypoints[7];
      const leftWrist = keypoints[9];

      if (
        (leftShoulder.score ?? 0) > 0.2 &&
        (leftElbow.score ?? 0) > 0.2 &&
        (leftWrist.score ?? 0) > 0.2
      ) {
        const angle = calculateAngle(leftShoulder, leftElbow, leftWrist);
        displayAngle(
          `ข้อศอกซ้าย: ${angle.toFixed(0)}°`,
          leftElbow.x - 10,
          leftElbow.y,
          "#FF5733" // สีส้มแดง
        );
      }

      // คำนวณและแสดงมุมข้อศอกขวา (right elbow)
      // จุดที่สนใจ: rightShoulder(6), rightElbow(8), rightWrist(10)
      const rightShoulder = keypoints[6];
      const rightElbow = keypoints[8];
      const rightWrist = keypoints[10];

      if (
        (rightShoulder.score ?? 0) > 0.2 &&
        (rightElbow.score ?? 0) > 0.2 &&
        (rightWrist.score ?? 0) > 0.2
      ) {
        const angle = calculateAngle(rightShoulder, rightElbow, rightWrist);
        displayAngle(
          `ข้อศอกขวา: ${angle.toFixed(0)}°`,
          rightElbow.x - 10,
          rightElbow.y,
          "#33A1FF" // สีฟ้า
        );
      }

      // คำนวณและแสดงมุมหัวเข่าซ้าย (left knee)
      // จุดที่สนใจ: leftHip(11), leftKnee(13), leftAnkle(15)
      const leftHip = keypoints[11];
      const leftKnee = keypoints[13];
      const leftAnkle = keypoints[15];

      if (
        (leftHip.score ?? 0) > 0.2 &&
        (leftKnee.score ?? 0) > 0.2 &&
        (leftAnkle.score ?? 0) > 0.2
      ) {
        const angle = calculateAngle(leftHip, leftKnee, leftAnkle);
        displayAngle(
          `หัวเข่าซ้าย: ${angle.toFixed(0)}°`,
          leftKnee.x - 10,
          leftKnee.y,
          "#33FF57" // สีเขียว
        );
      }

      // คำนวณและแสดงมุมหัวเข่าขวา (right knee)
      // จุดที่สนใจ: rightHip(12), rightKnee(14), rightAnkle(16)
      const rightHip = keypoints[12];
      const rightKnee = keypoints[14];
      const rightAnkle = keypoints[16];

      if (
        (rightHip.score ?? 0) > 0.2 &&
        (rightKnee.score ?? 0) > 0.2 &&
        (rightAnkle.score ?? 0) > 0.2
      ) {
        const angle = calculateAngle(rightHip, rightKnee, rightAnkle);
        displayAngle(
          `หัวเข่าขวา: ${angle.toFixed(0)}°`,
          rightKnee.x - 10,
          rightKnee.y,
          "#F3FF33" // สีเหลือง
        );
      }
    }

    requestAnimationFrame(poseDetectionFrame);
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
    ctx.fillRect(ctx.canvas.width - 300, 150, 250, 30);
    ctx.fillStyle = "#FFFF33";
    ctx.font = "bold 16px Arial";
    ctx.fillText("เส้นเหลือง: แนวลำตัวควรตรง", ctx.canvas.width - 290, 170);

    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(ctx.canvas.width - 300, 190, 250, 30);
    ctx.fillStyle = "#FF5555";
    ctx.font = "bold 16px Arial";
    ctx.fillText("เส้นแดง: ระดับต่ำสุดที่ควรลง", ctx.canvas.width - 290, 210);

    ctx.restore();
  };

  // เพิ่มฟังก์ชันตรวจจับท่า Push-Up
  const detectPushUp = (
    keypoints: Keypoint[],
    ctx: CanvasRenderingContext2D
  ) => {
    // ตรวจสอบว่ามีจุดสำคัญครบหรือไม่
    const nose = keypoints[0];
    const leftShoulder = keypoints[5];
    const rightShoulder = keypoints[6];
    const leftElbow = keypoints[7];
    const rightElbow = keypoints[8];
    const leftWrist = keypoints[9];
    const rightWrist = keypoints[10];
    const leftHip = keypoints[11];
    const rightHip = keypoints[12];
    const leftKnee = keypoints[13];
    const rightKnee = keypoints[14];
    const leftAnkle = keypoints[15];
    const rightAnkle = keypoints[16];

    // ตรวจสอบว่าจุดสำคัญมีความเชื่อมั่นเพียงพอ (ลดความเข้มงวดลงจาก 0.2 เป็น 0.15)
    const keyPointsConfident = [
      nose,
      leftShoulder,
      rightShoulder,
      leftElbow,
      rightElbow,
      leftWrist,
      rightWrist,
      leftHip,
      rightHip,
      leftKnee,
      rightKnee,
      leftAnkle,
      rightAnkle,
    ].every((point) => (point.score ?? 0) > 0.15);

    if (!keyPointsConfident) {
      setPushupState("none");
      return;
    }

    // คำนวณมุมข้อศอกทั้งสองข้าง
    const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightElbowAngle = calculateAngle(
      rightShoulder,
      rightElbow,
      rightWrist
    );

    // คำนวณความสูงของลำตัว (ระยะห่างระหว่างจมูกกับสะโพก)
    const leftHipY = leftHip.y;
    const rightHipY = rightHip.y;
    const hipY = (leftHipY + rightHipY) / 2;
    const bodyHeight = nose.y - hipY;

    // เก็บประวัติความสูงของลำตัว
    bodyHeightHistoryRef.current.push(bodyHeight);
    if (bodyHeightHistoryRef.current.length > MAX_HISTORY_LENGTH) {
      bodyHeightHistoryRef.current.shift();
    }

    // คำนวณค่าเฉลี่ยความสูงของลำตัว
    const avgBodyHeight =
      bodyHeightHistoryRef.current.reduce((sum, height) => sum + height, 0) /
      bodyHeightHistoryRef.current.length;

    // ตรวจสอบความตรงของลำตัว (ควรเป็นเส้นตรงจากส้นเท้าถึงศีรษะ)
    const leftAnkleX = leftAnkle.x;
    const rightAnkleX = rightAnkle.x;
    const ankleX = (leftAnkleX + rightAnkleX) / 2;

    const leftShoulderX = leftShoulder.x;
    const rightShoulderX = rightShoulder.x;
    const shoulderX = (leftShoulderX + rightShoulderX) / 2;

    const leftHipX = leftHip.x;
    const rightHipX = rightHip.x;
    const hipX = (leftHipX + rightHipX) / 2;

    // คำนวณความเบี่ยงเบนของลำตัว (ควรน้อยกว่าค่าที่กำหนด)
    const bodyAlignment = Math.abs(shoulderX - hipX) + Math.abs(hipX - ankleX);
    const isBodyStraight = bodyAlignment < 70; // เพิ่มค่าจาก 50 เป็น 70 เพื่อลดความเข้มงวด

    // กำหนดเกณฑ์สำหรับท่า Push-Up (ลดความเข้มงวดลง)
    const isDown =
      (leftElbowAngle < 110 || rightElbowAngle < 110) && // เพิ่มจาก 100 เป็น 110
      avgBodyHeight < -15 && // เปลี่ยนจาก -20 เป็น -15
      isBodyStraight;
    const isUp =
      (leftElbowAngle > 140 || rightElbowAngle > 140) && // ลดจาก 150 เป็น 140
      avgBodyHeight > -5 && // เปลี่ยนจาก 0 เป็น -5
      isBodyStraight;

    // อัปเดตสถานะ Push-Up
    let newPushupState = "none";
    if (isDown) {
      newPushupState = "down";
    } else if (isUp) {
      newPushupState = "up";
    }

    // ตรวจสอบการเปลี่ยนแปลงสถานะและนับจำนวน Push-Up
    if (lastPushupState === "down" && newPushupState === "up") {
      setPushupCount((prev) => prev + 1);
    }

    // อัปเดตสถานะ
    setPushupState(newPushupState);
    setLastPushupState(newPushupState);

    // แสดงสถานะและจำนวน Push-Up บนหน้าจอ
    ctx.save();
    ctx.translate(ctx.canvas.width, 0);
    ctx.scale(-1, 1);

    // แสดงสถานะ Push-Up
    const statusText = `สถานะ: ${
      newPushupState === "up"
        ? "ขึ้น"
        : newPushupState === "down"
        ? "ลง"
        : "ไม่ใช่ท่า Push-Up"
    }`;
    const statusWidth = ctx.measureText(statusText).width;
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(ctx.canvas.width - 200, 50, statusWidth + 20, 30);
    ctx.fillStyle =
      newPushupState === "up"
        ? "#33FF57"
        : newPushupState === "down"
        ? "#FF5733"
        : "#FFFFFF";
    ctx.font = "bold 20px Arial";
    ctx.fillText(statusText, ctx.canvas.width - 190, 70);

    // แสดงจำนวน Push-Up
    const countText = `จำนวน Push-Up: ${pushupCount}`;
    const countWidth = ctx.measureText(countText).width;
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(ctx.canvas.width - 200, 100, countWidth + 20, 30);
    ctx.fillStyle = "#33A1FF";
    ctx.font = "bold 20px Arial";
    ctx.fillText(countText, ctx.canvas.width - 190, 120);

    // แสดงคำแนะนำเพิ่มเติม
    if (newPushupState !== "none") {
      let feedbackText = "";

      // ตรวจสอบความตรงของลำตัว
      if (!isBodyStraight) {
        feedbackText = "ลำตัวควรตรงกว่านี้";
      }
      // ตรวจสอบมุมข้อศอก
      else if (
        newPushupState === "down" &&
        leftElbowAngle > 110 &&
        rightElbowAngle > 110
      ) {
        feedbackText = "ลงให้ต่ำกว่านี้ (งอข้อศอกมากขึ้น)";
      } else if (
        newPushupState === "up" &&
        leftElbowAngle < 140 &&
        rightElbowAngle < 140
      ) {
        feedbackText = "ขึ้นให้สุดกว่านี้ (เหยียดแขนมากขึ้น)";
      }

      if (feedbackText) {
        const feedbackWidth = ctx.measureText(feedbackText).width;
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(ctx.canvas.width - 200, 150, feedbackWidth + 20, 30);
        ctx.fillStyle = "#FFFF33"; // สีเหลือง
        ctx.font = "bold 20px Arial";
        ctx.fillText(feedbackText, ctx.canvas.width - 190, 170);
      }
    }

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
        ctx.strokeStyle = "Green";
        ctx.lineWidth = 2;
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

          {/* เพิ่มปุ่มเปิด/ปิดเส้นแนะนำ */}
          <button
            className="mt-2 px-3 py-1 bg-blue-500 hover:bg-blue-600 rounded text-white"
            onClick={() => setShowGuideLines(!showGuideLines)}
          >
            {showGuideLines ? "ซ่อนเส้นแนะนำ" : "แสดงเส้นแนะนำ"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
