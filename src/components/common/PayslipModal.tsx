import React from 'react';
import { Printer, X, Award, DollarSign, Calendar, UserCheck, ShieldCheck, Check, Phone, MapPin, Clock } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface PayslipModalProps {
  payItem: {
    employee: {
      id: string;
      fullNameAr: string;
      positionAr?: string;
      phone?: string;
    };
    baseSalary: number;
    overtimeHours?: number;
    overtimePay?: number;
    hourlyRate?: number;
    commissionPay: number;
    commissionRatePercent?: number;
    salesTotal?: number;
    bonusesTotal: number;
    deductionsTotal?: number;
    advancesDeducted: number;
    grossEarnings?: number;
    netSalary: number;
    paidAmount?: number;
    paymentStatus?: string;
  };
  periodNameAr?: string;
  onClose: () => void;
}

export const PayslipModal: React.FC<PayslipModalProps> = ({ payItem, periodNameAr, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date().toLocaleDateString('ar-DZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const voucherNumber = `PAY-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${payItem.employee.id.slice(-4)}`;

  const overtimeHours = payItem.overtimeHours || 0;
  const overtimePay = payItem.overtimePay || 0;
  const grossEarnings = payItem.grossEarnings || (payItem.baseSalary + overtimePay + payItem.commissionPay + payItem.bonusesTotal);
  const totalDeductions = (payItem.deductionsTotal || 0) + (payItem.advancesDeducted || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200 dir-rtl">
      {/* CSS Rules specifically tailored for A4 / Payslip Printing */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-payslip-area, #printable-payslip-area * {
            visibility: visible !important;
          }
          #printable-payslip-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            direction: rtl !important;
            text-align: right !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-purple-100 flex flex-col max-h-[94vh]">
        {/* Navigation Header */}
        <div className="p-4 bg-gradient-to-r from-[#2E1065] via-[#3B0764] to-[#1E1B4B] text-white flex items-center justify-between no-print border-b border-purple-100 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-400/20 rounded-xl text-amber-300">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white">كشف وقسيمة الأجر التفصيلية (Fiche de Paie)</h3>
              <p className="text-[11px] text-purple-200 font-mono font-bold">المرجع: {voucherNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white font-black text-xs hover:brightness-110 flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة كشف الأجر 🖨️</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center">
          <div
            id="printable-payslip-area"
            className="w-full bg-white p-6 sm:p-8 rounded-3xl shadow-md border border-slate-200 text-purple-950 font-sans space-y-6 text-xs"
          >
            {/* Header & Logo */}
            <div className="flex justify-between items-start border-b-2 border-purple-950 pb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-tr from-[#2E1065] to-[#3B0764] rounded-2xl border border-amber-300 shadow-md">
                  <BrandLogo size="lg" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-purple-950">مؤسسة زروقي للحلويات - كشف الأجر والرواتب</h1>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">Zerrouki Sweets Official Payroll Voucher</p>
                  <div className="text-[11px] text-slate-600 mt-2 space-y-0.5 font-bold">
                    <div>المقر الرئيسي: شارع فلسطين، المركز التجاري، الجزائر العاصمة</div>
                    <div>مصلحة الموارد البشرية والأجور: <span className="font-mono text-purple-900 font-black">0550 12 34 56</span></div>
                  </div>
                </div>
              </div>

              <div className="text-left bg-[#FFFBF7] p-4 rounded-2xl border border-amber-200 space-y-1">
                <span className="text-[10px] font-black bg-purple-900 text-amber-300 px-2.5 py-1 rounded-lg inline-block mb-1 shadow-2xs">
                  كشف الأجر الرسمي
                </span>
                <div className="text-base font-black text-purple-950 font-mono">{voucherNumber}</div>
                <div className="text-[11px] text-slate-600 font-bold">الفترة: {periodNameAr || 'أوت 2026'}</div>
              </div>
            </div>

            {/* Employee Information Box */}
            <div className="bg-[#FFFBF7] p-4 rounded-2xl border border-amber-200 space-y-2">
              <h4 className="font-black text-purple-950 text-xs border-b border-amber-200 pb-1.5 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-amber-500" />
                <span>بيانات الموظف والمستفيد من الراتب:</span>
              </h4>

              <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                <div>
                  <span className="text-slate-500 block text-[11px]">الاسم واللقب الكامل:</span>
                  <span className="text-purple-950 font-black text-sm">{payItem.employee.fullNameAr}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">المسمى الوظيفي:</span>
                  <span className="text-slate-800">{payItem.employee.positionAr || 'عامل بالمحل'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">رقم الهاتف المسجل:</span>
                  <span className="font-mono text-purple-900">{payItem.employee.phone || 'غير مسجل'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">تاريخ الدفع والإصدار:</span>
                  <span className="font-mono text-slate-800">{formattedDate}</span>
                </div>
              </div>
            </div>

            {/* Detailed Earnings & Deductions Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-right text-xs">
                <thead className="bg-gradient-to-r from-purple-950 to-indigo-900 text-amber-300 font-black">
                  <tr>
                    <th className="p-3">بيان عناصر الأجر المستحقة والاقتطاعات</th>
                    <th className="p-3 text-center">التصنيف</th>
                    <th className="p-3 text-left">المبلغ (د.ج DZD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-purple-950">
                  {/* Base Salary */}
                  <tr className="bg-white">
                    <td className="p-3">
                      <div className="font-black text-purple-950">الراتب الأساسي الشهري (Base Salary)</div>
                      <div className="text-[10px] text-slate-400 font-bold">الأجر القاعدي الثابت العادي</div>
                    </td>
                    <td className="p-3 text-center">
                      <span className="bg-blue-100 text-blue-900 text-[10px] font-black px-2 py-0.5 rounded-md border border-blue-200">
                        مستحق ثابت 🔵
                      </span>
                    </td>
                    <td className="p-3 text-left font-mono font-black text-purple-950">
                      {payItem.baseSalary.toLocaleString()} د.ج
                    </td>
                  </tr>

                  {/* Overtime Pay if present */}
                  {overtimePay > 0 && (
                    <tr className="bg-[#FFFBF7]">
                      <td className="p-3">
                        <div className="font-black text-indigo-950">ساعات العمل الإضافي ({overtimeHours} ساعة)</div>
                        <div className="text-[10px] text-indigo-700 font-bold">محتسبة بمعدل 1.5x من أجر الساعة</div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="bg-indigo-100 text-indigo-900 text-[10px] font-black px-2 py-0.5 rounded-md border border-indigo-200">
                          إضافي ⏱️
                        </span>
                      </td>
                      <td className="p-3 text-left font-mono font-black text-indigo-700">
                        +{overtimePay.toLocaleString()} د.ج
                      </td>
                    </tr>
                  )}

                  {/* Commission */}
                  {payItem.commissionPay > 0 && (
                    <tr className="bg-[#FFFBF7]">
                      <td className="p-3">
                        <div className="font-black text-emerald-950">عمولة المبيعات ({payItem.commissionRatePercent}%)</div>
                        <div className="text-[10px] text-emerald-700 font-bold">محتسبة على مبيعات قدرها {payItem.salesTotal?.toLocaleString() || 0} د.ج</div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md border border-emerald-200">
                          عمولة 🟢
                        </span>
                      </td>
                      <td className="p-3 text-left font-mono font-black text-emerald-700">
                        +{payItem.commissionPay.toLocaleString()} د.ج
                      </td>
                    </tr>
                  )}

                  {/* Bonuses */}
                  {payItem.bonusesTotal > 0 && (
                    <tr className="bg-white">
                      <td className="p-3">
                        <div className="font-black text-amber-950">المكافآت والمنح التشجيعية</div>
                        <div className="text-[10px] text-amber-700 font-bold">منحة الانضباط والأداء الممتاز</div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-md border border-amber-200">
                          منحة 🎖️
                        </span>
                      </td>
                      <td className="p-3 text-left font-mono font-black text-amber-900">
                        +{payItem.bonusesTotal.toLocaleString()} د.ج
                      </td>
                    </tr>
                  )}

                  {/* Deductions */}
                  {payItem.deductionsTotal ? payItem.deductionsTotal > 0 && (
                    <tr className="bg-rose-50/50">
                      <td className="p-3">
                        <div className="font-black text-rose-950">الخصومات والاقتطاعات الإدارية</div>
                        <div className="text-[10px] text-rose-600 font-bold">خصم تأخيرات أو عقوبات إدارية</div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-md border border-rose-200">
                          خصم 🔻
                        </span>
                      </td>
                      <td className="p-3 text-left font-mono font-black text-rose-600">
                        -{payItem.deductionsTotal.toLocaleString()} د.ج
                      </td>
                    </tr>
                  ) : null}

                  {/* Advances */}
                  {payItem.advancesDeducted > 0 && (
                    <tr className="bg-rose-50/50">
                      <td className="p-3">
                        <div className="font-black text-rose-950">اقتطاع السُلف المالية المسبقة (Advances Deducted)</div>
                        <div className="text-[10px] text-rose-600 font-bold">تقتطع من الراتب عن السلف المستلمة</div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-md border border-rose-200">
                          سُلفة 💸
                        </span>
                      </td>
                      <td className="p-3 text-left font-mono font-black text-rose-600">
                        -{payItem.advancesDeducted.toLocaleString()} د.ج
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Total Net Salary Display */}
            <div className="bg-gradient-to-r from-purple-950 to-indigo-900 text-amber-300 p-5 rounded-2xl flex items-center justify-between shadow-md">
              <div>
                <span className="text-xs text-purple-200 font-bold block">صافي الأجر المستحق النهائي للدفع (Net Payable Salary):</span>
                <span className="text-[11px] text-amber-300/80 font-semibold">يشمل كافة الأجور الإضافية والعلاوات مطروحاً منها الاقتطاعات والسلف</span>
              </div>
              <div className="text-2xl font-black font-mono text-amber-300">
                {payItem.netSalary.toLocaleString()} د.ج
              </div>
            </div>

            {/* Legal Notice */}
            <div className="text-[11px] text-slate-500 space-y-1 border-t border-slate-200 pt-3 font-bold">
              <p>• يُقر الموظف باستلامه للمبلغ المذكور أعلاه كاملاً وبدون تحفظ عن الفترة المحددة.</p>
              <p>• هذا الوصل يُعد إثباتاً رسمياً وموجباً للإبراء المتبادل بين الطرفين عن الأجر المذكور.</p>
            </div>

            {/* Signatures & Approvals */}
            <div className="grid grid-cols-2 gap-8 pt-6 border-t border-dashed border-slate-300 text-center font-bold text-xs text-slate-700">
              <div>
                <p className="mb-8 font-black">توقيع وإبراء الموظف المستلم:</p>
                <div className="h-10 border-b border-slate-300 border-dashed w-48 mx-auto" />
              </div>
              <div>
                <p className="mb-8 font-black">ختم وتوقيع المدير العام (صاحب المحل):</p>
                <div className="h-10 border-b border-slate-300 border-dashed w-48 mx-auto" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between no-print">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl border border-gray-300 font-black text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            إغلاق
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:brightness-110 text-white font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-white" />
            <span>طباعة قسيمة الأجر التفصيلية (Print Payslip) ✨</span>
          </button>
        </div>
      </div>
    </div>
  );
};
