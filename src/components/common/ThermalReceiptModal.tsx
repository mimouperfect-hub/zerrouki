import React, { useState, useEffect } from 'react';
import { Printer, X, Check, FileText, Phone, MapPin, Barcode, ShieldCheck, Award, FileSpreadsheet } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { api } from '../../api/client';
import { SystemSettings } from '../../types';

interface ThermalReceiptModalProps {
  sale: {
    id: string;
    invoiceNumber: string;
    customerNameAr?: string;
    customerPhone?: string;
    userNameAr?: string;
    paymentMethod: string;
    subtotal?: number;
    discountAmount?: number;
    grandTotal: number;
    paidAmount?: number;
    remainingAmount?: number;
    createdAt: string;
    items: Array<{
      id: string;
      productNameAr: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
  };
  onClose: () => void;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({ sale, onClose }) => {
  const [invoiceType, setInvoiceType] = useState<'80MM' | 'A4'>('80MM');
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  useEffect(() => {
    api.getSettings().then(setSettings).catch(console.error);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(sale.createdAt || Date.now()).toLocaleString('ar-DZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  const subtotalCalc = sale.subtotal || sale.items.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200 dir-rtl">
      
      {/* Dynamic Printing Rules for 80mm vs A4 Page Sizes */}
      <style>{`
        @media print {
          @page {
            size: ${invoiceType === '80MM' ? '80mm auto' : 'A4 portrait'};
            margin: ${invoiceType === '80MM' ? '0' : '15mm'};
          }
          body * {
            visibility: hidden !important;
          }
          #printable-invoice-area, #printable-invoice-area * {
            visibility: visible !important;
          }
          #printable-invoice-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${invoiceType === '80MM' ? '80mm' : '100%'} !important;
            margin: 0 !important;
            padding: ${invoiceType === '80MM' ? '8px 12px' : '0'} !important;
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

      <div className={`bg-white w-full rounded-3xl shadow-2xl overflow-hidden border border-purple-100 flex flex-col transition-all duration-300 max-h-[94vh] ${
        invoiceType === 'A4' ? 'max-w-3xl' : 'max-w-md'
      }`}>
        
        {/* Top Navigation Header & Mode Selector (Screen Only) */}
        <div className="p-4 bg-gradient-to-r from-[#2E1065] via-[#3B0764] to-[#1E1B4B] text-white flex flex-col sm:flex-row items-center justify-between gap-3 no-print border-b border-amber-300/40">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl shadow-xs">
              <Check className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-black text-sm text-white">تم إصدَار الفاتورة بنجاح ✨</h3>
              <p className="text-[10px] text-amber-300 font-mono font-bold">رقم: {sale.invoiceNumber}</p>
            </div>
          </div>

          {/* Invoice Format Toggle */}
          <div className="flex items-center gap-1 bg-black/20 p-1 rounded-2xl border border-amber-300/30">
            <button
              onClick={() => setInvoiceType('80MM')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                invoiceType === '80MM'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                  : 'text-purple-100/80 hover:text-white'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>وصل حراري 80mm</span>
            </button>

            <button
              onClick={() => setInvoiceType('A4')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                invoiceType === 'A4'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                  : 'text-purple-100/80 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>فاتورة رسمية A4</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-purple-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Area Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-100/70 flex justify-center">
          
          {/* OPTION 1: 80mm THERMAL RECEIPT FORMAT */}
          {invoiceType === '80MM' ? (
            <div
              id="printable-invoice-area"
              className="w-full max-w-[320px] bg-white p-4 rounded-2xl shadow-sm border border-gray-200 text-gray-900 font-sans text-xs space-y-3"
            >
              {/* Header & Brand Logo */}
              <div className="text-center space-y-1.5 border-b border-dashed border-gray-300 pb-3">
                <div className="flex justify-center mb-1">
                  <div className="p-2 bg-gradient-to-br from-[#4C1D95] to-[#F59E0B] rounded-2xl inline-block shadow-sm">
                    <BrandLogo size="md" />
                  </div>
                </div>
                <h2 className="text-base font-black text-purple-950">{settings?.storeNameAr || 'مؤسسة زروقي للحلويات'}</h2>
                <p className="text-[11px] font-bold text-slate-600">{settings?.storeNameFr || 'Zerrouki Sweets & Confectionery'}</p>
                
                <div className="text-[10px] text-gray-500 font-medium space-y-0.5 pt-1">
                  <div className="flex items-center justify-center gap-1">
                    <MapPin className="w-3 h-3 text-amber-500" />
                    <span>{settings?.addressAr || 'شارع فلسطين، المركز التجاري، الجزائر'}</span>
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <Phone className="w-3 h-3 text-amber-500" />
                    <span className="font-mono dir-ltr">{settings?.phone || '0550 12 34 56'}</span>
                  </div>
                </div>
              </div>

              {/* Receipt Title & Meta Info */}
              <div className="bg-[#FFFBF7] p-2.5 rounded-xl border border-amber-200/80 text-[11px] space-y-1 font-bold">
                <div className="flex justify-between items-center text-purple-950 font-black border-b border-gray-200/80 pb-1 mb-1">
                  <span>وصل مبيعات نقدية</span>
                  <span className="font-mono">{sale.invoiceNumber}</span>
                </div>
                
                <div className="flex justify-between text-gray-600">
                  <span>التاريخ والوقت:</span>
                  <span className="font-mono text-gray-900">{formattedDate}</span>
                </div>
                
                <div className="flex justify-between text-gray-600">
                  <span>العميل:</span>
                  <span className="text-gray-900 font-black">{sale.customerNameAr || 'زبون عادي'}</span>
                </div>

                {sale.userNameAr && (
                  <div className="flex justify-between text-gray-600">
                    <span>البائع:</span>
                    <span className="text-gray-900">{sale.userNameAr}</span>
                  </div>
                )}

                <div className="flex justify-between text-gray-600">
                  <span>طريقة الدفع:</span>
                  <span className="text-rose-600 font-black">
                    {sale.paymentMethod === 'CREDIT' ? 'بيع بالدين' : 'نقداً (كاش)'}
                  </span>
                </div>
              </div>

              {/* Detailed Items Table Header */}
              <div className="space-y-2">
                <div className="grid grid-cols-12 text-[10px] font-black text-gray-500 border-b border-gray-300 pb-1 px-1">
                  <span className="col-span-6 text-right">السلعة / البيان</span>
                  <span className="col-span-2 text-center">الكمية</span>
                  <span className="col-span-4 text-left">المجموع</span>
                </div>

                {/* Items List */}
                <div className="space-y-1.5 divide-y divide-gray-100">
                  {sale.items.map((item, idx) => (
                    <div key={item.id || idx} className="grid grid-cols-12 text-[11px] font-bold pt-1.5 text-gray-800">
                      <div className="col-span-6 pr-1">
                        <div className="line-clamp-2 text-purple-950 font-black">{item.productNameAr}</div>
                        <div className="text-[9px] text-gray-400 font-mono">
                          {item.unitPrice.toLocaleString()} د.ج × {item.quantity}
                        </div>
                      </div>
                      <div className="col-span-2 text-center font-mono font-black my-auto">
                        {item.quantity}
                      </div>
                      <div className="col-span-4 text-left font-mono font-black text-rose-600 my-auto">
                        {item.totalPrice.toLocaleString()} د.ج
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Summary */}
              <div className="border-t border-dashed border-gray-300 pt-2.5 space-y-1.5">
                <div className="flex justify-between text-gray-600 text-[11px] font-bold">
                  <span>المجموع الفرعي:</span>
                  <span className="font-mono">{subtotalCalc.toLocaleString()} د.ج</span>
                </div>

                {sale.discountAmount && sale.discountAmount > 0 ? (
                  <div className="flex justify-between text-emerald-700 text-[11px] font-bold">
                    <span>خصم ممنوح:</span>
                    <span className="font-mono">-{sale.discountAmount.toLocaleString()} د.ج</span>
                  </div>
                ) : null}

                <div className="flex justify-between items-center text-sm font-black bg-gradient-to-r from-purple-950 to-indigo-900 text-amber-300 p-2.5 rounded-xl shadow-xs">
                  <span>الإجمالي النهائي:</span>
                  <span className="font-mono text-base">{sale.grandTotal.toLocaleString()} د.ج</span>
                </div>
              </div>

              {/* Receipt Footer Notes & Barcode */}
              <div className="border-t border-gray-200 pt-3 text-center space-y-2">
                <p className="text-[10px] font-black text-purple-950">
                  شكراً لزيارتكم محلات زروقي للحلويات! ✨
                </p>
                <p className="text-[9px] text-gray-500 font-semibold">
                  بضاعتكم محل اهتمامنا • يرجى الاحتفاظ بالفاتورة
                </p>
                <div className="flex flex-col items-center justify-center pt-1 space-y-0.5">
                  <Barcode className="w-32 h-7 text-gray-700" />
                  <span className="text-[9px] font-mono text-gray-400">{sale.invoiceNumber}</span>
                </div>
              </div>
            </div>
          ) : (

            /* OPTION 2: FULL A4 PROFESSIONAL TAX INVOICE FORMAT */
            <div
              id="printable-invoice-area"
              className="w-full bg-white p-8 rounded-3xl shadow-md border border-gray-200 text-gray-900 font-sans space-y-6 text-xs"
            >
              {/* Luxury A4 Header */}
              <div className="flex justify-between items-start border-b-2 border-purple-950 pb-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-[#4C1D95] to-[#F59E0B] rounded-2xl shadow-md">
                    <BrandLogo size="lg" />
                  </div>
                  <div>
                    <h1 className="text-xl font-black text-purple-950">{settings?.storeNameAr || 'مؤسسة زروقي للحلويات والمستلزمات'}</h1>
                    <p className="text-xs text-gray-500 font-bold mt-0.5">{settings?.storeNameFr || 'Zerrouki Sweets & Pastry Materials'}</p>
                    <div className="text-[11px] text-gray-600 mt-2 space-y-0.5 font-medium">
                      <div>المقر الاجتماعي: {settings?.addressAr || 'شارع فلسطين، المركز التجاري، الجزائر العاصمة'}</div>
                      <div>الهاتف: <span className="font-mono">{settings?.phone || '0550 12 34 56'}</span> • NIF: <span className="font-mono">001234567890123</span></div>
                    </div>
                  </div>
                </div>

                <div className="text-left bg-[#FFFBF7] p-4 rounded-2xl border border-amber-200 space-y-1">
                  <span className="text-[10px] font-black bg-gradient-to-r from-purple-900 to-indigo-900 text-amber-300 px-2.5 py-1 rounded-lg inline-block mb-1">
                    فاتورة بيع رسمية
                  </span>
                  <div className="text-base font-black text-purple-950 font-mono">{sale.invoiceNumber}</div>
                  <div className="text-[11px] text-gray-500 font-bold">التاريخ: {formattedDate}</div>
                </div>
              </div>

              {/* Customer & Payment Info Section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#FFFBF7] p-4 rounded-2xl border border-amber-200 space-y-1.5">
                  <h4 className="font-black text-purple-950 text-xs border-b border-amber-200/80 pb-1 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span>بيانات العميل (الزبون):</span>
                  </h4>
                  <div className="flex justify-between font-bold">
                    <span className="text-gray-500">الاسم واللقب:</span>
                    <span className="text-purple-950 font-black">{sale.customerNameAr || 'زبون عادي'}</span>
                  </div>
                  {sale.customerPhone && (
                    <div className="flex justify-between font-bold">
                      <span className="text-gray-500">رقم الهاتف:</span>
                      <span className="font-mono">{sale.customerPhone}</span>
                    </div>
                  )}
                </div>

                <div className="bg-[#FFFBF7] p-4 rounded-2xl border border-amber-200 space-y-1.5">
                  <h4 className="font-black text-purple-950 text-xs border-b border-amber-200/80 pb-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-500" />
                    <span>تفاصيل العملية والمعاملة:</span>
                  </h4>
                  <div className="flex justify-between font-bold">
                    <span className="text-gray-500">طريقة التسديد:</span>
                    <span className="text-rose-600 font-black">
                      {sale.paymentMethod === 'CREDIT' ? 'بيع بالدين (آجل)' : 'دفع نقدي (كاش)'}
                    </span>
                  </div>
                  {sale.userNameAr && (
                    <div className="flex justify-between font-bold">
                      <span className="text-gray-500">الموظف المسجل:</span>
                      <span className="text-gray-800">{sale.userNameAr}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Detailed Table */}
              <div className="border border-purple-100 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-right text-xs">
                  <thead className="bg-gradient-to-r from-purple-950 to-indigo-900 text-amber-300 font-black">
                    <tr>
                      <th className="p-3 text-center w-12">#</th>
                      <th className="p-3">اسم المنتج / التوصيف والتفاصيل</th>
                      <th className="p-3 text-center">الكمية</th>
                      <th className="p-3 text-left">سعر الوحدة</th>
                      <th className="p-3 text-left">المجموع الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 font-bold text-gray-800">
                    {sale.items.map((item, idx) => (
                      <tr key={item.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-purple-50/40'}>
                        <td className="p-3 text-center font-mono text-gray-500">{idx + 1}</td>
                        <td className="p-3 font-black text-purple-950">{item.productNameAr}</td>
                        <td className="p-3 text-center font-mono font-black">{item.quantity}</td>
                        <td className="p-3 text-left font-mono text-gray-600">{item.unitPrice.toLocaleString()} د.ج</td>
                        <td className="p-3 text-left font-mono font-black text-rose-600">
                          {item.totalPrice.toLocaleString()} د.ج
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Financial Summary Box */}
              <div className="flex justify-between items-end border-t border-gray-200 pt-4">
                <div className="space-y-1 text-gray-500 text-[11px]">
                  <p className="font-black text-purple-950">ملاحظات وشروط الفاتورة:</p>
                  <p>• الفاتورة سارية ومحررة إلكترونياً من نظام زروقي للحلويات.</p>
                  <p>• تشمل جميع الرسوم والضرائب المستحقة للبيع المباشر.</p>
                </div>

                <div className="w-72 bg-[#FFFBF7] p-4 rounded-2xl border border-amber-200 space-y-2">
                  <div className="flex justify-between text-gray-600 font-bold text-xs">
                    <span>المجموع الصافي:</span>
                    <span className="font-mono">{subtotalCalc.toLocaleString()} د.ج</span>
                  </div>

                  {sale.discountAmount && sale.discountAmount > 0 ? (
                    <div className="flex justify-between text-emerald-700 font-bold text-xs">
                      <span>الخصم الممنوح:</span>
                      <span className="font-mono">-{sale.discountAmount.toLocaleString()} د.ج</span>
                    </div>
                  ) : null}

                  <div className="flex justify-between items-center text-purple-950 font-black text-sm border-t border-amber-200 pt-2">
                    <span>المبلغ المستحق:</span>
                    <span className="text-base font-mono text-rose-600">{sale.grandTotal.toLocaleString()} د.ج</span>
                  </div>
                </div>
              </div>

              {/* Signatures & Stamp Block */}
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-dashed border-gray-300 text-center font-bold text-xs text-gray-700">
                <div>
                  <p className="mb-8 font-black text-purple-950">توقيع واستلام الزبون:</p>
                  <div className="h-10 border-b border-gray-300 border-dashed w-48 mx-auto" />
                </div>
                <div>
                  <p className="mb-8 font-black text-purple-950">ختم وتوقيع إدارَة المحل:</p>
                  <div className="h-10 border-b border-gray-300 border-dashed w-48 mx-auto" />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Action Footer (Screen Only) */}
        <div className="p-4 bg-white border-t border-gray-200 flex items-center gap-3 no-print">
          <button
            onClick={handlePrint}
            className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xl shadow-orange-500/25 hover:brightness-110 transition-all active:scale-98 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الفاتورة ({invoiceType === '80MM' ? 'وصل حراري 80mm' : 'فاتورة رسمية A4'}) ✨</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-3.5 rounded-2xl border border-gray-300 font-black text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>

    </div>
  );
};
