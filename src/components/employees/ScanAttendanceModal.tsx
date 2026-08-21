import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, Check, Flashlight, RefreshCw, AlertCircle, Sparkles, SwitchCamera, QrCode } from 'lucide-react';
import jsQR from 'jsqr';
import { api } from '../../api/client';

interface ScanAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: () => void;
}

export const ScanAttendanceModal: React.FC<ScanAttendanceModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isProcessingRef = useRef<boolean>(false);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      setResultMessage(null);
      setScannedCode(null);
      setErrorMessage(null);
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    stopCamera();
    setErrorMessage(null);
    setHasPermission(null);
    isProcessingRef.current = false;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('متصفحك لا يدعم الوصول لكاميرا الفيديو المباشرة');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
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
      console.error('Failed to open camera for attendance QR scan:', err);
      setHasPermission(false);
      setErrorMessage(err.message || 'تعذر فتح الكاميرا، يرجى منح الإذن للوصول إلى الكاميرا من إعدادات المتصفح.');
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
    setTorchOn(false);
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

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleValidQRDetected = async (rawCode: string) => {
    if (isProcessingRef.current || isSubmitting) return;
    isProcessingRef.current = true;

    // Clean payload: if it is "ZERROUKI-ATTENDANCE-POINT:TOKEN"
    let token = rawCode.trim();
    if (token.startsWith('ZERROUKI-ATTENDANCE-POINT:')) {
      token = token.replace('ZERROUKI-ATTENDANCE-POINT:', '').trim();
    }

    // Check basic validity
    if (!token || (!token.includes('ZERROUKI_ATTENDANCE') && !token.includes('ZERROUKI'))) {
      setErrorMessage('رمز QR المقروء غير صالح لمحل زروقي. يرجى مسح رمز الحضور المعتمد المعلق عند المدخل.');
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 2500);
      return;
    }

    // Valid QR code scanned!
    setScannedCode(token);
    if (navigator.vibrate) navigator.vibrate(150);
    stopCamera();

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const res = await api.scanAttendanceQR(token);
      setResultMessage(res);
      onScanSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'فشلت عملية التحقق من رمز QR للحضور');
      isProcessingRef.current = false;
      // Restart camera on error so user can re-scan
      startCamera();
    } finally {
      setIsSubmitting(false);
    }
  };

  const startDetectionLoop = () => {
    let lastScanTime = 0;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const detectFrame = async () => {
      if (!streamRef.current || isProcessingRef.current) {
        return;
      }

      const now = Date.now();
      const video = videoRef.current;

      if (video && video.readyState === 4 && now - lastScanTime > 200) {
        lastScanTime = now;
        let detected = false;

        // 1. Try native BarcodeDetector if available
        if ((window as any).BarcodeDetector) {
          try {
            const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
            const barcodes = await detector.detect(video);
            if (barcodes && barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              if (code) {
                detected = true;
                handleValidQRDetected(code);
                return;
              }
            }
          } catch (e) {
            // Fallback to jsQR below
          }
        }

        // 2. Universal fallback engine: jsQR with HTML5 canvas
        if (!detected && ctx && video.videoWidth > 0 && video.videoHeight > 0) {
          try {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'attemptBoth'
            });

            if (qrCode && qrCode.data) {
              handleValidQRDetected(qrCode.data);
              return;
            }
          } catch (e) {
            // Frame skip
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(detectFrame);
    };

    animFrameRef.current = requestAnimationFrame(detectFrame);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200 dir-rtl">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-purple-100 relative max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#2E1065] via-[#3B0764] to-[#1E1B4B] text-white p-4 flex items-center justify-between z-10 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-400/20 rounded-xl text-amber-300">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white">ماسح رمز QR لتسجيل الحضور والانصراف</h3>
              <p className="text-[11px] text-purple-200 font-bold">وجّه الكاميرا نحو ملصق QR الرسمي المعتمد</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {hasPermission && !resultMessage && (
              <>
                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  className="p-2 rounded-xl bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all cursor-pointer"
                  title="تبديل الكاميرا (أمامية / خلفية)"
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>
                <button
                  type="button"
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
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 flex flex-col flex-1 overflow-y-auto">
          {resultMessage ? (
            <div className="p-6 bg-emerald-50 border-2 border-emerald-300 rounded-3xl text-center space-y-4 animate-in zoom-in-95 my-auto">
              <div className="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-lg ring-8 ring-emerald-100">
                <Check className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h4 className="font-black text-lg text-emerald-950">{resultMessage.message}</h4>
                <div className="p-3 bg-white/80 rounded-2xl border border-emerald-200 text-xs font-black text-emerald-900 space-y-1">
                  <div>الموظف: <span className="text-purple-950 font-black">{resultMessage.employeeName}</span></div>
                  <div>الإجراء: <span className="font-black text-purple-900">{resultMessage.action === 'CHECK_IN' ? 'تسجيل دخول (حضور صباحي) 🌅' : resultMessage.action === 'CHECK_OUT' ? 'تسجيل خروج (انصراف مسائي) 🌇' : 'مكتمل لهذا اليوم ✅'}</span></div>
                  {resultMessage.status && (
                    <div>الحالة: <span className="text-emerald-700">{
                      resultMessage.status === 'PRESENT' ? 'حاضر في الموعد 🟢' :
                      resultMessage.status === 'LATE' ? 'حاضر (متأخر) 🟡' :
                      resultMessage.status === 'REST_DAY' ? 'حضور في عطلة أسبوعية 🔵' : 'مسجل 🔴'
                    }</span></div>
                  )}
                  {resultMessage.checkIn && (
                    <div className="text-[11px] text-slate-600">وقت الحضور: {resultMessage.checkIn}</div>
                  )}
                  {resultMessage.checkOut && (
                    <div className="text-[11px] text-slate-600">وقت الانصراف: {resultMessage.checkOut} ({resultMessage.workingHours} ساعة)</div>
                  )}
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl font-black text-xs hover:brightness-110 shadow-md cursor-pointer transition-all active:scale-98"
              >
                حسناً، إغلاق النافذة ✨
              </button>
            </div>
          ) : (
            <div className="flex flex-col space-y-3 flex-1">
              {/* Live Video Viewport */}
              <div className="relative w-full aspect-4/3 bg-black rounded-2xl overflow-hidden flex items-center justify-center shadow-inner border-2 border-purple-900">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Viewfinder Target Overlay */}
                <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
                  <div className="w-56 h-56 border-2 border-amber-400/90 rounded-3xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] flex flex-col justify-between p-3">
                    {/* Top Corners */}
                    <div className="flex justify-between">
                      <div className="w-5 h-5 border-t-4 border-r-4 border-amber-400 rounded-tr-lg" />
                      <div className="w-5 h-5 border-t-4 border-l-4 border-amber-400 rounded-tl-lg" />
                    </div>

                    {/* Animated Scanning Laser Line */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-amber-300 to-transparent shadow-[0_0_12px_#fbbf24] animate-pulse" />

                    {/* Bottom Corners */}
                    <div className="flex justify-between">
                      <div className="w-5 h-5 border-b-4 border-r-4 border-amber-400 rounded-br-lg" />
                      <div className="w-5 h-5 border-b-4 border-l-4 border-amber-400 rounded-bl-lg" />
                    </div>
                  </div>
                </div>

                {/* Submitting Loading Overlay */}
                {isSubmitting && (
                  <div className="absolute inset-0 bg-purple-950/85 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-3 z-30 animate-in fade-in">
                    <RefreshCw className="w-10 h-10 text-amber-400 animate-spin" />
                    <div className="font-black text-sm text-amber-200">تم التقاط الرمز! جاري التحقق وتثبيت الحضور...</div>
                  </div>
                )}

                {/* Camera Permission / Error State */}
                {hasPermission === false && (
                  <div className="absolute inset-0 bg-slate-950/95 text-white p-5 flex flex-col items-center justify-center text-center space-y-3 z-20">
                    <AlertCircle className="w-10 h-10 text-rose-400" />
                    <p className="text-xs font-black text-rose-200">{errorMessage || 'تعذر فتح كاميرا الهاتف'}</p>
                    <p className="text-[11px] text-slate-300 font-bold">
                      يرجى السماح للمتصفح بالوصول إلى الكاميرا لمسح رمز الحضور
                    </p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-4 py-2 rounded-xl bg-amber-400 text-purple-950 font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer hover:brightness-110"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>إعادة محاولة تشغيل الكاميرا</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Status & Instructions */}
              <div className="bg-[#FFFBF7] p-3.5 rounded-2xl border border-amber-200/80 text-center space-y-1.5">
                <div className="flex items-center justify-center gap-2 text-xs font-black text-purple-950">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>الكاميرا نشطة وجاهزة للمسح المباشر 📷</span>
                </div>
                <p className="text-[11px] text-slate-600 font-bold">
                  وجّه الكاميرا نحو ملصق رمز QR المعلق عند مدخل المحل لتثبيت حضورك أو انصرافك تلقائياً وبشكل فوري.
                </p>
              </div>

              {/* Error Alert */}
              {errorMessage && hasPermission !== false && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-black flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
