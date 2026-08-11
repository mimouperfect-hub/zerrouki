import React, { useState } from 'react';
import { Clock, Calendar, X, Check, FileText, UserCheck, AlertCircle } from 'lucide-react';
import { api } from '../../api/client';
import { Employee } from '../../types';

interface ManualAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  onRecordSaved: () => void;
}

export const ManualAttendanceModal: React.FC<ManualAttendanceModalProps> = ({
  isOpen,
  onClose,
  employees,
  onRecordSaved
}) => {
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employees[0]?.id || '');
  const [date, setDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [checkIn, setCheckIn] = useState<string>('08:00');
  const [checkOut, setCheckOut] = useState<string>('17:00');
  const [status, setStatus] = useState<'PRESENT' | 'LATE' | 'REST_DAY' | 'LEAVE' | 'ABSENT'>('PRESENT');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) {
      alert('يرجى اختيار الموظف');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.recordManualAttendance({
        employeeId: selectedEmpId,
        date,
        checkIn: status === 'ABSENT' || status === 'LEAVE' ? undefined : checkIn,
        checkOut: status === 'ABSENT' || status === 'LEAVE' ? undefined : checkOut,
        status,
        notes: notes.trim()
      });
      onRecordSaved();
      onClose();
    } catch (err: any) {
      alert(err.message || 'فشلت عملية حفظ تسجيل الحضور اليدوي');
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
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white">تسجيل حضور يدوي / تقديم عذر رسمي</h3>
              <p className="text-xs text-purple-200 font-bold">تعديل سجل الحضور لحفظ حقوق الموظفين وعدم ظلمهم</p>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 text-slate-600 font-bold">التاريخ *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-mono text-xs font-black outline-none"
              />
            </div>

            <div>
              <label className="block mb-1 text-slate-600 font-bold">حالة الحضور والإنصاف *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-bold text-xs outline-none"
              >
                <option value="PRESENT">حاضر بموعد الدوام 🟢</option>
                <option value="LATE">متأخر بعذر / بدون عذر 🟡</option>
                <option value="REST_DAY">عطلة أسبوعية معتمدة 🔵</option>
                <option value="LEAVE">إجازة مبررة / مرضية 🟣</option>
                <option value="ABSENT">غائب بدون مبرر 🔴</option>
              </select>
            </div>
          </div>

          {status !== 'ABSENT' && status !== 'LEAVE' && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <div>
                <label className="block mb-1 text-slate-600 font-bold">وقت الحضور (Check-In)</label>
                <input
                  type="time"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl font-mono font-black text-emerald-700 outline-none"
                />
              </div>

              <div>
                <label className="block mb-1 text-slate-600 font-bold">وقت الانصراف (Check-Out)</label>
                <input
                  type="time"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl font-mono font-black text-rose-600 outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block mb-1 text-slate-600 font-bold">بيان وتفاصيل العذر أو الملاحظات:</label>
            <textarea
              rows={2}
              placeholder="مثال: تم تسجيل الحضور يدوياً بسبب نسى الموظف هاتفه، أو إجازة مرضية معتمدة من مدير الفرع..."
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
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:brightness-110 text-white font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4 text-white" />
              <span>حفظ التسجيل اليدوي ✨</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
