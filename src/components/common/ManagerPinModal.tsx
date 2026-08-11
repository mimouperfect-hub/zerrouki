import React, { useState } from 'react';
import { Lock, ShieldAlert, KeyRound, X } from 'lucide-react';
import { api } from '../../api/client';

interface ManagerPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (pin?: string) => void;
  titleAr?: string;
  descriptionAr?: string;
}

export const ManagerPinModal: React.FC<ManagerPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  titleAr = 'مطلوب موافقة المدير',
  descriptionAr = 'الرجاء إدخال رمز الـ PIN الخاص بالمدير لإتمام هذه العملية الحساسة'
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return;
    setLoading(true);
    setError(null);

    try {
      await api.verifyPin(pin);
      const verifiedPin = pin;
      setPin('');
      onSuccess(verifiedPin);
      onClose();
    } catch (err: any) {
      setError(err.message || 'رمز PIN غير صحيح');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-purple-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#2E1065] via-[#3B0764] to-[#1E1B4B] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-400/20 rounded-xl text-amber-300">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white">{titleAr}</h3>
              <p className="text-xs text-purple-200 font-bold">نظام حماية وسجل التدقيق Manager Approval</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-black border border-rose-200 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <p className="text-xs text-slate-600 font-bold leading-relaxed">{descriptionAr}</p>

          <div>
            <label className="block text-xs font-black text-purple-950 mb-1.5">
              رمز الـ PIN الخاص بالمدير (الافتراضي: 1234)
            </label>
            <input
              type="password"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              autoFocus
              className="w-full text-center text-2xl tracking-[0.5em] font-mono px-4 py-3 rounded-xl border border-amber-200 focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition-all font-black bg-[#FFFBF7]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-black text-xs hover:bg-gray-50 transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading || !pin}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:brightness-110 text-white font-black text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'جاري التحقق...' : 'تأكيد الاعتماد ✨'}
              <Lock className="w-4 h-4 text-white" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
