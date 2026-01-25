import React, { useEffect, useRef, useState } from "react";

type ReceiptCameraProps = {
  onCapture: (file: File) => void;
  onClose: () => void;
};

const ReceiptCamera: React.FC<ReceiptCameraProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    const startCamera = async () => {
      try {
        setError(null);
        setLoading(true);

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError("Este dispositivo/navegador não permite acesso à câmera.");
          setLoading(false);
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Não foi possível acessar a câmera. Verifique as permissões.");
        setLoading(false);
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleCapture = async () => {
    if (!videoRef.current) return;
    try {
      setCapturing(true);

      const video = videoRef.current;
      const canvas = document.createElement("canvas");

      canvas.width = video.videoWidth || 1080;
      canvas.height = video.videoHeight || 1920;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setCapturing(false);
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9)
      );

      if (!blob) {
        setCapturing(false);
        return;
      }

      const file = new File([blob], `receipt-camera-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      onCapture(file);
      setCapturing(false);
    } catch (err) {
      console.error(err);
      setCapturing(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 bg-slate-900/80 border border-slate-700 rounded-xl p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100">
          Tirar foto do cupom
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-xs px-2 py-1 rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700"
        >
          Fechar
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-400 bg-red-900/30 border border-red-700 rounded-md px-2 py-1">
          {error}
        </div>
      )}

      <div className="relative w-full rounded-lg overflow-hidden bg-black aspect-[3/4]">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-xs">
            Abrindo câmera...
          </div>
        )}
        <video
          ref={videoRef}
          playsInline
          className="w-full h-full object-contain"
        />
      </div>

      <button
        type="button"
        onClick={handleCapture}
        disabled={capturing || loading || !!error}
        className="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 text-white text-sm font-semibold"
      >
        {capturing ? "Capturando..." : "Capturar foto do cupom"}
      </button>

      <p className="text-[11px] text-slate-400">
        Dica: alinhe o cupom inteiro na tela, com boa iluminação, e evite
        reflexos fortes.
      </p>
    </div>
  );
};

export default ReceiptCamera;
