import React, { useEffect, useState } from 'react';
import { QrCode, Printer, X, ShieldCheck, Sparkles, Building2, UserCheck } from 'lucide-react';
import QRCode from 'qrcode';
import { BrandLogo } from '../common/BrandLogo';
import { api } from '../../api/client';

interface ManagerAttendanceQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrToken?: string;
  storeName?: string;
}

export const ManagerAttendanceQRModal: React.FC<ManagerAttendanceQRModalProps> = ({
  isOpen,
  onClose,
  qrToken: propQrToken,
  storeName: propStoreName
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [activeStoreName, setActiveStoreName] = useState<string>(propStoreName || 'مؤسسة زروقي للحلويات');
  const [activeQrToken, setActiveQrToken] = useState<string>(propQrToken || 'ZERROUKI_ATTENDANCE_MAIN_STORE_2026');

  useEffect(() => {
    if (propStoreName) setActiveStoreName(propStoreName);
  }, [propStoreName]);

  useEffect(() => {
    if (propQrToken) setActiveQrToken(propQrToken);
  }, [propQrToken]);

  useEffect(() => {
    if (isOpen) {
      api.getSettings().then((s) => {
        if (s?.storeNameAr) {
          setActiveStoreName(s.storeNameAr);
        }
      }).catch(console.error);

      api.getManagerAttendanceQR().then((res) => {
        if (res?.storeName) setActiveStoreName(res.storeName);
        if (res?.qrToken) setActiveQrToken(res.qrToken);
      }).catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleSettingsUpdated = (e: any) => {
      if (e.detail?.storeNameAr) {
        setActiveStoreName(e.detail.storeNameAr);
      }
    };
    window.addEventListener('zerrouki_settings_updated', handleSettingsUpdated);
    return () => window.removeEventListener('zerrouki_settings_updated', handleSettingsUpdated);
  }, []);

  useEffect(() => {
    if (activeQrToken && isOpen) {
      QRCode.toDataURL(activeQrToken, {
        width: 320,
        margin: 2,
        color: {
          dark: '#2E1065',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'H'
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate QR Data URL:', err));
    }
  }, [activeQrToken, isOpen]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200 dir-rtl">
      {/* Print Styles for QR Poster */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-qr-area, #printable-qr-area * {
            visibility: visible !important;
          }
          #printable-qr-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            background: white !important;
            color: black !important;
            direction: rtl !important;
            text-align: center !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-purple-100 flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#2E1065] via-[#3B0764] to-[#1E1B4B] text-white p-5 flex items-center justify-between no-print shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-400/20 rounded-2xl text-amber-300">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white">رمز QR المعتمد لتسجيل حضور الموظفين</h3>
              <p className="text-xs text-purple-200 font-bold">رمز قياسي حقيقي قابل للمسح بأي كاميرا هاتف</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Poster Area */}
        <div className="p-6 overflow-y-auto flex-1 flex justify-center bg-slate-100">
          <div
            id="printable-qr-area"
            className="w-full bg-white p-8 rounded-3xl shadow-lg border-2 border-purple-900 text-center space-y-6 flex flex-col items-center justify-center"
          >
            {/* Store Branding Header */}
            <div className="flex flex-col items-center space-y-2 border-b-2 border-purple-100 pb-4 w-full">
              <div className="p-3 bg-gradient-to-tr from-[#2E1065] to-[#3B0764] rounded-2xl shadow-md border border-amber-300">
                <BrandLogo size="lg" />
              </div>
              <h1 className="text-2xl font-black text-purple-950">{activeStoreName}</h1>
              <p className="text-xs font-black text-amber-900 bg-amber-100 px-4 py-1 rounded-full border border-amber-200">
                نظام تسجيل الحضور والانصراف الذكي المعتمد 📌
              </p>
            </div>

            {/* Instruction Notice */}
            <div className="bg-[#FFFBF7] p-4 rounded-2xl border border-amber-200 text-xs font-black text-purple-950 space-y-1 w-full text-center">
              <div className="text-sm font-black text-purple-900 flex items-center justify-center gap-1.5">
                <UserCheck className="w-4 h-4 text-amber-500" />
                <span>تعليمات تسجيل الدخول والخروج اليومي للموظفين:</span>
              </div>
              <p className="text-slate-600 font-bold text-[11px]">
                يلزم جميع العمال والموظفين بفتح حساباتهم في النظام اليومي ومسح هذا الرمز مرتين يومياً (عند الحضور صباحاً وعند الانصراف).
              </p>
            </div>

            {/* QR Code Display Container */}
            <div className="p-6 bg-white border-4 border-purple-950 rounded-3xl shadow-xl inline-block relative">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Standard Scannable Attendance QR Code"
                  className="w-64 h-64 object-contain mx-auto rounded-xl shadow-2xs"
                />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center text-slate-400 font-bold text-xs">
                  جاري توليد رمز QR قياسي...
                </div>
              )}
              <div className="mt-3 text-[11px] font-black text-purple-900 bg-purple-50 px-3.5 py-1.5 rounded-full border border-purple-200 inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>رمز توثيق ذكي معتمد رسمياً</span>
              </div>
            </div>

            {/* Verification Footer */}
            <div className="border-t border-slate-200 pt-4 text-[11px] text-slate-500 font-bold space-y-1 w-full">
              <div>صادر عن إدارة المدير العام - {activeStoreName}</div>
              <div className="font-mono text-[10px] text-purple-900">تاريخ التحديث: {new Date().toLocaleDateString('ar-DZ')}</div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between no-print">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl border border-gray-300 font-black text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            إغلاق
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:brightness-110 text-white font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-white" />
            <span>طباعة الرمز الملصق (Print QR Poster) 🖨️</span>
          </button>
        </div>
      </div>
    </div>
  );
};
