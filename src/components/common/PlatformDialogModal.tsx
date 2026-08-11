import React from 'react';
import { CheckCircle2, AlertTriangle, Info, ShieldAlert, X, Sparkles } from 'lucide-react';

export type DialogVariant = 'success' | 'error' | 'warning' | 'info' | 'danger';

export interface PlatformDialogConfig {
  isOpen: boolean;
  type: 'ALERT' | 'CONFIRM';
  title: string;
  message: string;
  variant: DialogVariant;
  confirmText?: string;
  cancelText?: string;
}

interface PlatformDialogModalProps {
  config: PlatformDialogConfig;
  onConfirm: () => void;
  onCancel: () => void;
}

export const PlatformDialogModal: React.FC<PlatformDialogModalProps> = ({
  config,
  onConfirm,
  onCancel
}) => {
  if (!config.isOpen) return null;

  const getVariantStyles = () => {
    switch (config.variant) {
      case 'success':
        return {
          headerBg: 'bg-gradient-to-r from-emerald-950 via-teal-950 to-purple-950',
          iconBg: 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30',
          icon: <CheckCircle2 className="w-7 h-7 text-emerald-400" />,
          buttonBg: 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white shadow-emerald-500/20',
          accentBorder: 'border-emerald-200'
        };
      case 'danger':
      case 'error':
        return {
          headerBg: 'bg-gradient-to-r from-rose-950 via-purple-950 to-slate-950',
          iconBg: 'bg-rose-500/20 text-rose-300 border border-rose-400/30',
          icon: <ShieldAlert className="w-7 h-7 text-rose-400 animate-pulse" />,
          buttonBg: 'bg-gradient-to-r from-rose-600 via-rose-700 to-purple-950 hover:brightness-110 text-white shadow-rose-500/20',
          accentBorder: 'border-rose-200'
        };
      case 'warning':
        return {
          headerBg: 'bg-gradient-to-r from-amber-950 via-orange-950 to-purple-950',
          iconBg: 'bg-amber-400/20 text-amber-300 border border-amber-400/30',
          icon: <AlertTriangle className="w-7 h-7 text-amber-400" />,
          buttonBg: 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:brightness-110 text-white shadow-amber-500/20',
          accentBorder: 'border-amber-200'
        };
      case 'info':
      default:
        return {
          headerBg: 'bg-gradient-to-r from-purple-950 via-indigo-950 to-purple-900',
          iconBg: 'bg-purple-400/20 text-amber-300 border border-amber-400/30',
          icon: <Sparkles className="w-7 h-7 text-amber-300" />,
          buttonBg: 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:brightness-110 text-white shadow-amber-500/20',
          accentBorder: 'border-purple-200'
        };
    }
  };

  const style = getVariantStyles();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200 dir-rtl">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-purple-100 overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className={`${style.headerBg} text-white p-5 flex items-center justify-between`}>
          <div className="flex items-center gap-3.5">
            <div className={`p-2.5 rounded-2xl ${style.iconBg}`}>
              {style.icon}
            </div>
            <div>
              <h3 className="font-black text-lg text-white leading-tight">{config.title}</h3>
              <p className="text-[11px] text-purple-200 font-bold mt-0.5">منصة زروقي للتسيير والتجارة 🚀</p>
            </div>
          </div>
          
          <button
            onClick={onCancel}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          <p className="text-xs font-black text-purple-950 leading-relaxed bg-[#FFFBF7] p-4 rounded-2xl border border-amber-200/80">
            {config.message}
          </p>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {config.type === 'CONFIRM' && (
              <button
                type="button"
                onClick={onCancel}
                className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-black text-xs hover:bg-gray-50 transition-colors cursor-pointer"
              >
                {config.cancelText || 'إلغاء'}
              </button>
            )}

            <button
              type="button"
              onClick={onConfirm}
              className={`px-6 py-2.5 rounded-xl font-black text-xs shadow-md transition-all cursor-pointer ${style.buttonBg}`}
            >
              {config.confirmText || (config.type === 'CONFIRM' ? 'تأكيد الإجراء' : 'حسناً، موافق ✨')}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
