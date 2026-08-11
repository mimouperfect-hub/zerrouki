import React, { useEffect, useState } from 'react';
import {
  UserCheck, DollarSign, Printer, Plus, Award, ArrowDown, FileText, Clock,
  Wallet, AlertCircle, RefreshCw, Search, Check, Sparkles, TrendingUp
} from 'lucide-react';
import jsPDF from 'jspdf';
import { api } from '../../api/client';
import { PayslipModal } from '../common/PayslipModal';
import { BonusDeductionModal } from './BonusDeductionModal';
import { Employee } from '../../types';

export const PayrollView: React.FC = () => {
  const [payrollSummary, setPayrollSummary] = useState<any>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Payslip Modal state
  const [selectedPayslipView, setSelectedPayslipView] = useState<any | null>(null);

  // Pay Salary Modal
  const [payingEmp, setPayingEmp] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');

  // Bonus / Deduction / Advance Modal
  const [modalType, setModalType] = useState<'BONUS' | 'DEDUCTION' | 'ADVANCE' | null>(null);

  // Search Filter
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPayroll();
  }, []);

  const loadPayroll = async () => {
    try {
      setLoading(true);
      const [pRes, emps] = await Promise.all([
        api.getPayrollSummary(),
        api.getEmployees().catch(() => [])
      ]);
      setPayrollSummary(pRes);
      setEmployees(emps);
    } catch (e) {
      console.error('Failed to load payroll summary:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePaySalarySubmit = async () => {
    if (!payingEmp) return;
    try {
      const res = await api.paySalary({
        employeeId: payingEmp.employee.id,
        amount: payAmount,
        paymentMethod: payMethod,
        periodNameAr: payrollSummary?.periodNameAr || 'أوت 2026'
      });
      alert(res.message || 'تم تسجيل دفع الراتب وإضافة المصاريف للكتلة المالية بنجاح');
      setPayingEmp(null);
      loadPayroll();
    } catch (err: any) {
      alert(err.message || 'فشل دفع الراتب');
    }
  };

  // Calculations
  const payrolls = payrollSummary?.payrolls || [];
  const totalNetPayroll = payrolls.reduce((sum: number, p: any) => sum + (p.netSalary || 0), 0);
  const totalCommissions = payrolls.reduce((sum: number, p: any) => sum + (p.commissionPay || 0), 0);
  const totalOvertime = payrolls.reduce((sum: number, p: any) => sum + (p.overtimePay || 0), 0);
  const totalDeductionsAndAdvances = payrolls.reduce(
    (sum: number, p: any) => sum + (p.advancesDeducted || 0) + (p.deductionsTotal || 0),
    0
  );

  const filteredPayrolls = payrolls.filter(
    (p: any) =>
      !searchQuery ||
      p.employee.fullNameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.employee.positionAr.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-200 dir-rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-purple-950 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-amber-500" />
            مسير كشوف أجور الموظفين والرواتب (Payroll Ledger)
          </h1>
          <p className="text-xs text-slate-500 font-bold mt-1">
            حساب دقيق وشامل: الراتب الأساسي + الساعات الإضافية + العمولات + المنح والمكافآت - السُلف والخصومات
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Add Bonus Button */}
          <button
            onClick={() => setModalType('BONUS')}
            className="px-3.5 py-2.5 rounded-2xl bg-amber-100 border border-amber-300 text-amber-900 font-black text-xs hover:bg-amber-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Award className="w-4 h-4 text-amber-700" />
            <span>إضافة مكافأة 🎖️</span>
          </button>

          {/* Add Deduction Button */}
          <button
            onClick={() => setModalType('DEDUCTION')}
            className="px-3.5 py-2.5 rounded-2xl bg-rose-100 border border-rose-300 text-rose-900 font-black text-xs hover:bg-rose-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowDown className="w-4 h-4 text-rose-700" />
            <span>تسجيل خصم 🔻</span>
          </button>

          {/* Add Advance Button */}
          <button
            onClick={() => setModalType('ADVANCE')}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white font-black text-xs shadow-md hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>تسجيل سُلفة موظف 💸</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-bold">إجمالي كتلة الرواتب المستحقة</span>
            <div className="text-lg font-black text-purple-950 font-mono mt-0.5">
              {totalNetPayroll.toLocaleString()} د.ج
            </div>
            <span className="text-[10px] text-purple-700 font-bold">لشهر {payrollSummary?.periodNameAr || 'أوت 2026'}</span>
          </div>
          <div className="p-3 bg-purple-100 text-purple-900 rounded-2xl">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-bold">إجمالي عمولات المبيعات</span>
            <div className="text-lg font-black text-emerald-700 font-mono mt-0.5">
              {totalCommissions.toLocaleString()} د.ج
            </div>
            <span className="text-[10px] text-emerald-600 font-bold">محتسبة على الأداء 🟢</span>
          </div>
          <div className="p-3 bg-emerald-100 text-emerald-800 rounded-2xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-bold">أجور الساعات الإضافية</span>
            <div className="text-lg font-black text-indigo-900 font-mono mt-0.5">
              {totalOvertime.toLocaleString()} د.ج
            </div>
            <span className="text-[10px] text-indigo-700 font-bold">بناءً على بصمة الـ QR ⏱️</span>
          </div>
          <div className="p-3 bg-indigo-100 text-indigo-900 rounded-2xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-bold">إجمالي السُلف والخصومات</span>
            <div className="text-lg font-black text-rose-600 font-mono mt-0.5">
              {totalDeductionsAndAdvances.toLocaleString()} د.ج
            </div>
            <span className="text-[10px] text-rose-500 font-bold">مقتطعة من الكشف 🔻</span>
          </div>
          <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl">
            <ArrowDown className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث باسم الموظف أو الوظيفة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-4 py-2 bg-[#FAF7F2] border border-amber-200 rounded-xl text-xs font-bold text-purple-950 outline-none"
          />
        </div>

        <button
          onClick={loadPayroll}
          className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-purple-950 cursor-pointer"
          title="تحديث البيانات"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Detailed Payroll Table */}
      <div className="bg-white rounded-2xl border border-purple-100 shadow-xs overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-purple-50 via-rose-50 to-amber-50 border-b border-purple-100 flex justify-between items-center">
          <h3 className="font-black text-sm text-purple-950 flex items-center gap-2">
            <span>كشف ودليل رواتب شهر {payrollSummary?.periodNameAr || 'أوت 2026'}</span>
          </h3>
          <span className="bg-emerald-100 text-emerald-800 font-black text-xs px-3 py-1 rounded-full border border-emerald-200">
            جاهز للصرف والتأكيد 🟢
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-gradient-to-r from-purple-950 to-indigo-900 text-amber-300 font-black border-b border-purple-100">
              <tr>
                <th className="p-3.5">الموظف والوظيفة</th>
                <th className="p-3.5">الأجر الأساسي</th>
                <th className="p-3.5">الساعات الإضافية</th>
                <th className="p-3.5">عمولة المبيعات</th>
                <th className="p-3.5">المكافآت والمنح</th>
                <th className="p-3.5">السُلف والخصومات</th>
                <th className="p-3.5">الإجمالي (Gross)</th>
                <th className="p-3.5">صافي الأجر النهائي</th>
                <th className="p-3.5 text-center">الإجراءات والطباعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {loading || !payrollSummary ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 font-bold">
                    جاري حساب كشوف الرواتب والعمولات والساعات الإضافية...
                  </td>
                </tr>
              ) : filteredPayrolls.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 font-bold">
                    لا توجد بيانات رواتب تطابق البحث
                  </td>
                </tr>
              ) : (
                filteredPayrolls.map((pItem: any) => {
                  const overtimeHours = pItem.overtimeHours || 0;
                  const overtimePay = pItem.overtimePay || 0;
                  const totalDeductions = (pItem.deductionsTotal || 0) + (pItem.advancesDeducted || 0);

                  return (
                    <tr key={pItem.employee.id} className="hover:bg-[#FAF7F2]/50 transition-colors">
                      <td className="p-3.5">
                        <div className="font-black text-purple-950">{pItem.employee.fullNameAr}</div>
                        <div className="text-[10px] text-rose-600 font-bold">{pItem.employee.positionAr}</div>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-slate-900">
                        {pItem.baseSalary.toLocaleString()} د.ج
                      </td>
                      <td className="p-3.5 font-mono text-indigo-700 font-bold">
                        {overtimePay > 0 ? (
                          <div>
                            <div>+{overtimePay.toLocaleString()} د.ج</div>
                            <div className="text-[10px] text-indigo-500 font-normal">({overtimeHours} سا)</div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-emerald-700 font-bold">
                        {pItem.commissionPay > 0 ? (
                          <div>
                            <div>+{pItem.commissionPay.toLocaleString()} د.ج</div>
                            <div className="text-[10px] text-emerald-500 font-normal">({pItem.commissionRatePercent}%)</div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-amber-900 font-bold">
                        {pItem.bonusesTotal > 0 ? `+${pItem.bonusesTotal.toLocaleString()} د.ج` : '-'}
                      </td>
                      <td className="p-3.5 font-mono text-rose-600 font-bold">
                        {totalDeductions > 0 ? `-${totalDeductions.toLocaleString()} د.ج` : '-'}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-slate-600">
                        {(pItem.grossEarnings || pItem.netSalary).toLocaleString()} د.ج
                      </td>
                      <td className="p-3.5 font-black text-amber-900 text-sm font-mono bg-amber-50/60 rounded-xl">
                        {pItem.netSalary.toLocaleString()} د.ج
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setPayingEmp(pItem);
                              setPayAmount(pItem.netSalary);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white font-black text-[11px] hover:bg-emerald-800 shadow-xs cursor-pointer inline-flex items-center gap-1"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>دفع الأجر</span>
                          </button>
                          <button
                            onClick={() => setSelectedPayslipView(pItem)}
                            className="px-3 py-1.5 rounded-xl bg-purple-950 text-amber-300 hover:bg-purple-900 font-black text-[11px] flex items-center gap-1 cursor-pointer shadow-xs"
                            title="عرض وطباعة قسيمة الأجر الرسمية (Fiche de Paie)"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>وصل الأجر</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pay Salary Modal */}
      {payingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-purple-100 p-6 space-y-4">
            <h3 className="font-black text-lg text-purple-950 border-b border-purple-100 pb-3">
              دفع راتب الموظف: {payingEmp.employee.fullNameAr}
            </h3>

            <div className="space-y-3 text-xs font-black text-purple-950">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>الراتب الأساسي:</span>
                  <span className="font-mono">{payingEmp.baseSalary.toLocaleString()} د.ج</span>
                </div>
                {payingEmp.overtimePay > 0 && (
                  <div className="flex justify-between text-indigo-700">
                    <span>أجر الساعات الإضافية ({payingEmp.overtimeHours} سا):</span>
                    <span className="font-mono">+{payingEmp.overtimePay.toLocaleString()} د.ج</span>
                  </div>
                )}
                {payingEmp.commissionPay > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>عمولة المبيعات:</span>
                    <span className="font-mono">+{payingEmp.commissionPay.toLocaleString()} د.ج</span>
                  </div>
                )}
                {payingEmp.bonusesTotal > 0 && (
                  <div className="flex justify-between text-amber-800">
                    <span>المكافآت:</span>
                    <span className="font-mono">+{payingEmp.bonusesTotal.toLocaleString()} د.ج</span>
                  </div>
                )}
                {payingEmp.advancesDeducted > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>اقتطاع السُلف والخصومات:</span>
                    <span className="font-mono">-{payingEmp.advancesDeducted.toLocaleString()} د.ج</span>
                  </div>
                )}
                <div className="flex justify-between text-purple-950 text-sm font-black border-t pt-1">
                  <span>صافي الأجر النهائي:</span>
                  <span className="font-mono text-amber-900">{payingEmp.netSalary.toLocaleString()} د.ج</span>
                </div>
              </div>

              <div>
                <label className="block mb-1 text-slate-600">المبلغ المسلم فعلياً (د.ج) *</label>
                <input
                  type="number"
                  min={1}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#FFFBF7] border border-amber-300 rounded-xl text-base font-mono font-black text-emerald-700 outline-none"
                />
              </div>

              <div>
                <label className="block mb-1 text-slate-600">طريقة الدفع *</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-purple-950 outline-none"
                >
                  <option value="CASH">نقداً من خزينة المحل (Cash)</option>
                  <option value="BANK_TRANSFER">تحويل بنكي / شيك (Bank Transfer)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-purple-100">
                <button
                  type="button"
                  onClick={() => setPayingEmp(null)}
                  className="px-4 py-2 border border-gray-300 rounded-xl font-black text-gray-700 hover:bg-gray-50"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handlePaySalarySubmit}
                  className="px-5 py-2 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white font-black rounded-xl shadow-md hover:brightness-110 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-white" />
                  <span>تأكيد وتسجيل الصرف ✨</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bonus / Deduction / Advance Modal */}
      {modalType && (
        <BonusDeductionModal
          isOpen={!!modalType}
          onClose={() => setModalType(null)}
          type={modalType}
          employees={employees}
          onSuccess={() => loadPayroll()}
        />
      )}

      {/* Printable Payslip Modal */}
      {selectedPayslipView && (
        <PayslipModal
          payItem={selectedPayslipView}
          periodNameAr={payrollSummary?.periodNameAr || 'أوت 2026'}
          onClose={() => setSelectedPayslipView(null)}
        />
      )}
    </div>
  );
};
