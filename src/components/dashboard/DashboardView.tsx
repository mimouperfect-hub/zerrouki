import React, { useEffect, useState, useRef } from 'react';
import {
  TrendingUp, ShoppingCart, DollarSign, Package, AlertTriangle, Clock,
  ArrowUpRight, ArrowDownRight, Users, Wallet, CreditCard, ChevronRight,
  Search, Filter, ShieldAlert, Truck, RefreshCw, ExternalLink, Plus, CheckCircle2, X, Layers,
  BarChart2, Calendar, Award, LineChart, Printer, FileText
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { api } from '../../api/client';
import { ActiveView } from '../../types';

interface DashboardViewProps {
  onNavigate: (view: ActiveView) => void;
}

const CustomRechartsTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const dataItem = payload[0].payload;
    return (
      <div className="bg-[#1F0E05] text-[#FAF7F2] p-3.5 rounded-2xl border border-[#D4AF37]/40 shadow-xl text-xs space-y-2 dir-rtl">
        <div className="font-black text-[#D4AF37] border-b border-[#D4AF37]/20 pb-1.5 flex justify-between items-center gap-4">
          <span>{dataItem.dayNameAr} ({dataItem.shortDate})</span>
          <span className="text-[10px] bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-0.5 rounded-full">
            {dataItem.salesCount} فاتورة
          </span>
        </div>
        <div className="space-y-1.5 pt-1 font-bold">
          <div className="flex justify-between gap-6 text-emerald-400">
            <span>إيراد المبيعات:</span>
            <span>{dataItem.revenue?.toLocaleString()} د.ج</span>
          </div>
          <div className="flex justify-between gap-6 text-amber-300">
            <span>تكلفة البضاعة (COGS):</span>
            <span>{dataItem.cogs?.toLocaleString()} د.ج</span>
          </div>
          <div className="flex justify-between gap-6 text-cyan-300">
            <span>صافي الربح التقديري:</span>
            <span>{dataItem.profit?.toLocaleString()} د.ج</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stockFilter, setStockFilter] = useState<'ALL' | 'OUT_OF_STOCK' | 'CRITICAL'>('ALL');
  const [stockSearch, setStockSearch] = useState('');
  const [chartViewMode, setChartViewMode] = useState<'COMBO' | 'REVENUE' | 'PROFIT'>('COMBO');
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Quick Restock Modal state
  const [restockProduct, setRestockProduct] = useState<any | null>(null);
  const [restockQty, setRestockQty] = useState<number>(10);
  const [restockPrice, setRestockPrice] = useState<number>(0);
  const [restockSubmitting, setRestockSubmitting] = useState(false);
  const [restockSuccessMsg, setRestockSuccessMsg] = useState<string | null>(null);

  const lowStockPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardReports();
      setData(res);
    } catch (e) {
      console.error('Failed to load dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  const scrollToLowStock = () => {
    if (lowStockPanelRef.current) {
      lowStockPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const openRestockModal = (product: any) => {
    const defaultQty = Math.max(1, (product.maxStock || product.minStock * 2) - product.currentStock);
    setRestockProduct(product);
    setRestockQty(defaultQty);
    setRestockPrice(product.purchasePrice || 0);
    setRestockSuccessMsg(null);
  };

  const handleCreateRestockPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockProduct) return;

    try {
      setRestockSubmitting(true);
      const purchaseData = {
        supplierId: restockProduct.supplierId || '',
        invoiceNumber: `ORD-RESTOCK-${Date.now().toString().slice(-6)}`,
        items: [
          {
            productId: restockProduct.id,
            quantity: Number(restockQty),
            purchasePrice: Number(restockPrice),
            totalPrice: Number(restockQty) * Number(restockPrice)
          }
        ],
        paymentMethod: 'CASH',
        paidAmount: Number(restockQty) * Number(restockPrice),
        notesAr: `طلب تزويد مخزون سريع من لوحة التحكم لمادة: ${restockProduct.nameAr}`
      };

      await api.createPurchase(purchaseData);
      setRestockSuccessMsg('تم إضافة طلب الشراء وتزويد المخزون بنجاح!');
      setTimeout(() => {
        setRestockProduct(null);
        setRestockSuccessMsg(null);
        loadDashboardData(); // Refresh metrics
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'فشل إضافة طلب التزويد');
    } finally {
      setRestockSubmitting(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="p-8 text-center text-gray-500 font-bold flex flex-col items-center justify-center min-h-[400px] gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-[#D4AF37]" />
        <span>جاري تحميل بيانات وإحصائيات المحل والمخزون...</span>
      </div>
    );
  }

  const lowStockProducts = data.lowStockProducts || [];
  const weeklySalesData = data.weeklySalesData || [];
  const topPerformers = data.topPerformers || [];

  const outOfStockCount = lowStockProducts.filter((p: any) => p.currentStock === 0).length;
  const criticalStockCount = lowStockProducts.filter((p: any) => p.currentStock > 0).length;

  const totalMinRestockCost = lowStockProducts.reduce((sum: number, p: any) => {
    const deficit = Math.max(0, p.minStock - p.currentStock);
    return sum + (deficit * (p.purchasePrice || 0));
  }, 0);

  // Weekly performance highlights
  const totalWeeklyRevenue = weeklySalesData.reduce((sum: number, d: any) => sum + d.revenue, 0);
  const totalWeeklySalesCount = weeklySalesData.reduce((sum: number, d: any) => sum + d.salesCount, 0);
  const avgDailyRevenue = Math.round(totalWeeklyRevenue / Math.max(1, weeklySalesData.length));
  const peakDay = weeklySalesData.reduce(
    (max: any, d: any) => (d.revenue > (max?.revenue || 0) ? d : max),
    weeklySalesData[0] || null
  );

  const filteredLowStockProducts = lowStockProducts.filter((p: any) => {
    if (stockFilter === 'OUT_OF_STOCK' && p.currentStock > 0) return false;
    if (stockFilter === 'CRITICAL' && p.currentStock === 0) return false;

    if (stockSearch.trim()) {
      const q = stockSearch.toLowerCase().trim();
      const matchNameAr = p.nameAr?.toLowerCase().includes(q);
      const matchNameFr = p.nameFr?.toLowerCase().includes(q);
      const matchBarcode = p.barcode?.includes(q);
      const matchCat = p.categoryNameAr?.toLowerCase().includes(q);
      const matchSupplier = p.supplierNameAr?.toLowerCase().includes(q);
      return matchNameAr || matchNameFr || matchBarcode || matchCat || matchSupplier;
    }
    return true;
  });

  const kpis = [
    {
      title: 'مبيعات اليوم',
      value: `${data.todaySalesAmount.toLocaleString()} د.ج`,
      subtitle: `${data.todaySalesCount} فاتورة منفذة`,
      icon: ShoppingCart,
      color: 'from-emerald-500 to-teal-600',
      borderColor: 'border-emerald-200/80 hover:border-emerald-400',
      action: () => onNavigate('POS')
    },
    {
      title: 'صافي أرباح المحل',
      value: `${data.netProfit.toLocaleString()} د.ج`,
      subtitle: `إجمالي المبيعات - المشتريات - المصاريف`,
      icon: TrendingUp,
      color: 'from-purple-600 to-indigo-700',
      borderColor: 'border-purple-200/80 hover:border-purple-400',
      action: () => onNavigate('REPORTS')
    },
    {
      title: 'قيمة المخزون بسعر الشراء',
      value: `${data.stockValuationCost.toLocaleString()} د.ج`,
      subtitle: `القيمة بالبيع: ${data.stockValuationRetail.toLocaleString()} د.ج`,
      icon: Package,
      color: 'from-amber-500 to-orange-600',
      borderColor: 'border-amber-200/80 hover:border-amber-400',
      action: () => onNavigate('INVENTORY')
    },
    {
      title: 'ديون العملاء المستحقة',
      value: `${data.totalCustomerDebts.toLocaleString()} د.ج`,
      subtitle: `مستحقات المحل لدى الزبائن`,
      icon: Users,
      color: 'from-rose-500 to-pink-600',
      borderColor: 'border-rose-200/80 hover:border-rose-400',
      action: () => onNavigate('CUSTOMERS')
    }
  ];

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-200">
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-[#2E1065] via-[#4C1D95] to-[#7E22CE] text-white p-6 md:p-8 rounded-3xl shadow-xl border border-amber-300/40 flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-rose-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-purple-950 text-xs font-black px-3 py-1 rounded-full shadow-xs mb-2 inline-block">
            ✨ نظام محلات زروقي للحلويات
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight drop-shadow-xs">
            مرحباً بك في لوحة تحكم زروقي للحلويات
          </h1>
          <p className="text-xs md:text-sm text-purple-100/90 mt-1 font-bold">
            متابعة فورية للمبيعات، المخزون، حركة الصندوق، الأرباح، والتنبيهات الحرجة
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <button
            onClick={() => setShowPrintModal(true)}
            className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-amber-300/40 font-black text-xs shadow-md transition-all flex items-center gap-2 backdrop-blur-xs cursor-pointer active:scale-95"
          >
            <Printer className="w-4 h-4 text-amber-300" />
            طباعة الملخص اليومي
          </button>
          <button
            onClick={() => onNavigate('POS')}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white font-black text-sm shadow-xl shadow-orange-500/30 hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <ShoppingCart className="w-4 h-4" />
            فتح شاشة الـ POS ✨
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              onClick={kpi.action}
              className={`bg-white p-5 rounded-3xl border ${kpi.borderColor} shadow-xs hover:shadow-xl transition-all cursor-pointer group`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black text-slate-500">{kpi.title}</span>
                <div className={`p-3 rounded-2xl bg-gradient-to-br ${kpi.color} text-white shadow-md group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-purple-950 tracking-tight mb-1">
                {kpi.value}
              </div>
              <p className="text-[11px] text-slate-500 font-bold truncate">{kpi.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* FEATURE: RECHARTS WEEKLY SALES REVENUE CHART */}
      {/* ============================================================== */}
      <div className="bg-white rounded-3xl border border-purple-100 shadow-sm overflow-hidden p-6 space-y-5">
        {/* Header & Mode Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl shadow-md">
              <BarChart2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-purple-950 text-lg">
                  مخطط مبيعات الأسبوع الحالي (الإيرادات اليومية)
                </h3>
                <span className="bg-emerald-100 text-emerald-800 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-emerald-200">
                  تحديث حاد
                </span>
              </div>
              <p className="text-xs text-slate-500 font-bold mt-0.5">
                تتبع حركة المبيعات اليومية للأيام السبعة الأخيرة لتسهيل اتخاذ قرارات التزود والعمليات
              </p>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-purple-50/80 p-1 rounded-2xl gap-1 shrink-0 border border-purple-100">
            <button
              onClick={() => setChartViewMode('COMBO')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                chartViewMode === 'COMBO'
                  ? 'bg-gradient-to-r from-purple-900 to-indigo-900 text-amber-300 shadow-xs'
                  : 'text-purple-900 hover:bg-purple-100/60'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5 inline ml-1" />
              مدمج (إيراد + ربح)
            </button>
            <button
              onClick={() => setChartViewMode('REVENUE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                chartViewMode === 'REVENUE'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-xs'
                  : 'text-purple-900 hover:bg-purple-100/60'
              }`}
            >
              الإيراد فقط
            </button>
            <button
              onClick={() => setChartViewMode('PROFIT')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                chartViewMode === 'PROFIT'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xs'
                  : 'text-purple-900 hover:bg-purple-100/60'
              }`}
            >
              الربح التقديري
            </button>
          </div>
        </div>

        {/* Weekly Quick Snapshot Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gradient-to-r from-amber-50/80 via-rose-50/50 to-purple-50/60 p-4 rounded-2xl border border-amber-200/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl font-black shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-600 font-bold block">إجمالي مبيعات الأسبوع</span>
              <span className="text-base font-black text-purple-950">
                {totalWeeklyRevenue.toLocaleString()} د.ج
                <span className="text-[11px] font-bold text-slate-500 mr-1.5">({totalWeeklySalesCount} فاتورة)</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500 text-white rounded-xl font-black shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-600 font-bold block">متوسط الإيراد اليومي</span>
              <span className="text-base font-black text-emerald-800">
                {avgDailyRevenue.toLocaleString()} د.ج / يوم
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-600 text-white rounded-xl font-black shadow-xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-600 font-bold block">أعلى يوم مبيعات</span>
              <span className="text-base font-black text-purple-900">
                {peakDay ? `${peakDay.dayNameAr} (${peakDay.revenue.toLocaleString()} د.ج)` : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Recharts Canvas Chart */}
        <div className="w-full h-[300px] pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={weeklySalesData}
              margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="revenueBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#D97706" stopOpacity={0.75} />
                </linearGradient>
                <linearGradient id="profitBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#047857" stopOpacity={0.75} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0e7fe" />

              <XAxis
                dataKey="dayNameAr"
                tickLine={false}
                axisLine={{ stroke: '#e9d5ff' }}
                tick={{ fill: '#4c1d95', fontSize: 12, fontWeight: 800 }}
              />

              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                tick={{ fill: '#6b7280', fontSize: 11 }}
                width={40}
              />

              <Tooltip content={<CustomRechartsTooltip />} />

              <Legend
                formatter={(value) => <span className="text-xs font-black text-purple-950">{value}</span>}
                wrapperStyle={{ paddingTop: '10px' }}
              />

              {(chartViewMode === 'COMBO' || chartViewMode === 'REVENUE') && (
                <Bar
                  dataKey="revenue"
                  name="إيرادات المبيعات (د.ج)"
                  fill="url(#revenueBarGrad)"
                  radius={[10, 10, 0, 0]}
                  maxBarSize={45}
                />
              )}

              {(chartViewMode === 'COMBO' || chartViewMode === 'PROFIT') && (
                <Line
                  type="monotone"
                  dataKey="profit"
                  name="صافي الربح التقديري (د.ج)"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#10B981', stroke: '#ffffff', strokeWidth: 2 }}
                  activeDot={{ r: 7 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ============================================================== */}
      {/* FEATURE: TOP PERFORMERS (3 MOST-SOLD PRODUCTS LAST 30 DAYS) CARD */}
      {/* ============================================================== */}
      <div id="top-performers-card" className="bg-white p-6 rounded-3xl border border-amber-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-[#2A160A] to-[#3D2314] text-[#D4AF37] rounded-2xl shadow-xs">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-[#2A160A] text-base">الأكثر مبيعاً - Top Performers</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[10px] border border-amber-200">
                  خلال آخر 30 يوماً
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                أكثر 3 منتجات تحقيقاً للكميات المباعة في محل زرو للحلويات
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('INVENTORY')}
            className="text-xs font-bold text-[#8C6B1B] hover:text-[#2A160A] flex items-center gap-1 transition-colors"
          >
            عرض كافة المنتجات
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {topPerformers.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-xs font-bold">
            لا توجد مبيعات مسجلة خلال الثلاثين يوماً الماضية
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topPerformers.map((item: any, idx: number) => {
              const medals = [
                { badge: '🥇 المركز الأول', rankColor: 'from-[#D4AF37] to-[#997A1E] text-white' },
                { badge: '🥈 المركز الثاني', rankColor: 'from-slate-500 to-slate-700 text-white' },
                { badge: '🥉 المركز الثالث', rankColor: 'from-amber-700 to-amber-900 text-white' }
              ];
              const medal = medals[idx] || medals[2];

              return (
                <div
                  key={item.productId || idx}
                  className="bg-gradient-to-b from-[#FAF7F2] to-white p-4 rounded-2xl border border-amber-100/80 shadow-xs hover:border-[#D4AF37]/50 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black bg-gradient-to-r ${medal.rankColor} shadow-xs`}>
                      {medal.badge}
                    </span>
                    <span className="text-[10px] font-bold text-gray-500 bg-white px-2 py-0.5 rounded-md border border-gray-200">
                      {item.categoryNameAr}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.productNameAr}
                        className="w-12 h-12 rounded-xl object-cover border border-amber-200 shadow-xs shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-amber-100/80 text-[#2A160A] font-black flex items-center justify-center text-base border border-amber-200 shrink-0">
                        <Package className="w-6 h-6 text-amber-800" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-black text-[#2A160A] text-sm truncate" title={item.productNameAr}>
                        {item.productNameAr}
                      </h4>
                      <div className="text-[11px] text-gray-500 font-bold mt-0.5">
                        سعر البيع: <span className="text-gray-900 font-extrabold">{item.sellingPrice.toLocaleString()} د.ج</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-amber-100/80 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-gray-500 font-bold block">إجمالي المباع</span>
                      <span className="text-sm font-black text-emerald-800">
                        {item.totalQuantity.toLocaleString()} قطعة
                      </span>
                    </div>
                    <div className="text-left">
                      <span className="text-[10px] text-gray-500 font-bold block">مجموع الإيراد</span>
                      <span className="text-sm font-black text-[#2A160A]">
                        {item.totalRevenue.toLocaleString()} د.ج
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Low Stock Warning Card */}
        <div
          onClick={scrollToLowStock}
          className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs flex items-center justify-between cursor-pointer hover:bg-amber-50/70 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 text-amber-700 rounded-xl font-bold group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-500">منتجات منخفضة المخزون</h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-lg font-black text-amber-800">{data.lowStockCount} منتجات</span>
                {outOfStockCount > 0 && (
                  <span className="text-[10px] font-extrabold bg-red-100 text-red-700 px-2 py-0.5 rounded-md border border-red-200">
                    {outOfStockCount} نافذة
                  </span>
                )}
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-amber-600 group-hover:translate-x-1 transition-transform" />
        </div>

        {/* Active Cash Session Card */}
        <div
          onClick={() => onNavigate('CASH')}
          className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs flex items-center justify-between cursor-pointer hover:bg-emerald-50/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-500">إجمالي المبيعات اليومية</h4>
              <span className="text-lg font-black text-emerald-800 font-mono">
                {data.todaySalesAmount?.toLocaleString() || 0} د.ج
              </span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-emerald-600" />
        </div>

        {/* Supplier Debts Card */}
        <div
          onClick={() => onNavigate('PURCHASES')}
          className="bg-white p-5 rounded-2xl border border-red-200 shadow-xs flex items-center justify-between cursor-pointer hover:bg-red-50/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 text-red-700 rounded-xl font-bold">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-500">ديون الموردين المتبقية</h4>
              <span className="text-lg font-black text-red-800">
                {data.totalSupplierDebts.toLocaleString()} د.ج
              </span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-red-600" />
        </div>
      </div>

      {/* ============================================================== */}
      {/* FEATURE: LOW STOCK HIGHLIGHT & REFILL ALERT PANEL */}
      {/* ============================================================== */}
      <div
        ref={lowStockPanelRef}
        id="low-stock-section"
        className="bg-white rounded-3xl border border-amber-200 shadow-sm overflow-hidden"
      >
        {/* Panel Header */}
        <div className="bg-gradient-to-r from-amber-50 via-amber-100/50 to-orange-50 p-6 border-b border-amber-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl shadow-md">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-[#2A160A] text-lg">
                  تنبيهات نقص المخزون والحد الأدنى
                </h3>
                <span className="bg-amber-200/80 text-amber-900 text-xs font-black px-2.5 py-0.5 rounded-full border border-amber-300">
                  {lowStockProducts.length} مواد تتطلب التدخل
                </span>
              </div>
              <p className="text-xs text-amber-900/80 font-medium mt-0.5">
                قائمة المواد التي بلغت أو تجاوزت حد الأمان للحفاظ على استمرارية البيع
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onNavigate('PURCHASES')}
              className="px-4 py-2.5 bg-[#2A160A] text-[#FAF7F2] hover:bg-[#3D2314] rounded-xl text-xs font-black shadow-xs transition-all flex items-center gap-2"
            >
              <Truck className="w-4 h-4 text-[#D4AF37]" />
              فتح سجل المشتريات
            </button>

            <button
              onClick={() => onNavigate('PRODUCTS')}
              className="px-4 py-2.5 bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              إدارة المنتجات
            </button>
          </div>
        </div>

        {/* Quick Summary Bar */}
        <div className="bg-[#FAF7F2] px-6 py-3 border-b border-amber-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping inline-block" />
            <span className="text-gray-600">مواد نفذت بالكامل (0):</span>
            <span className="font-extrabold text-red-700 text-sm">{outOfStockCount} مواد</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span className="text-gray-600">مواد تحت الحد الأدنى:</span>
            <span className="font-extrabold text-amber-800 text-sm">{criticalStockCount} مواد</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-600">تكلفة التزويد التقديرية للحد الأدنى:</span>
            <span className="font-extrabold text-[#3D2314] text-sm">
              {totalMinRestockCost.toLocaleString()} د.ج
            </span>
          </div>
        </div>

        {/* Controls: Search and Filter Tabs */}
        <div className="p-4 bg-white border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Filter Tabs */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl gap-1 w-full sm:w-auto">
            <button
              onClick={() => setStockFilter('ALL')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                stockFilter === 'ALL'
                  ? 'bg-white text-[#2A160A] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              الكل ({lowStockProducts.length})
            </button>
            <button
              onClick={() => setStockFilter('OUT_OF_STOCK')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                stockFilter === 'OUT_OF_STOCK'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-red-600'
              }`}
            >
              نفذت تماماً ({outOfStockCount})
            </button>
            <button
              onClick={() => setStockFilter('CRITICAL')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                stockFilter === 'CRITICAL'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-amber-600'
              }`}
            >
              مخزون حرج ({criticalStockCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="بحث بالاسم، الباركود، أو التصنيف..."
              value={stockSearch}
              onChange={(e) => setStockSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
            {stockSearch && (
              <button
                onClick={() => setStockSearch('')}
                className="absolute left-2.5 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Low Stock Items Grid/List */}
        <div className="p-4">
          {filteredLowStockProducts.length === 0 ? (
            <div className="p-10 text-center text-gray-500 space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h4 className="font-extrabold text-gray-800 text-base">لا توجد مواد منخفضة بظروف التصفية الحالية</h4>
              <p className="text-xs text-gray-500">
                جميع المنتجات ضمن مستويات المخزون الطبيعية والآمنة.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLowStockProducts.map((product: any) => {
                const isOutOfStock = product.currentStock === 0;
                const minStock = product.minStock || 1;
                const stockPercentage = Math.min(100, Math.round((product.currentStock / minStock) * 100));
                const deficit = Math.max(0, minStock - product.currentStock);

                return (
                  <div
                    key={product.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 relative overflow-hidden ${
                      isOutOfStock
                        ? 'bg-red-50/40 border-red-200 hover:border-red-300 shadow-2xs'
                        : 'bg-amber-50/30 border-amber-200 hover:border-amber-300 shadow-2xs'
                    }`}
                  >
                    {/* Top Status Stripe */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.nameAr}
                            className="w-12 h-12 rounded-xl object-cover border border-gray-200 shadow-2xs bg-white"
                          />
                        ) : (
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shadow-2xs ${
                            isOutOfStock ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                          }`}>
                            <Package className="w-6 h-6" />
                          </div>
                        )}

                        <div>
                          <span className="text-[10px] font-extrabold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md border border-gray-200 inline-block mb-1">
                            {product.categoryNameAr}
                          </span>
                          <h4 className="font-extrabold text-[#2A160A] text-xs leading-snug line-clamp-2">
                            {product.nameAr}
                          </h4>
                          {product.nameFr && (
                            <p className="text-[10px] text-gray-500 font-medium truncate mt-0.5">
                              {product.nameFr}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Out of Stock vs Critical Badge */}
                      {isOutOfStock ? (
                        <span className="shrink-0 bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-2xs flex items-center gap-1 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          نفذت بالكامل
                        </span>
                      ) : (
                        <span className="shrink-0 bg-amber-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-2xs flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          مخزون حرج
                        </span>
                      )}
                    </div>

                    {/* Stock Bar Gauge */}
                    <div className="space-y-1.5 bg-white p-3 rounded-xl border border-gray-200/80">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-gray-600">المخزون الحالي:</span>
                        <span className={`font-black ${isOutOfStock ? 'text-red-600' : 'text-amber-800'}`}>
                          {product.currentStock} قطعة (الحد الأدنى: {product.minStock})
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-500 ${
                            isOutOfStock
                              ? 'bg-red-600'
                              : stockPercentage <= 30
                              ? 'bg-gradient-to-r from-red-500 to-amber-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.max(5, stockPercentage)}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[11px] text-gray-500 font-medium pt-1">
                        <span>الرمز: {product.barcode || product.internalCode}</span>
                        {deficit > 0 && (
                          <span className="text-red-700 font-extrabold bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                            نقص: {deficit} قطعة
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Details Footer & Action Buttons */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="text-[11px]">
                        <span className="text-gray-500 block">سعر الشراء / البيع:</span>
                        <span className="font-bold text-[#2A160A]">
                          {product.purchasePrice?.toLocaleString()} / {product.sellingPrice?.toLocaleString()} د.ج
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openRestockModal(product)}
                          className="px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl text-xs font-black shadow-xs hover:brightness-110 transition-all flex items-center gap-1"
                          title="إعادة طلب تزويد هذه المادة"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          تزويد سريع
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Visual Operations Comparison */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-[#2A160A] text-base">مقارنة المبيعات والتكاليف والمصاريف الشاملة</h3>
            <p className="text-xs text-gray-500 font-medium">مخطط الإيرادات مقابل التكاليف الإجمالية للعمليات</p>
          </div>
          <span className="text-xs font-bold bg-[#FAF7F2] text-[#3D2314] px-3 py-1 rounded-xl border border-gray-200">
            ملخص إجمالي
          </span>
        </div>

        {/* Bar Visualization */}
        <div className="space-y-4 pt-2">
          <div>
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-[#3D2314]">إجمالي المبيعات الكلية</span>
              <span>{data.totalSalesAmount.toLocaleString()} د.ج</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#D4AF37] to-[#8C6B1B] h-3 rounded-full transition-all duration-500"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-gray-600">تكلفة البضاعة المباعة (COGS)</span>
              <span>{data.totalCogs.toLocaleString()} د.ج</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className="bg-amber-600 h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, data.totalSalesAmount ? (data.totalCogs / data.totalSalesAmount) * 100 : 0)}%`
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-gray-600">المصاريف التشغيلية</span>
              <span>{data.totalExpensesAmount.toLocaleString()} د.ج</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className="bg-red-500 h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, data.totalSalesAmount ? (data.totalExpensesAmount / data.totalSalesAmount) * 100 : 0)}%`
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* QUICK RESTOCK MODAL */}
      {/* ============================================================== */}
      {restockProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-amber-200 shadow-2xl relative">
            <button
              onClick={() => setRestockProduct(null)}
              className="absolute left-4 top-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl font-bold">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-[#2A160A] text-base">طلب تزويد مخزون سريع</h3>
                <p className="text-xs text-gray-500 font-medium">إنشاء فاتورة شراء مباشرة وتحديث الكمية بالمستودع</p>
              </div>
            </div>

            {restockSuccessMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-extrabold text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600" />
                <div>{restockSuccessMsg}</div>
              </div>
            ) : (
              <form onSubmit={handleCreateRestockPurchase} className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 text-xs space-y-1">
                  <div className="font-extrabold text-[#2A160A]">{restockProduct.nameAr}</div>
                  <div className="text-gray-500 flex justify-between">
                    <span>الباركود: {restockProduct.barcode}</span>
                    <span>المخزون الحالي: <strong className="text-red-600">{restockProduct.currentStock}</strong></span>
                  </div>
                  <div className="text-gray-500">
                    الحد الأدنى: <strong>{restockProduct.minStock}</strong> قطعة
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-gray-700 block">
                    الكمية المراد طلبها للتزويد (قطعة):
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={restockQty}
                    onChange={(e) => setRestockQty(Number(e.target.value))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-gray-500">الكمية المقترحة للوصول للحد الآمن تلقائياً</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-gray-700 block">
                    سعر الشراء الفردي (د.ج):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={restockPrice}
                    onChange={(e) => setRestockPrice(Number(e.target.value))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex justify-between items-center text-xs">
                  <span className="font-bold text-emerald-900">إجمالي فاتورة الشراء:</span>
                  <span className="font-black text-emerald-900 text-sm">
                    {(Number(restockQty) * Number(restockPrice)).toLocaleString()} د.ج
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRestockProduct(null)}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-2xl text-xs hover:bg-gray-200 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={restockSubmitting}
                    className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black rounded-2xl text-xs shadow-md hover:brightness-110 transition-all disabled:opacity-50"
                  >
                    {restockSubmitting ? 'جاري التنفيذ...' : 'تأكيد طلب التزويد'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* ============================================================== */}
      {/* FEATURE: PRINT-FRIENDLY DAILY STATISTICS SUMMARY REPORT */}
      {/* ============================================================== */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 space-y-6 border border-gray-200 shadow-2xl relative my-8">
            {/* Non-printable Modal Action Controls */}
            <div className="no-print flex items-center justify-between pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-[#2A160A] to-[#3D2314] text-[#D4AF37] rounded-2xl">
                  <Printer className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-[#2A160A] text-lg">معاينة التقرير القابل للطباعة</h3>
                  <p className="text-xs text-gray-500 font-medium">
                    تقرير ملخص الأداء اليومي والأسبوعي الجاهز للتصدير على الورق أو حفظه كـ PDF
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#B89428] text-[#1F0E05] font-black text-xs rounded-xl shadow-md hover:brightness-110 transition-all flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  طباعة الآن (Print)
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-2.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* The Printable Container */}
            <div
              id="printable-dashboard-report"
              className="p-8 bg-white text-gray-900 space-y-6 dir-rtl text-right border border-gray-200 rounded-2xl shadow-xs"
            >
              {/* Report Header */}
              <div className="flex items-center justify-between pb-6 border-b-2 border-[#2A160A]/80">
                <div>
                  <div className="text-xs font-black text-[#D4AF37] uppercase tracking-wider">
                    نظام إدارة محلات زروقي للحلويات والشوكولاتة
                  </div>
                  <h1 className="text-2xl font-black text-[#2A160A] mt-1">
                    تقرير ملخص الأداء وإحصائيات المبيعات اليومية
                  </h1>
                  <p className="text-xs text-gray-500 font-bold mt-1">
                    تاريخ التقرير: {new Date().toLocaleDateString('ar-DZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} - الساعة: {new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="text-left bg-[#FAF7F2] p-3 rounded-xl border border-amber-200/80">
                  <div className="text-[11px] font-bold text-gray-500">حالة النظام:</div>
                  <div className="text-sm font-black text-emerald-700">
                    نشط ومفعّل 🟢
                  </div>
                </div>
              </div>

              {/* Section 1: KPI Statistics Cards */}
              <div>
                <h2 className="text-sm font-black text-[#2A160A] mb-3 flex items-center gap-2 border-r-4 border-[#D4AF37] pr-2">
                  1. مؤشرات الأداء الرئيسية (مبيعات اليوم والمخزون)
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                    <span className="text-[11px] text-gray-500 font-bold block">مبيعات اليوم</span>
                    <span className="text-base font-black text-emerald-700 block mt-1">
                      {data.todaySalesAmount.toLocaleString()} د.ج
                    </span>
                    <span className="text-[10px] text-gray-500 block">({data.todaySalesCount} فاتورة منفذة)</span>
                  </div>

                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                    <span className="text-[11px] text-gray-500 font-bold block">صافي الأرباح التقديرية</span>
                    <span className="text-base font-black text-[#2A160A] block mt-1">
                      {data.netProfit.toLocaleString()} د.ج
                    </span>
                    <span className="text-[10px] text-gray-500 block">إجمالي الإيرادات - COGS - المصاريف</span>
                  </div>

                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                    <span className="text-[11px] text-gray-500 font-bold block">تقييم المخزون (بالشراء)</span>
                    <span className="text-base font-black text-amber-800 block mt-1">
                      {data.stockValuationCost.toLocaleString()} د.ج
                    </span>
                    <span className="text-[10px] text-gray-500 block">بالبيع: {data.stockValuationRetail.toLocaleString()} د.ج</span>
                  </div>

                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                    <span className="text-[11px] text-gray-500 font-bold block">ديون الزبائن والموردين</span>
                    <span className="text-xs font-black text-purple-900 block mt-1">
                      الزبائن: {data.totalCustomerDebts.toLocaleString()} د.ج
                    </span>
                    <span className="text-[10px] text-red-700 font-bold block mt-0.5">
                      الموردين: {data.totalSupplierDebts.toLocaleString()} د.ج
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: Weekly Sales Breakdown Table */}
              <div>
                <h2 className="text-sm font-black text-[#2A160A] mb-3 flex items-center gap-2 border-r-4 border-[#D4AF37] pr-2">
                  2. تفاصيل المبيعات اليومية للأسبوع الحالي
                </h2>
                <table className="w-full text-xs text-right border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-[#2A160A] text-[#FAF7F2] font-black">
                      <th className="p-2 border border-gray-300">اليوم والتاريخ</th>
                      <th className="p-2 border border-gray-300 text-center">عدد الفواتير</th>
                      <th className="p-2 border border-gray-300 text-left">إجمالي الإيراد (د.ج)</th>
                      <th className="p-2 border border-gray-300 text-left">تكلفة البضاعة (COGS)</th>
                      <th className="p-2 border border-gray-300 text-left">صافي الربح (د.ج)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklySalesData.map((day: any, i: number) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="p-2 border border-gray-200 font-bold">
                          {day.dayNameAr} ({day.shortDate})
                        </td>
                        <td className="p-2 border border-gray-200 text-center font-bold">
                          {day.salesCount}
                        </td>
                        <td className="p-2 border border-gray-200 text-left font-black text-emerald-800">
                          {day.revenue.toLocaleString()}
                        </td>
                        <td className="p-2 border border-gray-200 text-left font-medium text-gray-700">
                          {day.cogs.toLocaleString()}
                        </td>
                        <td className="p-2 border border-gray-200 text-left font-black text-[#2A160A]">
                          {day.profit.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-amber-100/70 font-black text-xs text-[#2A160A]">
                      <td className="p-2 border border-gray-300">الإجمالي الأسبوعي</td>
                      <td className="p-2 border border-gray-300 text-center">{totalWeeklySalesCount}</td>
                      <td className="p-2 border border-gray-300 text-left text-emerald-900">{totalWeeklyRevenue.toLocaleString()} د.ج</td>
                      <td className="p-2 border border-gray-300 text-left">—</td>
                      <td className="p-2 border border-gray-300 text-left">
                        {weeklySalesData.reduce((sum: number, d: any) => sum + d.profit, 0).toLocaleString()} د.ج
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Section 3: Critical Low Stock Items */}
              {lowStockProducts.length > 0 && (
                <div>
                  <h2 className="text-sm font-black text-[#2A160A] mb-3 flex items-center gap-2 border-r-4 border-red-600 pr-2">
                    3. تنبيهات المنتجات المطلوبة للتزويد (المخزون الحرج)
                  </h2>
                  <table className="w-full text-[11px] text-right border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-amber-800 text-white font-bold">
                        <th className="p-2 border border-gray-300">اسم المادة</th>
                        <th className="p-2 border border-gray-300">التصنيف</th>
                        <th className="p-2 border border-gray-300 text-center">المخزون الحالي</th>
                        <th className="p-2 border border-gray-300 text-center">الحد الأدنى</th>
                        <th className="p-2 border border-gray-300 text-center">النقص</th>
                        <th className="p-2 border border-gray-300 text-left">سعر الشراء (د.ج)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStockProducts.slice(0, 10).map((p: any) => {
                        const deficit = Math.max(0, p.minStock - p.currentStock);
                        return (
                          <tr key={p.id} className="border-b border-gray-200">
                            <td className="p-2 border border-gray-200 font-bold">{p.nameAr}</td>
                            <td className="p-2 border border-gray-200 text-gray-600">{p.categoryNameAr}</td>
                            <td className={`p-2 border border-gray-200 text-center font-black ${p.currentStock === 0 ? 'text-red-700 bg-red-50' : 'text-amber-800'}`}>
                              {p.currentStock}
                            </td>
                            <td className="p-2 border border-gray-200 text-center">{p.minStock}</td>
                            <td className="p-2 border border-gray-200 text-center text-red-700 font-bold">{deficit}</td>
                            <td className="p-2 border border-gray-200 text-left font-bold">{p.purchasePrice?.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Section 4: Signatures */}
              <div className="pt-8 border-t border-gray-300 grid grid-cols-2 gap-8 text-center text-xs font-bold text-gray-700">
                <div className="space-y-8">
                  <div>توقيع البائع / المسؤول عن الصندوق</div>
                  <div className="text-gray-400">__________________________</div>
                </div>
                <div className="space-y-8">
                  <div>توقيع وختم مدير المحل</div>
                  <div className="text-gray-400">__________________________</div>
                </div>
              </div>
            </div>

            {/* Print Styles Injection */}
            <style>{`
              @media print {
                body * {
                  visibility: hidden !important;
                }
                #printable-dashboard-report, #printable-dashboard-report * {
                  visibility: visible !important;
                }
                #printable-dashboard-report {
                  position: fixed !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 20px !important;
                  background: white !important;
                  color: black !important;
                  box-shadow: none !important;
                  border: none !important;
                  z-index: 99999 !important;
                }
                .no-print {
                  display: none !important;
                }
              }
            `}</style>
          </div>
        </div>
      )}
    </div>
  );
};
