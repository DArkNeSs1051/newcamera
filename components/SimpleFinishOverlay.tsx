// components/SimpleFinishOverlay.tsx
import * as React from "react";

type Props = {
  title?: string;
  message?: string;
  onRestart?: () => void;
  onClose?: () => void;
};

const SimpleFinishOverlay: React.FC<Props> = ({
  title = "เยี่ยมมาก! วันนี้คุณทำครบแล้ว",
  message = "ออกกำลังกายเสร็จแล้ว โปรดกลับมาใหม่ในวันพรุ่งนี้",
  onRestart,
  onClose,
}) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 text-white">
      <div className="w-[92%] max-w-md bg-gray-900/80 rounded-2xl shadow-2xl border border-white/10 p-6 text-center">
        <div className="mx-auto mb-3 w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9 text-green-400">
            <path fillRule="evenodd" d="M2.25 12a9.75 9.75 0 1119.5 0 9.75 9.75 0 01-19.5 0zm14.03-2.53a.75.75 0 00-1.06-1.06l-4.72 4.72-1.72-1.72a.75.75 0 10-1.06 1.06l2.25 2.25a.75.75 0 001.06 0l5.25-5.25z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight mb-1">{title}</h2>
        <p className="text-sm text-gray-300">{message}</p>

        {(onRestart || onClose) && (
          <div className="mt-6 flex items-center justify-center gap-3">
            {onRestart && (
              <button
                onClick={onRestart}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 transition font-medium"
              >
                เริ่มใหม่
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition font-medium"
              >
                ปิด
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleFinishOverlay;
