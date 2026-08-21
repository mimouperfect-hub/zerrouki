import React, { useState } from 'react';
import { Clock, Calendar, X, Check, ShieldCheck, Sparkles, User, AlertCircle } from 'lucide-react';
import { api } from '../../api/client';
import { Employee, User as UserType } from '../../types';

interface EmployeeScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  systemUsers: UserType[];
  onScheduleUpdated: () => void;
}

const DAYS_OF_WEEK = ['الجمعة', 'السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

export const EmployeeScheduleModal: React.FC<EmployeeScheduleModalProps> = ({
  isOpen,
  onClose,
  employee,
  systemUsers,
  onScheduleUpdated
}) => {
  const [workStartTime, setWorkStartTime] = useState<string>(employee.workStartTime || '08:00');
  const [workEndTime, setWorkEndTime] = useState<string>(employee.workEndTime || '17:00');
  const [lateToleranceMinutes, setLateToleranceMinutes] = useState<number>(employee.lateToleranceMinutes || 15);
  const [selectedOffDays, setSelectedOffDays] = useState<string[]>(
    employee.offDays || (employee.restDayAr ? [employee.restDayAr] : ['الجمعة'])
  );
  const [selectedUserId, setSelectedUserId] = useState<string>(employee.userId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleOffDay = (day: string) => {
    setSelectedOffDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmitSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await api.updateEmployeeSchedule(employee.id, {
        workStartTime,
        workEndTime,
        offDays: selectedOffDays,
        lateToleranceMinutes,
        userId: selectedUserId || undefined
      });
      window.dispatchEvent(new CustomEvent('zerrouki_attendance_updated'));
      onScheduleUpdated();
      onClose();
    } catch (err: any) {
      alert(err.message || 'فشل حفظ تخصيص أوقات عمل الموظف');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200 dir-rtl">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#2E1065] via-[#3B0764] to-[#1E1B4B] text-white p-5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-400/20 rounded-2xl text-amber-300">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white">تخصيص ساعات العمل والعطل المخصصة للموظف</h3>
              <p className="text-xs text-purple-200 font-bold">{employee.fullNameAr} - {employee.positionAr}</p>
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
        <form onSubmit={handleSubmitSchedule} className="p-6 space-y-5 text-xs font-black text-purple-950">
          {/* Section 1: Working Hours */}
          <div className="p-4 bg-[#FFFBF7] rounded-2xl border border-amber-200 space-y-3">
            <h4 className="font-black text-xs text-purple-950 flex items-center gap-1.5 border-b border-amber-200 pb-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>ساعات أوقات الدوام اليومي والمهلة:</span>
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-slate-600 font-bold">وقت بداية الدوام صباحاً *</label>
                <input
                  type="time"
                  required
                  value={workStartTime}
                  onChange={(e) => setWorkStartTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-mono font-black text-purple-950 outline-none"
                />
              </div>

              <div>
                <label className="block mb-1 text-slate-600 font-bold">وقت نهاية الدوام / الانصراف *</label>
                <input
                  type="time"
                  required
                  value={workEndTime}
                  onChange={(e) => setWorkEndTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-mono font-black text-purple-950 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block mb-1 text-slate-600 font-bold">مهلة السماح بالتأخير قبل تسجيل (متأخر) *</label>
              <select
                value={lateToleranceMinutes}
                onChange={(e) => setLateToleranceMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-purple-950 outline-none"
              >
                <option value={0}>بدون مهلة (دقّة مباشرة 00:00)</option>
                <option value={10}>10 دقائق سماح</option>
                <option value={15}>15 دقيقة سماح (افتراضي)</option>
                <option value={30}>30 دقيقة سماح</option>
              </select>
            </div>
          </div>

          {/* Section 2: Off Days Checkboxes */}
          <div className="p-4 bg-[#FFFBF7] rounded-2xl border border-amber-200 space-y-2">
            <h4 className="font-black text-xs text-purple-950 flex items-center gap-1.5 border-b border-amber-200 pb-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              <span>أيام العطل الأسبوعية المخصصة للموظف:</span>
            </h4>
            <p className="text-[10px] text-slate-500 font-bold">
              اختر الأيام التي يعتبر فيها الموظف في راحة أسبوعية معتمدة:
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = selectedOffDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleOffDay(day)}
                    className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white shadow-xs'
                        : 'bg-white border border-amber-200 text-slate-600 hover:bg-amber-50'
                    }`}
                  >
                    <span>{day}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Link User Account */}
          <div>
            <label className="block mb-1 text-slate-600 font-black">ربط الموظف بحساب مستخدم في النظام (ليتمكن من مسح الـ QR من حسابه) *</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-purple-200 rounded-xl text-xs font-bold text-purple-950 outline-none"
            >
              <option value="">-- اختياري (غير مربوط بحساب محدد) --</option>
              {systemUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.username}) - {u.roleCode}
                </option>
              ))}
            </select>
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
              <span>حفظ وتطبيق التخصيص ✨</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
