import React, { useState } from 'react';
import { Award, ArrowDown, DollarSign, X, Check, FileText } from 'lucide-react';
import { api } from '../../api/client';
import { Employee } from '../../types';

interface BonusDeductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'BONUS' | 'DEDUCTION' | 'ADVANCE';
  employees: Employee[];
  onSuccess: () => void;
}

export const BonusDeductionModal: React.FC<BonusDeductionModalProps> = ({
  isOpen,
  onClose,
  type,
  employees,
  onSuccess
}) => {
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employees[0]?.id || '');
  const [amount, setAmount] = useState<number>(3000);
  const [reasonAr, setReasonAr] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const title =
    type === 'BONUS'
      ? 'إضافة مكافأة / منحة تميز للموظف 🎖️'
      : type === 'DEDUCTION'
      ? 'تسجيل خصم إداري على الموظف 🔻'
      : 'تسجيل سُلفة على الراتب 💸';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) {
      alert('يرجى اختيار الموظف');
      return;
    }
    if (amount <= 0) {
      alert('يرجى إدخال مبلغ أكبر من 0');
      return;
    }

    try {
      setIsSubmitting(true);
      if (type === 'BONUS') {
        await api.createBonus({ employeeId: selectedEmpId, amount, reasonAr: reasonAr || 'مكافأة تميز وأداء' });
      } else if (type === 'DEDUCTION') {
        await api.createDeduction({ employeeId: selectedEmpId, amount, reasonAr: reasonAr || 'خصم إداري' });
      } else if (type === 'ADVANCE') {
        await api.createAdvance({ employeeId: selectedEmpId, amount, reasonAr: reasonAr || 'سُلفة على الراتب' });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'فشلت العملية');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200 dir-rtl">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#2E1065] via-[#3B0764] to-[#1E1B4B] text-white p-5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-400/20 rounded-2xl text-amber-300">
              {type === 'BONUS' ? <Award className="w-6 h-6" /> : type === 'DEDUCTION' ? <ArrowDown className="w-6 h-6" /> : <DollarSign className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="font-black text-lg text-white">{title}</h3>
              <p className="text-xs text-purple-200 font-bold">تأثير مباشر ودقيق على كشف الأجر النهائي</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-black text-purple-950">
          <div>
            <label className="block mb-1 text-slate-600 font-bold">الموظف المعني *</label>
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full px-3 py-2 bg-[#FFFBF7] border border-amber-300 rounded-xl font-bold text-xs outline-none"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullNameAr} ({emp.positionAr})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-slate-600 font-bold">المبلغ بالدينار الجزائري (د.ج) *</label>
            <input
              type="number"
              required
              min={1}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-3 py-2 bg-[#FFFBF7] border border-amber-300 rounded-xl font-mono text-base font-black text-purple-950 outline-none"
            />
          </div>

          <div>
            <label className="block mb-1 text-slate-600 font-bold">سبب وبيان الإضافة / الاقتطاع *</label>
            <input
              type="text"
              placeholder={type === 'BONUS' ? 'مثال: منحة تحقيق أهداف المبيعات الأسبوعية' : 'مثال: اقتطاع تأخير أو سُلفة مالية مستلمة'}
              value={reasonAr}
              onChange={(e) => setReasonAr(e.target.value)}
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
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:brightness-110 text-white font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4 text-white" />
              <span>تأكيد وحفظ التغيير ✨</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
