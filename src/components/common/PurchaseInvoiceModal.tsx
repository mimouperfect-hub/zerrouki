import React, { useState, useEffect } from 'react';
import { Printer, X, Truck, Calendar, DollarSign, Check, Phone, MapPin, Barcode, ShieldAlert, Sparkles, Building2, Tag } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { Purchase, Supplier, Product, SystemSettings } from '../../types';
import { api } from '../../api/client';

interface PurchaseInvoiceModalProps {
  purchase: Purchase;
  supplier?: Supplier;
  products: Product[];
  onClose: () => void;
}

export const PurchaseInvoiceModal: React.FC<PurchaseInvoiceModalProps> = ({ purchase, supplier, products, onClose }) => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  useEffect(() => {
    api.getSettings().then(setSettings).catch(console.error);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(purchase.createdAt || purchase.purchaseDate || Date.now()).toLocaleString('ar-DZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  const subtotalCost = purchase.subtotal || purchase.items.reduce((sum, item) => sum + (item.totalPrice || item.quantity * item.unitPrice), 0);
  const discount = purchase.discountAmount || 0;
  const netGrandTotal = purchase.grandTotal || (subtotalCost - discount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200 dir-rtl">
      
      {/* Print Styles for Purchase Invoices */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-purchase-area, #printable-purchase-area * {
            visibility: visible !important;
          }
          #printable-purchase-area {
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
        
        {/* Modal Navigation Header */}
        <div className="p-4 bg-gradient-to-r from-[#2E1065] via-[#3B0764] to-[#1E1B4B] text-white flex items-center justify-between no-print border-b border-purple-100 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-400/20 rounded-xl text-amber-300">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white">تفاصيل وفاتورة التوريد للشحنة الواردة</h3>
              <p className="text-[11px] text-purple-200 font-mono font-bold">
                رقم الفاتورة: {purchase.invoiceNumber} {purchase.supplierInvoiceRef ? `| مرجع: ${purchase.supplierInvoiceRef}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white font-black text-xs hover:brightness-110 flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الفاتورة 🖨️</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Purchase Document Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center">
          
          <div
            id="printable-purchase-area"
            className="w-full bg-white p-8 rounded-3xl shadow-md border border-slate-200 text-purple-950 font-sans space-y-6 text-xs"
          >
            {/* Document Header */}
            <div className="flex justify-between items-start border-b-2 border-purple-950 pb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-tr from-[#2E1065] to-[#3B0764] rounded-2xl border border-amber-300/40 shadow-md">
                  <BrandLogo size="lg" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-purple-950">{settings?.storeNameAr || 'مؤسسة زروقي للحلويات'} - قسم استلام التوريدات</h1>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">{settings?.storeNameFr || 'Zerrouki Sweets'} Purchase & Warehouse Receiving Record</p>
                  <div className="text-[11px] text-slate-600 mt-2 space-y-0.5 font-bold">
                    <div>المقر الرئيسي والمستودع: {settings?.addressAr || 'شارع فلسطين، المركز التجاري، الجزائر العاصمة'}</div>
                    <div>مصلحة التموين والمستودع: <span className="font-mono text-purple-900 font-black">{settings?.phone || '0550 12 34 56'}</span></div>
                  </div>
                </div>
              </div>

              <div className="text-left bg-[#FFFBF7] p-4 rounded-2xl border border-amber-200 space-y-1">
                <span className="text-[10px] font-black bg-amber-500 text-white px-2.5 py-1 rounded-lg inline-block mb-1 shadow-2xs">
                  فاتورة شراء وتوريد
                </span>
                <div className="text-base font-black text-purple-950 font-mono">{purchase.invoiceNumber}</div>
                {purchase.supplierInvoiceRef && (
                  <div className="text-[10px] text-slate-500 font-mono font-bold">
                    مرجع المورد: {purchase.supplierInvoiceRef}
                  </div>
                )}
                <div className="text-[11px] text-slate-600 font-bold pt-1">التاريخ: {formattedDate}</div>
              </div>
            </div>

            {/* Supplier & Financial Info Cards Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#FFFBF7] p-4 rounded-2xl border border-amber-200 space-y-1.5">
                <h4 className="font-black text-purple-950 text-xs border-b border-amber-200 pb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-amber-500" />
                  <span>بيانات المورد والشركة التوزيعية:</span>
                </h4>
                <div className="flex justify-between font-bold">
                  <span className="text-slate-500">اسم المورد:</span>
                  <span className="text-purple-950 font-black">{supplier?.nameAr || purchase.supplierNameAr || 'مورد عام'}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-slate-500">شركة التوزيع:</span>
                  <span className="text-slate-800">{supplier?.companyName || 'مؤسسة التوزيع المعتمدة'}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-slate-500">هاتف الاتصال:</span>
                  <span className="font-mono text-purple-900">{supplier?.phone || 'غير مسجل'}</span>
                </div>
              </div>

              <div className="bg-[#FFFBF7] p-4 rounded-2xl border border-amber-200 space-y-1.5">
                <h4 className="font-black text-purple-950 text-xs border-b border-amber-200 pb-1 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                  <span>الحالة المالية وتسديد مستحقات الشحنة:</span>
                </h4>
                <div className="flex justify-between font-bold">
                  <span className="text-slate-500">صافي فاتورة الشراء:</span>
                  <span className="font-mono font-black text-amber-900">{netGrandTotal.toLocaleString()} د.ج</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-700">
                  <span>المدفوع نقداً للمورد:</span>
                  <span className="font-mono font-black">{purchase.paidAmount.toLocaleString()} د.ج</span>
                </div>
                <div className="flex justify-between font-bold text-rose-600 border-t border-amber-200 pt-1">
                  <span>الدين المتبقي للمورد:</span>
                  <span className="font-mono font-black">{purchase.remainingDebt.toLocaleString()} د.ج</span>
                </div>
              </div>
            </div>

            {/* Detailed Items Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-right text-xs">
                <thead className="bg-gradient-to-r from-purple-950 to-indigo-900 text-amber-300 font-black">
                  <tr>
                    <th className="p-3 text-center w-10">#</th>
                    <th className="p-3">اسم المادة / المنتج الوارد</th>
                    <th className="p-3 text-center">رقم الدفعة (Batch/Lot)</th>
                    <th className="p-3 text-center">تاريخ الانتهاء FEFO</th>
                    <th className="p-3 text-center">الكمية المسلمة</th>
                    <th className="p-3 text-left">سعر الكلفة الفردي</th>
                    <th className="p-3 text-left">المجموع الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-purple-950">
                  {purchase.items.map((item, idx) => {
                    const prod = products.find((p) => p.id === item.productId);
                    const unitCost = item.unitPrice || (item.totalPrice ? item.totalPrice / item.quantity : 0);
                    const itemTotal = item.totalPrice || (item.quantity * unitCost);

                    return (
                      <tr key={item.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                        <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-black text-purple-950">
                          {item.productNameAr || prod?.nameAr || 'منتج مجهول'}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-600">
                          {item.batchNumber || 'LOT-INIT'}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-amber-950">
                          {item.expirationDate || 'غير حدد'}
                        </td>
                        <td className="p-3 text-center font-mono font-black text-purple-950">
                          {item.quantity} قطعة
                        </td>
                        <td className="p-3 text-left font-mono text-slate-600">
                          {unitCost.toLocaleString()} د.ج
                        </td>
                        <td className="p-3 text-left font-mono font-black text-amber-900">
                          {itemTotal.toLocaleString()} د.ج
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Financial Summary Breakdown Table */}
            <div className="flex justify-between items-start border-t border-slate-200 pt-4">
              <div className="text-slate-500 text-[11px] font-bold max-w-sm space-y-1">
                <div>ملاحظات الفاتورة: {purchase.notes || 'تم فحص ومراجعة الشحنة وإضافتها آلياً لمخزون المحل وقاعدة البيانات.'}</div>
                <div className="text-[10px] text-emerald-600 font-black">حالة التسديد: {purchase.paymentStatus === 'PAID' ? 'خالصة المدفوعات بالكامل 🟢' : 'آجلة / يقتطع من الديون 🟡'}</div>
              </div>

              <div className="bg-[#FFFBF7] border border-amber-200 rounded-2xl p-3.5 space-y-1.5 w-64 text-xs font-black">
                <div className="flex justify-between text-slate-600">
                  <span>مجموع المواد الإجمالي:</span>
                  <span className="font-mono text-purple-950">{subtotalCost.toLocaleString()} د.ج</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>الخصم الممنوح:</span>
                    <span className="font-mono">-{discount.toLocaleString()} د.ج</span>
                  </div>
                )}
                <div className="flex justify-between text-amber-900 border-t border-amber-200 pt-1 text-sm font-black">
                  <span>الصافي المستحق للشحنة:</span>
                  <span className="font-mono">{netGrandTotal.toLocaleString()} د.ج</span>
                </div>
              </div>
            </div>

            {/* Signatures & Approvals Section */}
            <div className="grid grid-cols-2 gap-8 pt-8 border-t border-dashed border-slate-300 text-center font-bold text-xs text-slate-700">
              <div>
                <p className="mb-8 font-black">ختم وتوقيع المورد (المسلم):</p>
                <div className="h-10 border-b border-slate-300 border-dashed w-48 mx-auto" />
              </div>
              <div>
                <p className="mb-8 font-black">ختم وتوقيع مسؤول المستودع (المستلم):</p>
                <div className="h-10 border-b border-slate-300 border-dashed w-48 mx-auto" />
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer CTAs */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between no-print">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl border border-gray-300 font-black text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            إلغاء النافذة
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:brightness-110 text-white font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-white" />
            <span>طباعة فاتورة التوريد التفصيلية (Print Invoice) ✨</span>
          </button>
        </div>

      </div>
    </div>
  );
};
