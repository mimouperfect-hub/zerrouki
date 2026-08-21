import React, { useEffect, useState } from 'react';
import {
  BarChart3, TrendingUp, DollarSign, FileSpreadsheet, Download, Calendar,
  PieChart as PieIcon, RefreshCw, Printer, Search, ArrowUpRight, ArrowDownRight,
  Package, ShoppingBag, Wallet, Users, Award, ShieldCheck, Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { api } from '../../api/client';
import { SystemSettings } from '../../types';

export const ReportsView: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'STATEMENT' | 'PRODUCT_PROFIT' | 'STOCK_VALUATION' | 'STAFF_CATEGORY'>('STATEMENT');
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    loadReports();
    api.getSettings().then(setSettings).catch(console.error);
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardReports();
      setData(res);
    } catch (e) {
      console.error('Failed to load financial reports:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  const exportExcel = () => {
    if (!data) return;

    // Sheet 1: Financial Income Statement
    const statementSheet = [
      [`${settings?.storeNameAr || 'مؤسسة زروقي للحلويات'} - كشف قائمة الدخل والأرباح الصافية`],
      ['تاريخ الإصدار:', new Date().toLocaleDateString('ar-DZ')],
      [],
      ['البند المالي', 'القيمة بالدينار الجزائري (DZD)'],
      ['إجمالي مبيعات اليوم', data.todaySalesAmount || 0],
      ['إجمالي مبيعات المحل الكلية', data.totalSalesAmount || 0],
      ['تكلفة البضاعة المباعة المباشرة (COGS)', data.totalCogs || 0],
      ['مجمل الربح الإجمالي (Gross Profit)', (data.totalSalesAmount || 0) - (data.totalCogs || 0)],
      ['المصاريف التشغيلية الكلية', data.totalExpensesAmount || 0],
      ['صافي الأرباح الصافية المحققة (Net Profit)', data.netProfit || 0],
      ['تقييم المخزون بسعر الشراء (Wholesale Valuation)', data.stockValuationCost || 0],
      ['تقييم المخزون بسعر البيع (Retail Valuation)', data.stockValuationRetail || 0]
    ];

    // Sheet 2: Per-Product Profitability
    const productRows = [
      ['اسم المنتج', 'الباركود', 'سعر الشراء', 'سعر البيع', 'الكمية المباعة', 'إجمالي الإيراد', 'إجمالي التكلفة', 'صافي الربح', 'هامش الربح %']
    ];
    if (data.productProfitability) {
      data.productProfitability.forEach((p: any) => {
        productRows.push([
          p.productNameAr,
          p.barcode,
          p.purchasePrice,
          p.unitPrice,
          p.totalQuantitySold,
          p.totalRevenue,
          p.totalCost,
          p.netProfit,
          `${p.marginPercent}%`
        ]);
      });
    }

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.aoa_to_sheet(statementSheet);
    const ws2 = XLSX.utils.aoa_to_sheet(productRows);

    XLSX.utils.book_append_sheet(wb, ws1, 'قائمة الدخل والسيولة');
    XLSX.utils.book_append_sheet(wb, ws2, 'ربحية المنتجات');

    XLSX.writeFile(wb, `Zerrouki_Financial_Report_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  if (loading || !data) {
    return (
      <div className="p-8 text-center text-purple-950 font-bold flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-purple-950 rounded-full animate-spin" />
        <div>جاري حساب التقارير المالية والأرباح الصافية بدقة...</div>
      </div>
    );
  }

  // Key Financial Metrics
  const grossSales = data.totalSalesAmount || 0;
  const cogs = data.totalCogs || 0;
  const grossProfit = Math.max(0, grossSales - cogs);
  const grossMarginPercent = grossSales > 0 ? Math.round((grossProfit / grossSales) * 100) : 0;
  const expenses = data.totalExpensesAmount || 0;
  const netProfit = data.netProfit || 0;
  const netMarginPercent = grossSales > 0 ? Math.round((netProfit / grossSales) * 100) : 0;

  const stockCost = data.stockValuationCost || 0;
  const stockRetail = data.stockValuationRetail || 0;
  const potentialProfitInStock = Math.max(0, stockRetail - stockCost);

  // Filtered Product Profitability
  const filteredProducts = (data.productProfitability || []).filter(
    (p: any) =>
      !productSearch ||
      p.productNameAr.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.barcode.includes(productSearch)
  );

  const COLORS = ['#2E1065', '#D97706', '#059669', '#DC2626', '#2563EB', '#9333EA'];

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-200 dir-rtl">
      {/* Print Styles for Executive Financial Report */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-report-area, #printable-report-area * {
            visibility: visible !important;
          }
          #printable-report-area {
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl font-black text-purple-950 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-amber-500" />
            مركز التقارير المالية وحساب الأرباح الصافية الدقيقة
          </h1>
          <p className="text-xs text-slate-500 font-bold mt-1">
            تحليل دقيق ومفصل: المبيعات، تكلفة البضاعة المباعة (COGS)، مجمل الأرباح، المصاريف، وصافي الربح المحقق
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrintReport}
            className="px-4 py-2.5 rounded-2xl bg-purple-950 text-amber-300 font-black text-xs hover:bg-purple-900 transition-all flex items-center gap-2 shadow-md cursor-pointer border border-amber-300/30"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>طباعة التقرير التنفيذي 🖨️</span>
          </button>

          <button
            onClick={exportExcel}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black text-xs shadow-md hover:brightness-110 flex items-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>تصدير تقرير متكامل (Excel) ✨</span>
          </button>
        </div>
      </div>

      {/* Top Financial KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-bold">إجمالي مبيعات المحل الكلية</span>
            <div className="text-lg font-black text-emerald-700 font-mono mt-0.5">
              {grossSales.toLocaleString()} د.ج
            </div>
            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              <span>اليوم: {data.todaySalesAmount?.toLocaleString() || 0} د.ج</span>
            </span>
          </div>
          <div className="p-3 bg-emerald-100 text-emerald-800 rounded-2xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-bold">تكلفة البضاعة المباعة (COGS)</span>
            <div className="text-lg font-black text-amber-900 font-mono mt-0.5">
              {cogs.toLocaleString()} د.ج
            </div>
            <span className="text-[10px] text-amber-700 font-bold">تكلفة الشراء المباشرة 🛒</span>
          </div>
          <div className="p-3 bg-amber-100 text-amber-900 rounded-2xl">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-bold">المصاريف التشغيلية والأجور</span>
            <div className="text-lg font-black text-rose-600 font-mono mt-0.5">
              {expenses.toLocaleString()} د.ج
            </div>
            <span className="text-[10px] text-rose-500 font-bold">مصاريف المحل والرواتب 🔻</span>
          </div>
          <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl">
            <ArrowDownRight className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-950 to-indigo-900 text-amber-300 p-4 rounded-2xl shadow-md flex items-center justify-between border border-amber-300/30">
          <div>
            <span className="text-[11px] text-purple-200 font-bold">صافي الأرباح الحقيقية الصافية</span>
            <div className="text-xl font-black text-amber-300 font-mono mt-0.5">
              {netProfit.toLocaleString()} د.ج
            </div>
            <span className="text-[10px] text-amber-300/80 font-bold">هامش الربح الصافي: {netMarginPercent}% ✨</span>
          </div>
          <div className="p-3 bg-amber-400/20 text-amber-300 rounded-2xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center gap-2 border-b border-purple-100 pb-3 no-print">
        <button
          onClick={() => setActiveTab('STATEMENT')}
          className={`px-5 py-2.5 rounded-2xl font-black text-xs transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'STATEMENT'
              ? 'bg-purple-950 text-amber-300 shadow-md'
              : 'bg-white text-slate-600 border border-purple-100 hover:bg-purple-50'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>قائمة الدخل والأرباح الصافية</span>
        </button>

        <button
          onClick={() => setActiveTab('PRODUCT_PROFIT')}
          className={`px-5 py-2.5 rounded-2xl font-black text-xs transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'PRODUCT_PROFIT'
              ? 'bg-purple-950 text-amber-300 shadow-md'
              : 'bg-white text-slate-600 border border-purple-100 hover:bg-purple-50'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>ربحية منتجات الحلويات (Product Profitability)</span>
        </button>

        <button
          onClick={() => setActiveTab('STOCK_VALUATION')}
          className={`px-5 py-2.5 rounded-2xl font-black text-xs transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'STOCK_VALUATION'
              ? 'bg-purple-950 text-amber-300 shadow-md'
              : 'bg-white text-slate-600 border border-purple-100 hover:bg-purple-50'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>تقييم المخزون والأرباح المتوقعة</span>
        </button>

        <button
          onClick={() => setActiveTab('STAFF_CATEGORY')}
          className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'STAFF_CATEGORY'
              ? 'bg-purple-950 text-amber-300 shadow-md'
              : 'bg-white text-slate-600 border border-purple-100 hover:bg-purple-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>أداء البائع والمبيعات حسب التصنيف</span>
        </button>
      </div>

      {/* TAB 1: FINANCIAL INCOME STATEMENT & CHARTS */}
      {activeTab === 'STATEMENT' && (
        <div id="printable-report-area" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income Statement Table Card */}
            <div className="bg-white p-6 rounded-3xl border border-purple-100 shadow-xs space-y-4">
              <h3 className="font-black text-purple-950 text-base border-b border-purple-100 pb-3 flex items-center justify-between">
                <span>قائمة الدخل والأرباح الصافية (Income Statement)</span>
                <span className="text-xs font-mono font-bold text-amber-900 bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
                  كشف تدقيق مالي معتمد 📌
                </span>
              </h3>

              <div className="space-y-3 text-xs font-bold text-slate-700">
                <div className="flex justify-between p-3.5 bg-emerald-50 rounded-2xl text-emerald-950 border border-emerald-200 font-black">
                  <div>
                    <span>(+) إجمالي مبيعات المحل الكلية (Gross Sales):</span>
                    <span className="block text-[10px] text-emerald-600 font-normal">إجمالي المداخيل المسجلة عبر البائع</span>
                  </div>
                  <span className="font-mono text-base text-emerald-700 font-black">{grossSales.toLocaleString()} د.ج</span>
                </div>

                <div className="flex justify-between p-3.5 bg-amber-50 rounded-2xl text-amber-950 border border-amber-200 font-black">
                  <div>
                    <span>(-) تكلفة الشراء الأساسية للبضاعة المباعة (COGS):</span>
                    <span className="block text-[10px] text-amber-700 font-normal">سعر شراء البضاعة والحلويات المباعة فعلياً</span>
                  </div>
                  <span className="font-mono text-base text-amber-800 font-black">-{cogs.toLocaleString()} د.ج</span>
                </div>

                <div className="flex justify-between p-3.5 bg-blue-50 rounded-2xl text-blue-950 border border-blue-200 font-black">
                  <div>
                    <span>(=) مجمل الربح الإجمالي (Gross Profit Margin):</span>
                    <span className="block text-[10px] text-blue-600 font-normal">هامش الربح الإجمالي: {grossMarginPercent}%</span>
                  </div>
                  <span className="font-mono text-base text-blue-800 font-black">+{grossProfit.toLocaleString()} د.ج</span>
                </div>

                <div className="flex justify-between p-3.5 bg-rose-50 rounded-2xl text-rose-950 border border-rose-200 font-black">
                  <div>
                    <span>(-) المصاريف التشغيلية وأجور المحل (Expenses & Payroll):</span>
                    <span className="block text-[10px] text-rose-600 font-normal">الكراء + الكهرباء + رواتب الموظفين + الصيانة</span>
                  </div>
                  <span className="font-mono text-base text-rose-600 font-black">-{expenses.toLocaleString()} د.ج</span>
                </div>

                <div className="flex justify-between p-4 bg-gradient-to-r from-[#2E1065] via-[#3B0764] to-[#1E1B4B] text-white rounded-2xl text-base font-black border border-amber-300/40 shadow-xl">
                  <div>
                    <span>(=) صافي الربح الحقيقي الصافي (Net Profit):</span>
                    <span className="block text-[11px] text-amber-300/80 font-normal">الربح الصافي الجاهز للترحيل أو التوزيع</span>
                  </div>
                  <span className="text-amber-300 font-mono font-black text-xl">{netProfit.toLocaleString()} د.ج ✨</span>
                </div>
              </div>
            </div>

            {/* Weekly Sales & Profit Trend Chart */}
            <div className="bg-white p-6 rounded-3xl border border-purple-100 shadow-xs space-y-4 no-print">
              <h3 className="font-black text-purple-950 text-base border-b border-purple-100 pb-3 flex items-center justify-between">
                <span>مقارنة الإيرادات والأرباح اليومية (Weekly Performance)</span>
                <span className="text-xs text-slate-500 font-bold">الأيام الـ 7 الأخيرة</span>
              </h3>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.weeklySalesData || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="shortDate" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#2E1065', borderRadius: '16px', color: '#fff', fontSize: '12px' }}
                      formatter={(val: any) => [`${Number(val).toLocaleString()} د.ج`, '']}
                    />
                    <Legend />
                    <Bar dataKey="revenue" name="إجمالي المبيعات" fill="#D97706" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="profit" name="صافي الربح" fill="#059669" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCT PROFITABILITY */}
      {activeTab === 'PRODUCT_PROFIT' && (
        <div className="space-y-4 no-print">
          <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث باسم الحلوى أو الباركود لراية مدى ربحيتها..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pr-9 pl-4 py-2 bg-[#FAF7F2] border border-amber-200 rounded-xl text-xs font-bold text-purple-950 outline-none"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-purple-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-gradient-to-r from-purple-950 to-indigo-900 text-amber-300 font-black border-b border-purple-100">
                  <tr>
                    <th className="p-3.5">اسم المنتج / الحلوى</th>
                    <th className="p-3.5">الباركود</th>
                    <th className="p-3.5">سعر الشراء</th>
                    <th className="p-3.5">سعر البيع</th>
                    <th className="p-3.5">الكمية المباعة</th>
                    <th className="p-3.5">إجمالي الإيرادات</th>
                    <th className="p-3.5">إجمالي التكلفة</th>
                    <th className="p-3.5">صافي الربح المحقق</th>
                    <th className="p-3.5">هامش الربح %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400 font-bold">
                        لا توجد مبيعات منتجات مسجلة تطابق البحث
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p: any) => (
                      <tr key={p.productId} className="hover:bg-[#FAF7F2]/50 transition-colors">
                        <td className="p-3.5 font-black text-purple-950">{p.productNameAr}</td>
                        <td className="p-3.5 font-mono text-slate-500">{p.barcode || '-'}</td>
                        <td className="p-3.5 font-mono text-amber-900 font-bold">{p.purchasePrice.toLocaleString()} د.ج</td>
                        <td className="p-3.5 font-mono text-emerald-700 font-bold">{p.unitPrice.toLocaleString()} د.ج</td>
                        <td className="p-3.5 font-mono font-black text-purple-950">{p.totalQuantitySold} قطعة/كغ</td>
                        <td className="p-3.5 font-mono font-bold text-emerald-700">{p.totalRevenue.toLocaleString()} د.ج</td>
                        <td className="p-3.5 font-mono font-bold text-rose-600">-{p.totalCost.toLocaleString()} د.ج</td>
                        <td className="p-3.5 font-mono font-black text-amber-900 text-sm bg-amber-50 rounded-xl">
                          +{p.netProfit.toLocaleString()} د.ج
                        </td>
                        <td className="p-3.5 font-bold">
                          <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full text-[11px] font-black border border-emerald-200">
                            {p.marginPercent}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STOCK VALUATION & ROI */}
      {activeTab === 'STOCK_VALUATION' && (
        <div className="space-y-6 no-print">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-purple-100 shadow-xs space-y-2">
              <span className="text-xs text-slate-500 font-bold">تقييم المخزون بسعر الشراء (Cost Value)</span>
              <div className="text-xl font-black text-amber-900 font-mono">
                {stockCost.toLocaleString()} د.ج
              </div>
              <p className="text-[11px] text-slate-400 font-bold">رأس المال المستثمر الفعلي الباقي بالمحل</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-purple-100 shadow-xs space-y-2">
              <span className="text-xs text-slate-500 font-bold">تقييم المخزون بسعر البيع (Retail Value)</span>
              <div className="text-xl font-black text-emerald-700 font-mono">
                {stockRetail.toLocaleString()} د.ج
              </div>
              <p className="text-[11px] text-slate-400 font-bold">القيمة التقديرية الكلية للبضاعة عند البيع الكامل</p>
            </div>

            <div className="bg-gradient-to-r from-purple-950 to-indigo-900 text-amber-300 p-5 rounded-3xl shadow-md space-y-2 border border-amber-300/30">
              <span className="text-xs text-purple-200 font-bold">الأرباح الصافية المتوقعة بالمستودع</span>
              <div className="text-2xl font-black text-amber-300 font-mono">
                +{potentialProfitInStock.toLocaleString()} د.ج
              </div>
              <p className="text-[11px] text-amber-300/80 font-bold">الربح الصافي المتوقع تحقيقه بعد بيع المخزون</p>
            </div>
          </div>

          {/* Top 3 Performing Products */}
          <div className="bg-white p-6 rounded-3xl border border-purple-100 shadow-xs space-y-4">
            <h3 className="font-black text-purple-950 text-base border-b border-purple-100 pb-3 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <span>المنتجات والحلويات الأكثر مبيعاً وإقبالاً (Top Sellers)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(data.topPerformers || []).map((tp: any, index: number) => (
                <div key={tp.productId} className="bg-[#FFFBF7] p-4 rounded-2xl border border-amber-200 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="w-6 h-6 rounded-full bg-amber-400 text-purple-950 font-black text-xs flex items-center justify-center shadow-xs">
                      #{index + 1}
                    </span>
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                      مبيعات ممتازة 🔥
                    </span>
                  </div>
                  <h4 className="font-black text-purple-950 text-sm">{tp.productNameAr}</h4>
                  <div className="text-xs font-bold text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span>إجمالي الكمية المباعة:</span>
                      <span className="font-mono text-purple-950 font-black">{tp.totalQuantity} قطعة</span>
                    </div>
                    <div className="flex justify-between">
                      <span>إجمالي العائد:</span>
                      <span className="font-mono text-emerald-700 font-black">{tp.totalRevenue.toLocaleString()} د.ج</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: STAFF & CATEGORY PERFORMANCE */}
      {activeTab === 'STAFF_CATEGORY' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 no-print">
          {/* Sales by Category Card */}
          <div className="bg-white p-6 rounded-3xl border border-purple-100 shadow-xs space-y-4">
            <h3 className="font-black text-purple-950 text-base border-b border-purple-100 pb-3">
              أداء المبيعات حسب تصنيفات الحلويات (Category Breakdown)
            </h3>

            <div className="space-y-3">
              {(data.salesByCategory || []).map((cat: any) => (
                <div key={cat.categoryId} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <div className="flex justify-between items-center font-black text-xs text-purple-950">
                    <span>{cat.categoryNameAr}</span>
                    <span className="font-mono text-emerald-700">{cat.totalRevenue.toLocaleString()} د.ج</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-500">
                    <span>التكلفة: {cat.totalCost.toLocaleString()} د.ج</span>
                    <span className="text-amber-900 font-black">الربح الصافي: +{cat.netProfit.toLocaleString()} د.ج</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sales by Staff Card */}
          <div className="bg-white p-6 rounded-3xl border border-purple-100 shadow-xs space-y-4">
            <h3 className="font-black text-purple-950 text-base border-b border-purple-100 pb-3">
              أداء مبيعات البائعين والموظفين (Staff Sales Performance)
            </h3>

            <div className="space-y-3">
              {(data.salesByStaff || []).map((staff: any) => (
                <div key={staff.staffNameAr} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-purple-950 text-xs">{staff.staffNameAr}</h4>
                    <span className="text-[10px] text-slate-500 font-bold">عدد الفواتير المنفذة: {staff.salesCount} فاتورة</span>
                  </div>
                  <div className="text-left font-mono font-black text-sm text-amber-900">
                    {staff.totalRevenue.toLocaleString()} د.ج
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
