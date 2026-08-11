import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, Flashlight, CheckCircle2, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';

interface CameraBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export const CameraBarcodeScannerModal: React.FC<CameraBarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setErrorMessage(null);
    setHasPermission(null);
    setScannedCode(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('متصفحك لا يدعم الوصول للكاميرا');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Rear camera for phone
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        startDetectionLoop();
      }
    } catch (err: any) {
      console.error('Failed to open camera:', err);
      setHasPermission(false);
      setErrorMessage(err.message || 'تعذر الوصول لكاميرا الهاتف، يرجى منح الإذن');
    }
  };

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const toggleFlashlight = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && (track.getCapabilities as any)?.torch) {
      try {
        const newStatus = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: newStatus }]
        });
        setTorchOn(newStatus);
      } catch (e) {
        console.error('Torch error:', e);
      }
    }
  };

  const startDetectionLoop = () => {
    let lastScanTime = 0;

    const detectFrame = async () => {
      const now = Date.now();

      // Check if BarcodeDetector is available natively in browser
      if ((window as any).BarcodeDetector && videoRef.current && videoRef.current.readyState === 4) {
        if (now - lastScanTime > 350) {
          try {
            const barcodeDetector = new (window as any).BarcodeDetector({
              formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e']
            });
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              if (code) {
                lastScanTime = now;
                setScannedCode(code);
                onScan(code);
                // Vibrate feedback on mobile if supported
                if (navigator.vibrate) navigator.vibrate(100);
              }
            }
          } catch (err) {
            // Scanner fallback loop continues
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(detectFrame);
    };

    detectFrame();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-purple-100 relative">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#2E1065] via-[#3B0764] to-[#1E1B4B] text-white p-4 flex items-center justify-between z-10 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-400/20 rounded-xl text-amber-300">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white">ماسح باركود كاميرا الهاتف</h3>
              <p className="text-[11px] text-purple-200 font-bold">وجه الكاميرا نحو باركود المنتج للبيع المباشر</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasPermission && (
              <button
                onClick={toggleFlashlight}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  torchOn
                    ? 'bg-amber-400 text-purple-950 border-amber-400 shadow-md'
                    : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                }`}
                title="تفعيل الفلاش"
              >
                <Flashlight className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Camera Stream Viewport */}
        <div className="relative w-full aspect-4/3 bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Scanner Viewfinder Box Overlay */}
          <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none">
            <div className="w-64 h-44 border-2 border-amber-400/90 rounded-3xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] flex flex-col justify-between p-2">
              {/* Corner Indicators */}
              <div className="flex justify-between">
                <div className="w-4 h-4 border-t-4 border-r-4 border-amber-400 rounded-tr-md" />
                <div className="w-4 h-4 border-t-4 border-l-4 border-amber-400 rounded-tl-md" />
              </div>

              {/* Animated Red Laser Scan Line */}
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_12px_#f43f5e] animate-pulse" />

              <div className="flex justify-between">
                <div className="w-4 h-4 border-b-4 border-r-4 border-amber-400 rounded-br-md" />
                <div className="w-4 h-4 border-b-4 border-l-4 border-amber-400 rounded-bl-md" />
              </div>
            </div>
          </div>

          {/* Permission / Error State */}
          {hasPermission === false && (
            <div className="absolute inset-0 bg-slate-900/95 text-white p-6 flex flex-col items-center justify-center text-center space-y-3 z-20">
              <AlertCircle className="w-12 h-12 text-rose-500" />
              <p className="text-sm font-black">{errorMessage || 'تعذر فتح كاميرا الجهاز'}</p>
              <p className="text-xs text-slate-300 font-bold">
                يرجى التأكد من السماح للموقع باستخدام الكاميرا في إعدادات متصفح الهاتف
              </p>
              <button
                onClick={startCamera}
                className="px-4 py-2 rounded-xl bg-amber-400 text-purple-950 font-black text-xs flex items-center gap-1.5 shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة المحاولة</span>
              </button>
            </div>
          )}
        </div>

        {/* Scan Status & Live Feedback Footer */}
        <div className="p-4 bg-[#FFF9F2] border-t border-purple-100 flex flex-col space-y-3">
          {scannedCode ? (
            <div className="p-3 bg-emerald-100 border border-emerald-200 rounded-2xl text-emerald-950 text-xs font-black flex items-center justify-between animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div>تم مسح الباركود بنجاح:</div>
                  <div className="font-mono text-sm text-emerald-800 font-black">{scannedCode}</div>
                </div>
              </div>
              <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
            </div>
          ) : (
            <div className="text-center text-xs font-black text-slate-600 flex items-center justify-center gap-2 py-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>الكاميرا نشطة.. اضبط الباركود داخل الإطار الأخضر</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-1">
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-purple-950 to-indigo-900 text-white font-black text-xs hover:brightness-110 shadow-md cursor-pointer"
            >
              إغلاق الكاميرا والعودة للبيع ✨
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
