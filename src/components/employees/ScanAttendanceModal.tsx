import React, { useState } from 'react';
import { QrCode, X, Check, Camera, Sparkles, UserCheck, AlertCircle, RefreshCw } from 'lucide-react';
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
  const [scannedCode, setScannedCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [resultMessage, setResultMessage] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleScanSubmit = async (tokenToUse?: string) => {
    const token = tokenToUse || scannedCode || 'ZERROUKI_ATTENDANCE_MAIN_STORE_2026';
    try {
      setIsScanning(true);
      setErrorMsg('');
      const res = await api.scanAttendanceQR(token);

      setResultMessage(res);
      onScanSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'فشلت عملية التحقق من رمز QR للحضور');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200 dir-rtl">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#2E1065] via-[#3B0764] to-[#1E1B4B] text-white p-5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-400/20 rounded-2xl text-amber-300">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white">ماسح رمز QR للحضور والانصراف اليومي</h3>
              <p className="text-xs text-purple-200 font-bold">امسح رمز المدير العام لتثبيت الحضور أو الخروج</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-xs font-black text-purple-950">
          {resultMessage ? (
            <div className="p-5 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-center space-y-3 animate-in zoom-in-95">
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                <Check className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-base text-emerald-900">{resultMessage.message}</h4>
                <p className="text-xs font-bold text-emerald-700 mt-1">
                  الموظف: {resultMessage.employeeName} | الحالة: {
                    resultMessage.status === 'PRESENT' ? 'حاضر في الوقت 🟢' :
                    resultMessage.status === 'LATE' ? 'متأخر 🟡' :
                    resultMessage.status === 'REST_DAY' ? 'حضور في عطلة أسبوعية 🔵' : 'مسجل 🔴'
                  }
                </p>
              </div>

              <button
                onClick={onClose}
                className="px-6 py-2 bg-emerald-700 text-white rounded-xl font-black text-xs hover:bg-emerald-800 shadow-xs cursor-pointer"
              >
                موافق وإغلاق النافذة
              </button>
            </div>
          ) : (
            <>
              {/* Camera Scanner Viewfinder Simulation */}
              <div className="p-6 bg-purple-950 rounded-2xl text-white text-center space-y-4 border-2 border-amber-400 shadow-inner">
                <div className="relative w-40 h-40 mx-auto border-4 border-dashed border-amber-400 rounded-2xl flex flex-col items-center justify-center bg-black/40 overflow-hidden">
                  <Camera className="w-12 h-12 text-amber-300 animate-pulse" />
                  <span className="text-[10px] font-mono text-purple-200 mt-2">كاميرا الماسح جاهزة...</span>
                  <div className="absolute inset-x-0 top-1/2 h-0.5 bg-amber-400 shadow-lg animate-ping" />
                </div>

                <p className="text-xs text-purple-200 font-bold">
                  قم بتوجيه الكاميرا إلى رمز QR المطبوع المعلق عند المدخل لتثبيت الحضور تلقائياً
                </p>

                <button
                  type="button"
                  disabled={isScanning}
                  onClick={() => handleScanSubmit()}
                  className="w-full py-3 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:brightness-110 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isScanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4 text-white" />}
                  <span>تأكيد مسح رمز QR وتثبيت الدخول/الخروج الآن 📷</span>
                </button>
              </div>

              {/* Manual Input Trigger */}
              <div className="pt-2">
                <label className="block mb-1 text-slate-500 font-bold">أو أدخل كود الرمز يدوياً للاختبار:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="ZERROUKI_ATTENDANCE_MAIN_STORE_2026"
                    value={scannedCode}
                    onChange={(e) => setScannedCode(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleScanSubmit()}
                    className="px-4 py-2 bg-purple-950 text-amber-300 rounded-xl font-black text-xs hover:bg-purple-900 cursor-pointer"
                  >
                    إرسال
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
