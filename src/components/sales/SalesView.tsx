import React, { useEffect, useState } from 'react';
import {
  ReceiptText, Search, Printer, Ban, RotateCcw, Eye, Calendar,
  CheckCircle2, XCircle, AlertCircle, ShieldAlert, Lock, UserCheck, Filter, RefreshCw
} from 'lucide-react';
import { api } from '../../api/client';
import { Sale } from '../../types';
import { ManagerPinModal } from '../common/ManagerPinModal';
import { ThermalReceiptModal } from '../common/ThermalReceiptModal';
import { SaleDetailInspectorModal } from './SaleDetailInspectorModal';

export const SalesView: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaffFilter, setSelectedStaffFilter] = useState('');

  // Modals state
  const [inspectingSale, setInspectingSale] = useState<Sale | null>(null);
  const [thermalSale, setThermalSale] = useState<Sale | null>(null);

  // Cancellation modal state
  const [cancellingSaleId, setCancellingSaleId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      setLoading(true);
      const res = await api.getSales();
      setSales(res);
    } catch (e) {
      console.error('Failed to load sales:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCancelSale = async () => {
    if (!cancellingSaleId) return;
    try {
      await api.cancelSale(cancellingSaleId, {
        reason: cancelReason || 'إلغاء بطلب الإدارة العامة',
        managerPin: '1234'
      });
      setCancellingSaleId(null);
      setCancelReason('');
      loadSales();
    } catch (err: any) {
      alert(err.message || 'فشلت عملية إلغاء الفاتورة');
    }
  };

  // Staff List for Filter
  const staffList = Array.from(new Set(sales.map((s) => s.createdByUserName || 'كاشير المحل'))).filter(Boolean);

  const filteredSales = sales.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      s.invoiceNumber.toLowerCase().includes(q) ||
      (s.customerNameAr && s.customerNameAr.toLowerCase().includes(q)) ||
      s.createdByUserName.toLowerCase().includes(q);

    const matchesStaff = !selectedStaffFilter || (s.createdByUserName || 'كاشير المحل') === selectedStaffFilter;

    return matchesQuery && matchesStaff;
  });

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-200 dir-rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-purple-950 flex items-center gap-2">
            <ReceiptText className="w-6 h-6 text-amber-500" />
            سجل وتدقيق فواتير الموظفين والعمال (Sales Audit Ledger)
          </h1>
          <p className="text-xs text-slate-500 font-bold mt-1">
            مراجعة كاملة للفواتير الصادرة من العمال (للقراءة والتدقيق فقط 🔒) بالتاريخ والدقيقة لمساءلة الموظفين وحفظ الحقوق
          </p>
        </div>

        <button
          onClick={loadSales}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-2xl text-purple-950 cursor-pointer flex items-center gap-1.5 text-xs font-black self-start sm:self-auto"
          title="تحديث البيانات"
        >
          <RefreshCw className="w-4 h-4 text-amber-600" />
          <span>تحديث السجل</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث برقم الفاتورة، اسم الموظف، أو اسم العميل..."
            className="w-full pr-9 pl-4 py-2 bg-[#FAF7F2] border border-amber-200 rounded-xl text-xs font-bold text-purple-950 outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-black text-slate-600">تصفية حسب العامل:</label>
          <select
            value={selectedStaffFilter}
            onChange={(e) => setSelectedStaffFilter(e.target.value)}
            className="px-3 py-2 bg-[#FAF7F2] border border-amber-200 rounded-xl text-xs font-bold text-purple-950 outline-none"
          >
            <option value="">جميع الموظفين / العمال</option>
            {staffList.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-2xl border border-purple-100 shadow-xs overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-purple-950 to-indigo-900 text-amber-300 font-black flex justify-between items-center text-xs">
          <span>جدول الفواتير المنفذة المسجلة بالنظام ({filteredSales.length} فاتورة)</span>
          <span className="bg-amber-400/20 text-amber-300 text-[10px] px-2.5 py-0.5 rounded-full border border-amber-300/30">
            وضع تدقيق المدير العام 🔒
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-gradient-to-r from-purple-50 via-rose-50 to-amber-50 text-purple-950 font-black border-b border-purple-100">
              <tr>
                <th className="p-3.5">رقم الفاتورة</th>
                <th className="p-3.5">التاريخ والوقت بالثواني</th>
                <th className="p-3.5">الموظف / العامل الصادر منه</th>
                <th className="p-3.5">العميل المستلم</th>
                <th className="p-3.5">المبلغ الإجمالي</th>
                <th className="p-3.5">طريقة التسديد</th>
                <th className="p-3.5">حالة الفاتورة</th>
                <th className="p-3.5 text-center">التدقيق والطباعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                    جاري تحميل سجل فواتير العمال والموظفين...
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                    لا توجد فواتير مبيعات مطابقة لعملية البحث
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const formattedTime = new Date(sale.createdAt).toLocaleString('ar-DZ', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  });

                  return (
                    <tr key={sale.id} className="hover:bg-[#FAF7F2]/50 transition-colors">
                      <td className="p-3.5 font-black text-purple-950 font-mono">{sale.invoiceNumber}</td>
                      <td className="p-3.5 font-mono text-slate-500 font-bold dir-ltr text-right">{formattedTime}</td>
                      <td className="p-3.5 font-black text-purple-950 bg-amber-50/50 rounded-lg">
                        {sale.createdByUserName || 'كاشير المحل'}
                      </td>
                      <td className="p-3.5 font-bold">{sale.customerNameAr || 'زبون عادي (مباشر)'}</td>
                      <td className="p-3.5 font-black text-amber-900 font-mono text-sm">
                        {sale.grandTotal.toLocaleString()} د.ج
                      </td>
                      <td className="p-3.5 font-bold text-slate-600">
                        <span className="bg-slate-100 px-2.5 py-1 rounded-lg text-[10px] border border-slate-200">
                          {sale.paymentMethod === 'CASH'
                            ? 'نقداً (Cash)'
                            : sale.paymentMethod === 'CARD'
                            ? 'بطاقة (Card)'
                            : sale.paymentMethod === 'DEBT'
                            ? 'دين (Debt)'
                            : sale.paymentMethod}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {sale.status === 'COMPLETED' && (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 w-fit border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            مكتملة 🟢
                          </span>
                        )}
                        {sale.status === 'CANCELLED' && (
                          <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 w-fit border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            ملغاة 🔴
                          </span>
                        )}
                        {sale.status === 'PARTIALLY_RETURNED' && (
                          <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 w-fit border border-amber-200">
                            <RotateCcw className="w-3 h-3 text-amber-600" />
                            مرتجع جزئي 🟡
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Detailed Audit Inspection Button */}
                          <button
                            onClick={() => setInspectingSale(sale)}
                            className="px-3 py-1.5 rounded-xl bg-purple-950 text-amber-300 hover:bg-purple-900 font-black text-[11px] flex items-center gap-1 cursor-pointer shadow-xs"
                            title="عرض وتدقيق مفصل للفاتورة (للقراءة فقط 🔒)"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-400" />
                            <span>مراجعة وتدقيق 🔍</span>
                          </button>

                          {/* Thermal Print Button */}
                          <button
                            onClick={() => setThermalSale(sale)}
                            className="p-1.5 rounded-xl bg-slate-100 text-purple-950 hover:bg-slate-200 cursor-pointer"
                            title="طباعة تكت حراري (Thermal Receipt)"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Manager Cancellation Button */}
                          {sale.status === 'COMPLETED' && (
                            <button
                              onClick={() => {
                                setCancellingSaleId(sale.id);
                                setIsPinModalOpen(true);
                              }}
                              className="p-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                              title="إلغاء الفاتورة (موافقة المدير)"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* Detailed Read-Only Invoice Inspector & Audit Modal */}
      {inspectingSale && (
        <SaleDetailInspectorModal
          sale={inspectingSale}
          onClose={() => setInspectingSale(null)}
        />
      )}

      {/* Thermal Receipt Print Modal */}
      {thermalSale && (
        <ThermalReceiptModal
          sale={thermalSale}
          onClose={() => setThermalSale(null)}
        />
      )}

      {/* Manager Approval PIN Modal for cancellation */}
      <ManagerPinModal
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          setCancellingSaleId(null);
        }}
        onSuccess={handleConfirmCancelSale}
        titleAr="تأكيد إلغاء الفاتورة برمز المدير"
      />
    </div>
  );
};
