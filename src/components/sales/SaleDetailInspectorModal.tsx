import React from 'react';
import {
  X, Printer, Clock, UserCheck, ShieldCheck, FileText, DollarSign,
  Package, Calendar, CheckCircle2, Lock, Tag, Layers, CreditCard
} from 'lucide-react';
import { Sale } from '../../types';
import { BrandLogo } from '../common/BrandLogo';

interface SaleDetailInspectorModalProps {
  sale: Sale;
  onClose: () => void;
}

export const SaleDetailInspectorModal: React.FC<SaleDetailInspectorModalProps> = ({ sale, onClose }) => {
  const handlePrintA4 = () => {
    window.print();
  };

  const formattedDateTime = new Date(sale.createdAt).toLocaleString('ar-DZ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const paymentMethodAr =
    sale.paymentMethod === 'CASH'
      ? 'نقداً (Cash)'
      : sale.paymentMethod === 'CARD'
      ? 'بطاقة بنكية (Card)'
      : sale.paymentMethod === 'DEBT'
      ? 'بيع على الحساب (Debt)'
      : sale.paymentMethod;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200 dir-rtl">
      {/* Print Styles for A4 Audit Sheet */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-audit-invoice, #printable-audit-invoice * {
            visibility: visible !important;
          }
          #printable-audit-invoice {
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

      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-purple-100 flex flex-col max-h-[94vh]">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-[#2E1065] via-[#3B0764] to-[#1E1B4B] text-white p-4 flex items-center justify-between no-print shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-400/20 rounded-xl text-amber-300">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-white">تدقيق ومراجعة الفاتورة (وضع العرض فقط للمدير 🔒)</h3>
                <span className="bg-amber-400 text-purple-950 text-[10px] font-black px-2 py-0.5 rounded-md">
                  سجل غير قابل للتعديل
                </span>
              </div>
              <p className="text-[11px] text-purple-200 font-mono font-bold">رقم الفاتورة: {sale.invoiceNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintA4}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white font-black text-xs hover:brightness-110 flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة كشف الفاتورة (Print A4) 🖨️</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Printable Audit Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center">
          <div
            id="printable-audit-invoice"
            className="w-full bg-white p-6 sm:p-8 rounded-3xl shadow-md border border-slate-200 text-purple-950 font-sans space-y-6 text-xs"
          >
            {/* Header & Store Branding */}
            <div className="flex justify-between items-start border-b-2 border-purple-950 pb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-tr from-[#2E1065] to-[#3B0764] rounded-2xl border border-amber-300 shadow-md">
                  <BrandLogo size="lg" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-purple-950">مؤسسة زروقي للحلويات - سجل تدقيق الفواتير</h1>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">Zerrouki Sweets Sales & Worker Accountability Ledger</p>
                  <div className="text-[11px] text-slate-600 mt-2 space-y-0.5 font-bold">
                    <div>شارع فلسطين، المركز التجاري، الجزائر العاصمة</div>
                    <div>هاتف الإدارة العامة: <span className="font-mono text-purple-900 font-black">0550 12 34 56</span></div>
                  </div>
                </div>
              </div>

              <div className="text-left bg-[#FFFBF7] p-4 rounded-2xl border border-amber-200 space-y-1">
                <span className="text-[10px] font-black bg-purple-900 text-amber-300 px-2.5 py-1 rounded-lg inline-block mb-1 shadow-2xs">
                  فاتورة مبيعات معتمدة
                </span>
                <div className="text-base font-black text-purple-950 font-mono">{sale.invoiceNumber}</div>
                <div className="text-[11px] text-slate-600 font-bold">
                  الحالة: {sale.status === 'COMPLETED' ? 'مكتملة 🟢' : sale.status === 'CANCELLED' ? 'ملغاة 🔴' : 'مرتجع جزئي 🟡'}
                </div>
              </div>
            </div>

            {/* Audit Metadata Box (Worker & Time Detail) */}
            <div className="bg-[#FFFBF7] p-4 rounded-2xl border border-amber-200 space-y-3">
              <h4 className="font-black text-purple-950 text-xs border-b border-amber-200 pb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                <span>تفاصيل تدقيق العملية والموظف المسؤول:</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-bold">
                <div>
                  <span className="text-slate-500 block text-[11px]">اسم الموظف / الكاشير الصادر منه:</span>
                  <span className="text-purple-950 font-black text-sm">{sale.createdByUserName}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">التاريخ والوقت الدقيق بالثواني:</span>
                  <span className="font-mono text-slate-800 text-[11px]">{formattedDateTime}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">الزبون المستلم:</span>
                  <span className="text-purple-950 font-bold">{sale.customerNameAr || 'زبون عادي (مباشر)'}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">طريقة التسديد:</span>
                  <span className="font-bold text-emerald-700">{paymentMethodAr}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">جلسة الصندوق المربوطة:</span>
                  <span className="font-mono text-purple-900">{sale.cashSessionId || 'جلسة رقم CS-101'}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">إجمالي عدد المواد المباعة:</span>
                  <span className="font-mono text-purple-950 font-black">
                    {sale.items.reduce((acc, i) => acc + i.quantity, 0)} عنصر/كغ
                  </span>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-right text-xs">
                <thead className="bg-gradient-to-r from-purple-950 to-indigo-900 text-amber-300 font-black">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">اسم المنتج / الحلوى</th>
                    <th className="p-3 text-center">الكمية المسجلة</th>
                    <th className="p-3 text-left">سعر الوحدة الأصلي</th>
                    <th className="p-3 text-left">الخصم / التعديل</th>
                    <th className="p-3 text-left">الإجمالي الصافي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-purple-950">
                  {sale.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3">
                        <div className="font-black text-purple-950">{item.productNameAr}</div>
                        {item.selectedVariantNameAr && (
                          <div className="text-[10px] text-amber-800 font-bold">
                            الحجم/المتغير: {item.selectedVariantNameAr}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center font-mono font-black text-purple-950">
                        {item.quantity}
                      </td>
                      <td className="p-3 text-left font-mono font-bold text-slate-700">
                        {item.unitPrice.toLocaleString()} د.ج
                      </td>
                      <td className="p-3 text-left font-mono text-rose-600 font-bold">
                        {item.discountAmount ? `-${item.discountAmount.toLocaleString()} د.ج` : '-'}
                      </td>
                      <td className="p-3 text-left font-mono font-black text-emerald-700">
                        {item.totalPrice.toLocaleString()} د.ج
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Totals Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5 font-bold">
                <div className="flex justify-between text-slate-600">
                  <span>المجموع الإجمالي قبل الخصم:</span>
                  <span className="font-mono text-purple-950">{(sale.subtotal || sale.grandTotal).toLocaleString()} د.ج</span>
                </div>
                {sale.discountAmount ? (
                  <div className="flex justify-between text-rose-600">
                    <span>خصم الفاتورة الإجمالي:</span>
                    <span className="font-mono">-{sale.discountAmount.toLocaleString()} د.ج</span>
                  </div>
                ) : null}
                {sale.taxAmount ? (
                  <div className="flex justify-between text-slate-600">
                    <span>الضريبة المضافة:</span>
                    <span className="font-mono">+{sale.taxAmount.toLocaleString()} د.ج</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-emerald-700 text-xs font-black border-t pt-1">
                  <span>المبلغ المدفوع المسجل بالفاتورة:</span>
                  <span className="font-mono">{sale.paidAmount.toLocaleString()} د.ج</span>
                </div>
                <div className="flex justify-between text-rose-600 text-xs font-black">
                  <span>الدين المتبقي بالفاتورة:</span>
                  <span className="font-mono">{sale.remainingDebt.toLocaleString()} د.ج</span>
                </div>
                <div className="flex justify-between text-purple-950 text-sm font-black border-t pt-1">
                  <span>إجمالي الفاتورة الصافي:</span>
                  <span className="font-mono text-amber-900">{sale.grandTotal.toLocaleString()} د.ج</span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-950 to-indigo-900 text-amber-300 p-4 rounded-2xl flex flex-col justify-between shadow-md">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-300" />
                  <span className="text-xs font-black">إقرار ومسؤولية الكاشير</span>
                </div>
                <p className="text-[11px] text-purple-200 font-bold mt-1">
                  هذه الفاتورة موثقة بالساعة والدقيقة تحت حساب الموظف <b>({sale.createdByUserName})</b> للمحاسبة والتدقيق الإداري.
                </p>
                <div className="text-right text-xs font-mono font-black text-amber-300 mt-2 border-t border-purple-800 pt-1">
                  الصافي النهائي: {sale.grandTotal.toLocaleString()} د.ج
                </div>
              </div>
            </div>

            {/* Footer Audit Signatures */}
            <div className="grid grid-cols-2 gap-8 pt-6 border-t border-dashed border-slate-300 text-center font-bold text-xs text-slate-700">
              <div>
                <p className="mb-8 font-black">اسم وتوقيع الموظف (الكاشير):</p>
                <div className="h-10 border-b border-slate-300 border-dashed w-48 mx-auto flex items-end justify-center pb-1 font-black text-purple-950">
                  {sale.createdByUserName}
                </div>
              </div>
              <div>
                <p className="mb-8 font-black">اعتماد وتوقيع المدير العام (المالك):</p>
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

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintA4}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:brightness-110 text-white font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>طباعة كشف التدقيق (Print A4) ✨</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
