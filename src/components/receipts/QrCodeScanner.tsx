import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { X, Camera } from "lucide-react";

interface QrCodeScannerProps {
  onDetected: (data: string) => void;
  onClose: () => void;
}

export default function QrCodeScanner({
  onDetected,
  onClose,
}: QrCodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stopScanner = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (!isMounted) return;
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const scanLoop = () => {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (!video || !canvas) {
            rafRef.current = requestAnimationFrame(scanLoop);
            return;
          }

          const width = video.videoWidth || 640;
          const height = video.videoHeight || 480;
          if (width === 0 || height === 0) {
            rafRef.current = requestAnimationFrame(scanLoop);
            return;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            rafRef.current = requestAnimationFrame(scanLoop);
            return;
          }

          ctx.drawImage(video, 0, 0, width, height);
          const imageData = ctx.getImageData(0, 0, width, height);
          const result = jsQR(imageData.data, width, height);
          if (result?.data) {
            stopScanner();
            onDetected(result.data);
            return;
          }

          rafRef.current = requestAnimationFrame(scanLoop);
        };

        rafRef.current = requestAnimationFrame(scanLoop);
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setErrorMessage(
            "Nao foi possivel acessar a camera. Verifique as permissoes.",
          );
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [onDetected]);

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-slate-900 rounded-2xl p-4 w-full max-w-md border border-slate-700 relative">
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-3 right-3 rounded-xl p-2 text-slate-300 hover:text-slate-100 hover:bg-slate-800"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 text-slate-100 mb-3">
          <Camera size={18} />
          <p className="text-sm font-semibold">Ler QR Code da NFC-e</p>
        </div>

        {errorMessage ? (
          <div className="text-xs text-rose-300 bg-rose-900/30 border border-rose-700 rounded-md px-3 py-2">
            {errorMessage}
          </div>
        ) : (
          <div className="relative">
            <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-black">
              <video
                ref={videoRef}
                playsInline
                className="w-full h-full object-contain"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-2/3 h-2/3 border-2 border-emerald-400/80 rounded-xl" />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Alinhe o QR Code dentro do quadro para leitura automatica.
            </p>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
