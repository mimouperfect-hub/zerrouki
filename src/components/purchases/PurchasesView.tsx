import React, { useEffect, useState } from 'react';
import {
  Truck, Plus, Search, Calendar, CheckCircle2, DollarSign, Eye, AlertCircle,
  FileSpreadsheet, Filter, RefreshCw, Sparkles, Building2, Wallet, Layers, Printer
} from 'lucide-react';
import { api } from '../../api/client';
import { Purchase, Supplier, Product } from '../../types';
import { PurchaseInvoiceModal } from '../common/PurchaseInvoiceModal';
import { NewPurchaseInvoiceModal } from './NewPurchaseInvoiceModal';
import { PaySupplierDebtModal } from './PaySupplierDebtModal';

export const PurchasesView: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'ALL' | 'PAID' | 'PARTIAL' | 'CREDIT'>('ALL');

  // Selected Purchase view modal
  const [selectedPurchaseView, setSelectedPurchaseView] = useState<Purchase | null>(null);

  // New Multi-Item Purchase Modal state
  const [isNewPurchaseModalOpen, setIsNewPurchaseModalOpen] = useState(false);

  // Pay Supplier Debt Modal state
  const [isPayDebtModalOpen, setIsPayDebtModalOpen] = useState(false);
  const [selectedSupplierForPayment, setSelectedSupplierForPayment] = useState<Supplier | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [purs, sups, prods] = await Promise.all([
        api.getPurchases(),
        api.getSuppliers(),
        api.getProducts()
      ]);
      setPurchases(purs);
      setSuppliers(sups);
      setProducts(prods);
    } catch (e) {
      console.error('Failed to load purchases data:', e);
    } finally {
      setLoading(false);
    }
  };

  // KPI Calculations
  const totalPurchasesAmount = purchases.reduce((sum, p) => sum + (p.grandTotal || 0), 0);
  const totalPaidAmount = purchases.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
  const totalSupplierDebt = suppliers.reduce((sum, s) => sum + (s.totalDebt || 0), 0);

  // Filtered Purchases List
  const filteredPurchases = purchases.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.invoiceNumber.toLowerCase().includes(q) ||
      p.supplierNameAr.toLowerCase().includes(q);

    const matchesSupplier = !selectedSupplierFilter || p.supplierId === selectedSupplierFilter;

    let matchesStatus = true;
    if (paymentStatusFilter === 'PAID') matchesStatus = p.paymentStatus === 'PAID';
    if (paymentStatusFilter === 'PARTIAL') matchesStatus = p.paymentStatus === 'PARTIALLY_PAID';
    if (paymentStatusFilter === 'CREDIT') matchesStatus = p.paymentStatus === 'CREDIT';

    return matchesSearch && matchesSupplier && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-purple-950 flex items-center gap-2">
            <Truck className="w-6 h-6 text-amber-500" />
            إدارة المشتريات والشحنات وفواتير الموردين
          </h1>
          <p className="text-xs text-slate-500 font-bold mt-1">
            تسجيل الفواتير الواردة، تحديث تكاليف الشراء، متابعة الديون وحسابات الشركات الموزعة
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (suppliers.length > 0) {
                setSelectedSupplierForPayment(suppliers[0]);
                setIsPayDebtModalOpen(true);
              } else {
                alert('لا يوجد موردون مسجلون حالياً');
              }
            }}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-900 to-indigo-900 text-amber-300 font-black text-xs shadow-md hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer"
          >
            <DollarSign className="w-4 h-4 text-amber-400" />
            <span>تسديد مستحقات مورد 💵</span>
          </button>

          <button
            onClick={() => setIsNewPurchaseModalOpen(true)}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white font-black text-xs shadow-md hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>تسجيل فاتورة شراء جديدة ✨</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-bold">إجمالي حجم المشتريات</span>
            <div className="text-lg font-black text-purple-950 font-mono mt-0.5">
              {totalPurchasesAmount.toLocaleString()} د.ج
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">{purchases.length} فاتورة شراء مسجلة</span>
          </div>
          <div className="p-3 bg-purple-100 text-purple-900 rounded-2xl">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-bold">المبالغ المدفوعة للموردين</span>
            <div className="text-lg font-black text-emerald-700 font-mono mt-0.5">
              {totalPaidAmount.toLocaleString()} د.ج
            </div>
            <span className="text-[10px] text-emerald-600 font-bold">تم تسديدها نقداً وبنوك</span>
          </div>
          <div className="p-3 bg-emerald-100 text-emerald-800 rounded-2xl">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-bold">إجمالي ديون الموردين المتبقية</span>
            <div className="text-lg font-black text-rose-600 font-mono mt-0.5">
              {totalSupplierDebt.toLocaleString()} د.ج
            </div>
            <span className="text-[10px] text-rose-500 font-bold">مستحقة للشركات والموردين</span>
          </div>
          <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-bold">الموردين المسجلين</span>
            <div className="text-lg font-black text-amber-900 font-mono mt-0.5">
              {suppliers.length} مورد شركة
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">شركات ومؤسسات التوزيع</span>
          </div>
          <div className="p-3 bg-amber-100 text-amber-900 rounded-2xl">
            <Building2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث برقم الفاتورة أو اسم المورد..."
            className="w-full pr-9 pl-4 py-2 bg-[#FAF7F2] border border-amber-200 rounded-xl text-xs font-bold text-purple-950 outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* Supplier Filter */}
        <select
          value={selectedSupplierFilter}
          onChange={(e) => setSelectedSupplierFilter(e.target.value)}
          className="px-3 py-2 bg-[#FAF7F2] border border-amber-200 rounded-xl text-xs font-bold text-purple-950 outline-none"
        >
          <option value="">جميع الموردين</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nameAr} {s.companyName ? `(${s.companyName})` : ''}
            </option>
          ))}
        </select>

        {/* Payment Status Filter Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setPaymentStatusFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer ${
              paymentStatusFilter === 'ALL' ? 'bg-white text-purple-950 shadow-2xs' : 'text-slate-600'
            }`}
          >
            الكل
          </button>
          <button
            onClick={() => setPaymentStatusFilter('PAID')}
            className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer ${
              paymentStatusFilter === 'PAID' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600'
            }`}
          >
            خالصة المدفوعات 🟢
          </button>
          <button
            onClick={() => setPaymentStatusFilter('PARTIAL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer ${
              paymentStatusFilter === 'PARTIAL' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-600'
            }`}
          >
            مدفوع جزء 🟡
          </button>
          <button
            onClick={() => setPaymentStatusFilter('CREDIT')}
            className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer ${
              paymentStatusFilter === 'CREDIT' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600'
            }`}
          >
            آجلة بالكامل 🔴
          </button>
        </div>

        <button
          onClick={loadData}
          className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-purple-950 transition-colors cursor-pointer"
          title="تحديث البيانات"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-2xl border border-purple-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-gradient-to-r from-purple-50 via-rose-50 to-amber-50 text-purple-950 font-black border-b border-purple-100">
              <tr>
                <th className="p-3.5">رقم فاتورة الشراء</th>
                <th className="p-3.5">تاريخ التوريد</th>
                <th className="p-3.5">المورد والشركة</th>
                <th className="p-3.5">عدد الأصناف</th>
                <th className="p-3.5">مبلغ الفاتورة</th>
                <th className="p-3.5">المبلغ المدفوع</th>
                <th className="p-3.5">الدين المتبقي</th>
                <th className="p-3.5">حالة الدفع</th>
                <th className="p-3.5 text-center">العمليات والفاتورة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-400 font-bold">
                    جاري تحميل سجل المشتريات...
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-400 font-bold">
                    لا توجد فواتير شراء مسجلة تطابق شروط الفلترة
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p) => {
                  const sup = suppliers.find((s) => s.id === p.supplierId);

                  return (
                    <tr key={p.id} className="hover:bg-[#FAF7F2]/50 transition-colors">
                      <td className="p-3.5">
                        <div className="font-black text-[#2A160A] font-mono">{p.invoiceNumber}</div>
                        {p.supplierInvoiceRef && (
                          <div className="text-[10px] text-slate-400 font-mono font-bold">
                            مرجع: {p.supplierInvoiceRef}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-slate-500">
                        {p.purchaseDate || new Date(p.createdAt).toLocaleDateString('ar-DZ')}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-purple-950">{p.supplierNameAr}</div>
                        {sup?.companyName && (
                          <div className="text-[10px] text-slate-400 font-bold">{sup.companyName}</div>
                        )}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-slate-700">
                        {p.items ? `${p.items.length} أصناف` : 'صنف واحد'}
                      </td>
                      <td className="p-3.5 font-black text-amber-900 font-mono">
                        {p.grandTotal.toLocaleString()} د.ج
                      </td>
                      <td className="p-3.5 font-mono font-black text-emerald-700">
                        {p.paidAmount.toLocaleString()} د.ج
                      </td>
                      <td className="p-3.5 font-mono font-black text-rose-600">
                        {p.remainingDebt.toLocaleString()} د.ج
                      </td>
                      <td className="p-3.5">
                        {p.remainingDebt === 0 ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full">
                            خالصة المدفوعات 🟢
                          </span>
                        ) : p.paidAmount > 0 ? (
                          <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2.5 py-1 rounded-full border border-amber-200">
                            متبقي جزء 🟡
                          </span>
                        ) : (
                          <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2.5 py-1 rounded-full">
                            آجلة بالكامل 🔴
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedPurchaseView(p)}
                            className="px-3 py-1.5 rounded-xl bg-purple-950 text-amber-300 hover:bg-purple-900 transition-colors font-black text-[11px] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>عرض وتفاصيل</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedPurchaseView(p);
                              setTimeout(() => window.print(), 250);
                            }}
                            className="p-1.5 rounded-xl bg-amber-100 text-amber-900 hover:bg-amber-200 transition-colors font-black text-[11px] inline-flex items-center gap-1 cursor-pointer"
                            title="طباعة الفاتورة التفصيلية مباشرة"
                          >
                            <Printer className="w-3.5 h-3.5 text-amber-700" />
                          </button>

                          {sup && sup.totalDebt > 0 && (
                            <button
                              onClick={() => {
                                setSelectedSupplierForPayment(sup);
                                setIsPayDebtModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors font-black text-[11px] inline-flex items-center gap-1 cursor-pointer"
                              title="تسديد دين المورد"
                            >
                              <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
                              <span>تسديد دين</span>
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

      {/* New Multi-Item Purchase Invoice Modal */}
      <NewPurchaseInvoiceModal
        isOpen={isNewPurchaseModalOpen}
        onClose={() => setIsNewPurchaseModalOpen(false)}
        suppliers={suppliers}
        products={products}
        onPurchaseCreated={() => loadData()}
      />

      {/* Pay Supplier Debt Modal */}
      {selectedSupplierForPayment && (
        <PaySupplierDebtModal
          isOpen={isPayDebtModalOpen}
          onClose={() => {
            setIsPayDebtModalOpen(false);
            setSelectedSupplierForPayment(null);
          }}
          supplier={selectedSupplierForPayment}
          onPaymentSuccess={() => loadData()}
        />
      )}

      {/* Printable Purchase Invoice Modal */}
      {selectedPurchaseView && (
        <PurchaseInvoiceModal
          purchase={selectedPurchaseView}
          supplier={suppliers.find((s) => s.id === selectedPurchaseView.supplierId)}
          products={products}
          onClose={() => setSelectedPurchaseView(null)}
        />
      )}
    </div>
  );
};
