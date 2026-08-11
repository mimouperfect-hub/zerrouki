import React, { useState } from 'react';
import { DollarSign, X, Check, RefreshCw, Sparkles, Building2 } from 'lucide-react';
import { api } from '../../api/client';
import { Supplier } from '../../types';

interface PaySupplierDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier;
  onPaymentSuccess: () => void;
}

export const PaySupplierDebtModal: React.FC<PaySupplierDebtModalProps> = ({
  isOpen,
  onClose,
  supplier,
  onPaymentSuccess
}) => {
  const [paymentAmount, setPaymentAmount] = useState<number>(supplier.totalDebt || 0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'BANK_TRANSFER'>('CASH');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentAmount <= 0) {
      alert('يرجى إدخال مبلغ تسديد أكبر من 0');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.paySupplierDebt(supplier.id, paymentAmount);
      onPaymentSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'فشلت عملية تسديد دين المورد');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-200 dir-rtl">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#2E1065] via-[#3B0764] to-[#1E1B4B] text-white p-5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-400/20 rounded-2xl text-amber-300">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white">تسديد مستحقات ودين المورد</h3>
              <p className="text-xs text-purple-200 font-bold">إصدار سند دفع وتسديد دين حساب المورد</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmitPayment} className="p-6 space-y-4 text-xs font-black text-purple-950">
          {/* Supplier Info Badge */}
          <div className="p-3.5 bg-[#FFFBF7] rounded-2xl border border-amber-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-bold">اسم المورد / الشركة:</span>
              <span className="text-purple-950 font-black text-sm">{supplier.nameAr}</span>
            </div>
            {supplier.companyName && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">الشركة التوزيعية:</span>
                <span className="text-slate-700">{supplier.companyName}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-amber-200 pt-1 mt-1">
              <span className="text-rose-600 font-black">إجمالي الدين المستحق للمورد:</span>
              <span className="font-mono text-sm text-rose-700 font-black">
                {supplier.totalDebt.toLocaleString()} د.ج
              </span>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block mb-1 text-slate-600">المبلغ المراد تسديده للمورد (د.ج) *</label>
            <input
              type="number"
              required
              min={1}
              max={supplier.totalDebt || 99999999}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(Number(e.target.value))}
              className="w-full px-3 py-2 bg-[#FFFBF7] border border-amber-300 rounded-xl text-base font-mono font-black text-emerald-700 outline-none"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block mb-1 text-slate-600">طريقة الدفع والتسديد *</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-purple-950 outline-none"
            >
              <option value="CASH">نقداً من الخزينة (Cash)</option>
              <option value="BANK_TRANSFER">تحويل بنكي / شيك (Bank Transfer)</option>
              <option value="CARD">بطاقة بنكية (Card)</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block mb-1 text-slate-600">ملاحظات تسديد الدين (اختياري):</label>
            <input
              type="text"
              placeholder="مثال: تسديد دفعة شحنة الأسبوع السابق بشيك بنكي"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
            />
          </div>

          {/* Footer CTAs */}
          <div className="pt-3 border-t border-purple-100 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl border border-gray-300 font-black text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting || paymentAmount <= 0}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:brightness-110 text-white font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-white" />}
              <span>تأكيد وتسديد الدين ({paymentAmount.toLocaleString()} د.ج) ✨</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
