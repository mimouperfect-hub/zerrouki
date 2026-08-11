import React, { useEffect, useState } from 'react';
import {
  Boxes, AlertTriangle, Calendar, RefreshCw, Trash2, ShieldAlert, CheckCircle2,
  ArrowDownRight, ArrowUpRight, Search, Plus, Edit3, History, DollarSign, Filter,
  Sparkles, Check, X, Layers, AlertCircle, ArrowDown, ArrowUp, Barcode, Eye, FileText
} from 'lucide-react';
import { api } from '../../api/client';
import { Product, Category, ProductBatch } from '../../types';
import { platformConfirm, platformAlert } from '../../context/DialogContext';

import { exportToExcel } from '../../utils/excelExport';

export const InventoryView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab State
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'FEFO' | 'MOVEMENTS' | 'STOCKTAKING'>('OVERVIEW');

  // Stocktaking State
  const [stocktakingCounts, setStocktakingCounts] = useState<Record<string, number>>({});
  const [isSubmittingStocktake, setIsSubmittingStocktake] = useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'LOW_STOCK' | 'EXPIRED' | 'NEAR_EXPIRATION'>('ALL');

  // Stock Adjustment Modal state
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [adjustBatchId, setAdjustBatchId] = useState<string>('');
  const [adjustType, setAdjustType] = useState<'IN' | 'OUT' | 'DAMAGE' | 'ADJUSTMENT'>('ADJUSTMENT');
  const [adjustQtyDelta, setAdjustQtyDelta] = useState<number>(1);
  const [adjustReason, setAdjustReason] = useState('');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  // Add Batch Modal state
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [newBatchProduct, setNewBatchProduct] = useState<Product | null>(null);
  const [newBatchNumber, setNewBatchNumber] = useState('');
  const [newBatchProdDate, setNewBatchProdDate] = useState('');
  const [newBatchExpDate, setNewBatchExpDate] = useState('');
  const [newBatchQty, setNewBatchQty] = useState<number>(10);
  const [newBatchCost, setNewBatchCost] = useState<number>(0);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);

  const handleExportInventoryExcel = () => {
    const headers = ['اسم المنتج', 'الباركود', 'التصنيف', 'الرصيد الحالي', 'سعر الشراء', 'سعر البيع', 'القيمة الإجمالية بالكلفة'];
    const rows = products.map(p => {
      const cat = categories.find(c => c.id === p.categoryId)?.nameAr || 'عام';
      return [p.nameAr, p.barcode, cat, p.currentStock, p.purchasePrice, p.sellingPrice, p.currentStock * p.purchasePrice];
    });
    exportToExcel('مخزون_مؤسسة_زروقي', headers, rows);
  };

  const handleApplyStocktake = async () => {
    const modifiedEntries = Object.entries(stocktakingCounts).filter(([prodId, actualVal]) => {
      const p = products.find(prod => prod.id === prodId);
      return p && actualVal !== p.currentStock;
    });

    if (modifiedEntries.length === 0) {
      platformAlert({ title: 'تنبيه', message: 'لم تقم بتعديل الرصيد الفعلي لأي منتج في الجدول.', variant: 'warning' });
      return;
    }

    const isConfirmed = await platformConfirm({
      title: 'تأكيد اعتماد نتائج الجرد (Inventaire)',
      message: `هل أنت تأكد من اعتماد نتائج الجرد لـ ${modifiedEntries.length} أصناف وتسوية المخزون فورياً؟`,
      confirmText: 'تأكيد واعتماد الجرد ✨'
    });

    if (!isConfirmed) return;

    try {
      setIsSubmittingStocktake(true);
      for (const [prodId, actualVal] of modifiedEntries) {
        const p = products.find(prod => prod.id === prodId)!;
        const delta = actualVal - p.currentStock;
        await api.adjustStock({
          productId: prodId,
          type: 'ADJUSTMENT',
          quantityDelta: delta,
          reason: 'جرد فعلي بالمحل (Inventaire)'
        });
      }
      alert(`تمت تسوية الجرد الفعلي لـ ${modifiedEntries.length} صنف بنجاح ✨`);
      setStocktakingCounts({});
      loadInventoryData();
    } catch (err: any) {
      platformAlert({ title: 'خطأ', message: err.message || 'فشلت عملية اعتماد الجرد', variant: 'error' });
    } finally {
      setIsSubmittingStocktake(false);
    }
  };

  useEffect(() => {
    loadInventoryData();
  }, []);

  const loadInventoryData = async () => {
    try {
      setLoading(true);
      const [prodsRes, catsRes, movsRes] = await Promise.all([
        api.getProducts(),
        api.getCategories(),
        api.getStockMovements()
      ]);
      setProducts(prodsRes);
      setCategories(catsRes);
      setMovements(movsRes);
    } catch (e) {
      console.error('Failed to load inventory data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Calculate Expiration Days
  const getDaysUntilExpiration = (expDate: string) => {
    const diff = new Date(expDate).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  };

  // Collect all FEFO batches across products
  const allBatches = products.flatMap((p) =>
    (p.batches || []).map((b) => ({
      ...b,
      productId: p.id,
      productNameAr: p.nameAr,
      barcode: p.barcode,
      currentStock: p.currentStock
    }))
  ).sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());

  // Inventory KPI Totals
  const totalCostValue = products.reduce((acc, p) => acc + p.currentStock * p.purchasePrice, 0);
  const totalRetailValue = products.reduce((acc, p) => acc + p.currentStock * p.sellingPrice, 0);
  const lowStockCount = products.filter((p) => p.currentStock <= p.minStock).length;
  const expiredBatchesCount = allBatches.filter((b) => getDaysUntilExpiration(b.expirationDate) <= 0).length;
  const nearExpBatchesCount = allBatches.filter((b) => {
    const d = getDaysUntilExpiration(b.expirationDate);
    return d > 0 && d <= 45;
  }).length;

  // Filtered Products List
  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || p.nameAr.toLowerCase().includes(q) || p.barcode.includes(q) || p.internalCode.toLowerCase().includes(q);
    const matchesCat = !selectedCategoryId || p.categoryId === selectedCategoryId;

    let matchesStatus = true;
    if (filterStatus === 'LOW_STOCK') matchesStatus = p.currentStock <= p.minStock;
    if (filterStatus === 'EXPIRED') matchesStatus = (p.batches || []).some((b) => getDaysUntilExpiration(b.expirationDate) <= 0);
    if (filterStatus === 'NEAR_EXPIRATION') matchesStatus = (p.batches || []).some((b) => {
      const d = getDaysUntilExpiration(b.expirationDate);
      return d > 0 && d <= 45;
    });

    return matchesSearch && matchesCat && matchesStatus;
  });

  // Filtered Batches List
  const filteredBatches = allBatches.filter((b) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || b.productNameAr.toLowerCase().includes(q) || b.barcode.includes(q) || b.batchNumber.toLowerCase().includes(q);

    let matchesStatus = true;
    const d = getDaysUntilExpiration(b.expirationDate);
    if (filterStatus === 'EXPIRED') matchesStatus = d <= 0;
    if (filterStatus === 'NEAR_EXPIRATION') matchesStatus = d > 0 && d <= 45;

    return matchesSearch && matchesStatus;
  });

  // Handle Stock Adjust Submit
  const handleExecuteAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProduct) return;

    try {
      setIsSubmittingAdjust(true);
      const isNegative = adjustType === 'OUT' || adjustType === 'DAMAGE';
      const delta = isNegative ? -Math.abs(adjustQtyDelta) : Math.abs(adjustQtyDelta);

      await api.adjustStock({
        productId: adjustProduct.id,
        batchId: adjustBatchId || undefined,
        type: adjustType === 'DAMAGE' ? 'WASTE' : adjustType,
        quantityDelta: delta,
        reason: adjustReason.trim() || (adjustType === 'DAMAGE' ? 'تسجيل تالف' : 'تسوية مخزون')
      });

      setShowAdjustModal(false);
      setAdjustReason('');
      setAdjustQtyDelta(1);
      loadInventoryData();
    } catch (err: any) {
      alert(err.message || 'فشل تعديل المخزون');
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  // Handle Create Batch Submit
  const handleExecuteAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchProduct || !newBatchExpDate) return;

    try {
      setIsSubmittingBatch(true);
      await api.createBatch({
        productId: newBatchProduct.id,
        batchNumber: newBatchNumber.trim(),
        productionDate: newBatchProdDate || undefined,
        expirationDate: newBatchExpDate,
        quantity: Number(newBatchQty) || 0,
        purchasePrice: Number(newBatchCost) || newBatchProduct.purchasePrice
      });

      setShowAddBatchModal(false);
      setNewBatchNumber('');
      setNewBatchProdDate('');
      setNewBatchExpDate('');
      setNewBatchQty(10);
      loadInventoryData();
    } catch (err: any) {
      alert(err.message || 'فشلت إضافة الدفعة');
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  // Handle Dispose Batch
  const handleDisposeBatch = async (batchId: string, productName: string, batchNo: string) => {
    const isConfirmed = await platformConfirm({
      title: 'إتلاف وتفريغ دفعة المخزون ⚠️',
      message: `هل أنت متأكد من إتلاف وتفريغ الدفعة (${batchNo}) للمنتج "${productName}" بالكامل من المخزون؟`,
      confirmText: 'تأكيد الإتلاف النهائي',
      cancelText: 'إلغاء',
      variant: 'danger'
    });

    if (isConfirmed) {
      try {
        await api.disposeBatch(batchId, 'إتلاف وتفريغ دفعة منتهية الصلاحية من شاشة المخزون');
        loadInventoryData();
      } catch (err: any) {
        platformAlert({ title: 'خطأ', message: err.message || 'فشل إتلاف الدفعة', variant: 'error' });
      }
    }
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-purple-950 flex items-center gap-2">
            <Boxes className="w-6 h-6 text-amber-500" />
            مركز إدارة وتتبع المخزون الشامل (FEFO & Stock Control)
          </h1>
          <p className="text-xs text-slate-500 font-bold mt-1">
            جرد المنتجات، تعديل المخزون، تتبع تواريخ الصلاحية FEFO، وتسجيل الشحنات والتالف
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setNewBatchProduct(products[0] || null);
              setNewBatchCost(products[0]?.purchasePrice || 0);
              setShowAddBatchModal(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white font-black text-xs shadow-md hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>إضافة دفعة/شحنة صلاحية 🏷️</span>
          </button>
          <button
            onClick={() => {
              setAdjustProduct(products[0] || null);
              setShowAdjustModal(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-900 to-indigo-900 text-amber-300 font-black text-xs shadow-md hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Edit3 className="w-4 h-4 text-amber-400" />
            <span>تعديل/جرد المخزون ⚖️</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-bold">قيمة المخزون بسعر الشراء</span>
            <div className="text-lg font-black text-purple-950 font-mono mt-0.5">
              {totalCostValue.toLocaleString()} د.ج
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">الكلفة الإجمالية في المخازن</span>
          </div>
          <div className="p-3 bg-purple-100 text-purple-900 rounded-2xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-bold">قيمة المخزون المتوقعة (بيع)</span>
            <div className="text-lg font-black text-amber-900 font-mono mt-0.5">
              {totalRetailValue.toLocaleString()} د.ج
            </div>
            <span className="text-[10px] text-emerald-600 font-bold">
              ربح مأمول: {(totalRetailValue - totalCostValue).toLocaleString()} د.ج
            </span>
          </div>
          <div className="p-3 bg-amber-100 text-amber-900 rounded-2xl">
            <Sparkles className="w-6 h-6 text-amber-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-bold">منخفض المخزون (تنبيه)</span>
            <div className="text-lg font-black text-rose-600 font-mono mt-0.5">
              {lowStockCount} أصناف
            </div>
            <span className="text-[10px] text-rose-500 font-bold">تتطلب إعادة طلب فورية</span>
          </div>
          <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-bold">دفعات منتهية / قريبة الانتهاء</span>
            <div className="text-lg font-black text-rose-700 font-mono mt-0.5">
              {expiredBatchesCount} منتهي • {nearExpBatchesCount} قريب
            </div>
            <span className="text-[10px] text-slate-500 font-bold">تطبيق أولوية البيع FEFO</span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-800 rounded-2xl border border-rose-200">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs Bar & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-100 pb-3">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'OVERVIEW'
                  ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white shadow-md'
                  : 'bg-slate-100 text-purple-950 hover:bg-slate-200'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>دليل المخزون العام ({products.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('FEFO')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'FEFO'
                  ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white shadow-md'
                  : 'bg-slate-100 text-purple-950 hover:bg-slate-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>تتبع دُفعات الصلاحية (FEFO - {allBatches.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('MOVEMENTS')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'MOVEMENTS'
                  ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white shadow-md'
                  : 'bg-slate-100 text-purple-950 hover:bg-slate-200'
              }`}
            >
              <History className="w-4 h-4" />
              <span>سجل حركات وتعديلات المخزون ({movements.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('STOCKTAKING')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'STOCKTAKING'
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-purple-950 text-white shadow-md'
                  : 'bg-slate-100 text-purple-950 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>شاشة الجرد الفعلي للمخزن (Inventaire) 📋</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportInventoryExcel}
              className="px-3.5 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <FileText className="w-4 h-4 text-emerald-700" />
              <span>تصدير لـ Excel 📊</span>
            </button>

            <button
              onClick={loadInventoryData}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-purple-950 transition-colors cursor-pointer"
              title="تحديث البيانات"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters Controls */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم المنتج، الباركود، أو رقم الدفعة..."
              className="w-full pr-9 pl-4 py-2 bg-[#FAF7F2] border border-amber-200 rounded-xl text-xs font-bold text-purple-950 outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {activeTab === 'OVERVIEW' && (
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="px-3 py-2 bg-[#FAF7F2] border border-amber-200 rounded-xl text-xs font-bold text-purple-950 outline-none"
            >
              <option value="">جميع التصنيفات</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameAr}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer ${
                filterStatus === 'ALL' ? 'bg-white text-purple-950 shadow-2xs' : 'text-slate-600'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setFilterStatus('LOW_STOCK')}
              className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer ${
                filterStatus === 'LOW_STOCK' ? 'bg-rose-500 text-white shadow-2xs' : 'text-slate-600'
              }`}
            >
              منخفض المخزون ⚠️
            </button>
            <button
              onClick={() => setFilterStatus('EXPIRED')}
              className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer ${
                filterStatus === 'EXPIRED' ? 'bg-rose-700 text-white shadow-2xs' : 'text-slate-600'
              }`}
            >
              منتهي الصلاحية 🔴
            </button>
            <button
              onClick={() => setFilterStatus('NEAR_EXPIRATION')}
              className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer ${
                filterStatus === 'NEAR_EXPIRATION' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-600'
              }`}
            >
              قريب الانتهاء 🟡
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: OVERVIEW TABLE */}
      {activeTab === 'OVERVIEW' && (
        <div className="bg-white rounded-2xl border border-purple-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-gradient-to-r from-purple-50 via-rose-50 to-amber-50 text-purple-950 font-black border-b border-purple-100">
                <tr>
                  <th className="p-3.5">المنتج والباركود</th>
                  <th className="p-3.5">التصنيف وموقع التخزين</th>
                  <th className="p-3.5">سعر الشراء</th>
                  <th className="p-3.5">سعر البيع</th>
                  <th className="p-3.5">المخزون الحالي</th>
                  <th className="p-3.5">إجمالي القيمة</th>
                  <th className="p-3.5">حالة المخزون</th>
                  <th className="p-3.5 text-center">العمليات والسريعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400 font-bold">
                      جاري تحميل بيانات المخزون...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400 font-bold">
                      لا تتوفر منتجات تكتفي شروط البحث المخزني
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const cat = categories.find((c) => c.id === p.categoryId);
                    const isLow = p.currentStock <= p.minStock;
                    const stockCostValue = p.currentStock * p.purchasePrice;

                    return (
                      <tr key={p.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                        <td className="p-3.5">
                          <div className="font-black text-purple-950">{p.nameAr}</div>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                            <Barcode className="w-3 h-3 text-amber-500" />
                            <span>{p.barcode}</span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-700">{cat ? cat.nameAr : 'عام'}</div>
                          <div className="text-[10px] text-slate-400">{p.storageLocation || 'المخزن الرئيسي'}</div>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-slate-600">
                          {p.purchasePrice.toLocaleString()} د.ج
                        </td>
                        <td className="p-3.5 font-mono font-black text-amber-900">
                          {p.sellingPrice.toLocaleString()} د.ج
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`font-black font-mono px-2.5 py-1 rounded-lg text-xs ${
                              isLow
                                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {p.currentStock} قطعة
                          </span>
                        </td>
                        <td className="p-3.5 font-mono font-black text-purple-950">
                          {stockCostValue.toLocaleString()} د.ج
                        </td>
                        <td className="p-3.5">
                          {p.currentStock === 0 ? (
                            <span className="bg-rose-700 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                              نفد المخزون 🔴
                            </span>
                          ) : isLow ? (
                            <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                              منخفض المخزون ⚠️
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                              مخزون ممتاز 🟢
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setAdjustProduct(p);
                                setAdjustBatchId('');
                                setShowAdjustModal(true);
                              }}
                              className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-950 font-black rounded-lg text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                              title="جرد وتعديل مخزون المنتج"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-purple-700" />
                              <span>تعديل المخزون</span>
                            </button>

                            <button
                              onClick={() => {
                                setNewBatchProduct(p);
                                setNewBatchCost(p.purchasePrice);
                                setShowAddBatchModal(true);
                              }}
                              className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-black rounded-lg text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                              title="إضافة دفعة FEFO جديدة"
                            >
                              <Plus className="w-3.5 h-3.5 text-amber-600" />
                              <span>دفعة جديدة</span>
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
      )}

      {/* TAB 2: FEFO BATCHES TABLE */}
      {activeTab === 'FEFO' && (
        <div className="bg-white rounded-2xl border border-purple-100 shadow-xs overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-purple-50 via-rose-50 to-amber-50 border-b border-purple-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-900" />
              <h3 className="font-black text-sm text-purple-950">جدول دفعات المنتجات وتاريخ الانتهاء (FEFO)</h3>
            </div>
            <span className="text-xs font-black bg-amber-100 text-amber-900 px-3 py-1 rounded-full border border-amber-200">
              الأقرب انتهاءً يظهر أولاً ⚡
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-gradient-to-r from-purple-50 via-rose-50 to-amber-50 text-purple-950 font-black border-b border-purple-100">
                <tr>
                  <th className="p-3.5">المنتج</th>
                  <th className="p-3.5">رقم الدفعة (Batch/Lot)</th>
                  <th className="p-3.5">تاريخ الإنتاج</th>
                  <th className="p-3.5">تاريخ الانتهاء</th>
                  <th className="p-3.5">الكمية المتبقية بالدفعة</th>
                  <th className="p-3.5">سعر الكلفة</th>
                  <th className="p-3.5">حالة الصلاحية</th>
                  <th className="p-3.5 text-center">العمليات والإتلاف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400 font-bold">
                      جاري فحص دُفعات المخزون...
                    </td>
                  </tr>
                ) : filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400 font-bold">
                      لا توجد دُفعات مخزون مسجلة مطابقة للبحث
                    </td>
                  </tr>
                ) : (
                  filteredBatches.map((batch) => {
                    const daysLeft = getDaysUntilExpiration(batch.expirationDate);
                    const isExpired = daysLeft <= 0;
                    const isNear = daysLeft > 0 && daysLeft <= 45;

                    return (
                      <tr key={batch.id} className="hover:bg-[#FAF7F2]/50 transition-colors">
                        <td className="p-3.5 font-bold text-purple-950">{batch.productNameAr}</td>
                        <td className="p-3.5 font-mono text-slate-600">{batch.batchNumber}</td>
                        <td className="p-3.5 font-mono text-slate-400">{batch.productionDate || '—'}</td>
                        <td className="p-3.5 font-mono font-black text-slate-900">{batch.expirationDate}</td>
                        <td className="p-3.5 font-mono font-black text-amber-900">{batch.quantity} قطعة</td>
                        <td className="p-3.5 font-mono font-bold text-slate-600">
                          {batch.purchasePrice?.toLocaleString()} د.ج
                        </td>
                        <td className="p-3.5">
                          {isExpired ? (
                            <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">
                              <ShieldAlert className="w-3 h-3 text-rose-600" />
                              منتهي الصلاحية ({Math.abs(daysLeft)} يوم)
                            </span>
                          ) : isNear ? (
                            <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 w-fit border border-amber-200">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              ينتهي خلال {daysLeft} يوم
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              صالح ({daysLeft} يوم)
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                const prod = products.find((x) => x.id === batch.productId);
                                if (prod) {
                                  setAdjustProduct(prod);
                                  setAdjustBatchId(batch.id);
                                  setShowAdjustModal(true);
                                }
                              }}
                              className="p-1.5 rounded-lg bg-purple-50 text-purple-900 hover:bg-purple-100 cursor-pointer"
                              title="تعديل كمية الدفعة"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDisposeBatch(batch.id, batch.productNameAr, batch.batchNumber)}
                              className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                              title="إتلاف وتفريغ الدفعة من المخزن"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
      )}

      {/* TAB 3: STOCK MOVEMENTS LOG */}
      {activeTab === 'MOVEMENTS' && (
        <div className="bg-white rounded-2xl border border-purple-100 shadow-xs overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-purple-50 via-rose-50 to-amber-50 border-b border-purple-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-purple-900" />
              <h3 className="font-black text-sm text-purple-950">سجل حركات وتعديلات المخزون بالتفصيل</h3>
            </div>
            <span className="text-xs font-bold text-slate-500">توثيق العمليات والمؤولين</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-gradient-to-r from-purple-50 via-rose-50 to-amber-50 text-purple-950 font-black border-b border-purple-100">
                <tr>
                  <th className="p-3.5">تاريخ الحركة</th>
                  <th className="p-3.5">المنتج</th>
                  <th className="p-3.5">نوع الحركة</th>
                  <th className="p-3.5">التغير في الكمية</th>
                  <th className="p-3.5">المخزون بعد الحركة</th>
                  <th className="p-3.5">المسؤول</th>
                  <th className="p-3.5">السبب والبيانات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400 font-bold">
                      جاري تحميل سجل الحركات...
                    </td>
                  </tr>
                ) : movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400 font-bold">
                      لا يوجد سجل حركات مخزنية مسجل حالياً
                    </td>
                  </tr>
                ) : (
                  movements.map((mov) => {
                    const isPositive = mov.quantityDelta > 0;
                    return (
                      <tr key={mov.id} className="hover:bg-[#FAF7F2]/50 transition-colors">
                        <td className="p-3.5 font-mono text-slate-500">
                          {new Date(mov.createdAt).toLocaleString('ar-DZ')}
                        </td>
                        <td className="p-3.5 font-bold text-purple-950">{mov.productNameAr}</td>
                        <td className="p-3.5">
                          <span className="bg-purple-100 text-purple-900 text-[10px] font-black px-2.5 py-0.5 rounded-md">
                            {mov.type}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono font-black">
                          <span
                            className={`flex items-center gap-1 ${
                              isPositive ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                            {isPositive ? `+${mov.quantityDelta}` : mov.quantityDelta} قطعة
                          </span>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-slate-800">{mov.stockAfter} قطعة</td>
                        <td className="p-3.5 font-bold text-slate-700">{mov.userName}</td>
                        <td className="p-3.5 text-slate-500 text-[11px]">{mov.notes || '—'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PHYSICAL STOCKTAKING (Inventaire) */}
      {activeTab === 'STOCKTAKING' && (
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-xs overflow-hidden space-y-4">
          <div className="p-4 bg-gradient-to-r from-emerald-950 via-teal-950 to-purple-950 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="font-black text-sm text-white">شاشة الجرد الفعلي للمخزن بالمحل (Inventaire)</h3>
              </div>
              <p className="text-[11px] text-emerald-200 font-bold mt-0.5">
                أدخل الكمية الحقيقية الموجودة بالرفوف، وسيتم حساب الفارق المالي وتحديث المخزون أوتوماتيكياً
              </p>
            </div>

            <button
              onClick={handleApplyStocktake}
              disabled={isSubmittingStocktake}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:brightness-110 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-white" />
              <span>{isSubmittingStocktake ? 'جاري الاعتماد...' : 'اعتماد الجرد وتسوية الفروقات بنقرة واحدة ✨'}</span>
            </button>
          </div>

          <div className="overflow-x-auto p-4 pt-0">
            <table className="w-full text-right text-xs">
              <thead className="bg-gradient-to-r from-purple-50 via-emerald-50 to-amber-50 text-purple-950 font-black border-b border-purple-100">
                <tr>
                  <th className="p-3.5">المنتج والباركود</th>
                  <th className="p-3.5">التصنيف</th>
                  <th className="p-3.5 text-center">الرصيد الآلي الحالي</th>
                  <th className="p-3.5 text-center w-40">الرصيد الفعلي بالمحل (مدخل)</th>
                  <th className="p-3.5 text-center">الفارق في القطع</th>
                  <th className="p-3.5 text-left">الفارق المالي بالكلفة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400 font-bold">
                      لا توجد منتجات مسجلة للجرد
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const actualCount = stocktakingCounts[product.id] !== undefined ? stocktakingCounts[product.id] : product.currentStock;
                    const diff = actualCount - product.currentStock;
                    const valueDiff = diff * product.purchasePrice;
                    const isChanged = diff !== 0;

                    return (
                      <tr key={product.id} className={`hover:bg-[#FAF7F2]/50 transition-colors ${isChanged ? 'bg-amber-50/60 font-black' : ''}`}>
                        <td className="p-3.5">
                          <div className="font-black text-purple-950">{product.nameAr}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{product.barcode}</div>
                        </td>
                        <td className="p-3.5 font-bold text-slate-600">
                          {categories.find(c => c.id === product.categoryId)?.nameAr || 'عام'}
                        </td>
                        <td className="p-3.5 text-center font-mono font-black text-purple-950 text-sm">
                          {product.currentStock}
                        </td>
                        <td className="p-3.5 text-center">
                          <input
                            type="number"
                            min={0}
                            value={actualCount}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : Number(e.target.value);
                              setStocktakingCounts(prev => ({ ...prev, [product.id]: val }));
                            }}
                            className={`w-28 text-center px-3 py-1.5 rounded-xl font-mono font-black text-sm outline-none border transition-all ${
                              isChanged
                                ? 'bg-amber-100 border-amber-400 text-amber-950 ring-2 ring-amber-300'
                                : 'bg-[#FFFBF7] border-gray-300 text-purple-950 focus:ring-2 focus:ring-amber-400'
                            }`}
                          />
                        </td>
                        <td className="p-3.5 text-center font-mono font-black">
                          {diff === 0 ? (
                            <span className="text-slate-400 text-xs">—</span>
                          ) : diff > 0 ? (
                            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full border border-emerald-200">
                              +{diff} زائد
                            </span>
                          ) : (
                            <span className="bg-rose-100 text-rose-800 text-xs px-2.5 py-1 rounded-full border border-rose-200">
                              {diff} ناقص
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-left font-mono font-black text-xs">
                          {valueDiff === 0 ? (
                            <span className="text-slate-400">0 د.ج</span>
                          ) : valueDiff > 0 ? (
                            <span className="text-emerald-700">+{valueDiff.toLocaleString()} د.ج</span>
                          ) : (
                            <span className="text-rose-600">{valueDiff.toLocaleString()} د.ج</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: STOCK ADJUSTMENT MODAL */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-[#2E1065] via-[#3B0764] to-[#1E1B4B] text-white p-5 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-400/20 rounded-2xl text-amber-300">
                  <Edit3 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-white">تعديل وجرد مخزون المنتج</h3>
                  <p className="text-xs text-purple-200 font-bold">تسجيل حركات الإدخال، الإخراج، التالف أو التسوية</p>
                </div>
              </div>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteAdjust} className="p-6 overflow-y-auto space-y-4 text-xs font-black text-purple-950">
              {/* Product Selector */}
              <div>
                <label className="block mb-1 text-slate-600">اختر المنتج المراد تعديل مخزونه *</label>
                <select
                  value={adjustProduct?.id || ''}
                  onChange={(e) => {
                    const p = products.find((x) => x.id === e.target.value);
                    if (p) {
                      setAdjustProduct(p);
                      setAdjustBatchId('');
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl outline-none font-bold text-xs"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nameAr} - (المخزون الحالي: {p.currentStock} قطعة)
                    </option>
                  ))}
                </select>
              </div>

              {/* Batch Selector if product has batches */}
              {adjustProduct?.batches && adjustProduct.batches.length > 0 && (
                <div>
                  <label className="block mb-1 text-slate-600">اختر الدفعة (اختياري):</label>
                  <select
                    value={adjustBatchId}
                    onChange={(e) => setAdjustBatchId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl outline-none font-bold text-xs"
                  >
                    <option value="">تعديل المخزون الإجمالي للمنتج</option>
                    {adjustProduct.batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        دفعة رقم: {b.batchNumber} - الكمية: {b.quantity} (ينتهي: {b.expirationDate})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Movement Type */}
              <div>
                <label className="block mb-1 text-slate-600">نوع العملية *</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl outline-none font-bold text-xs"
                >
                  <option value="IN">إضافة توريد للمخزون (موجب +)</option>
                  <option value="OUT">إخراج مخزون / تسوية (سالب -)</option>
                  <option value="DAMAGE">تسجيل كسر أو تالف (سالب -)</option>
                  <option value="ADJUSTMENT">جرد تصحيحي مباشر (موجب +)</option>
                </select>
              </div>

              {/* Quantity Input */}
              <div>
                <label className="block mb-1 text-slate-600">الكمية المعدلة (عدد القطع) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={adjustQtyDelta}
                  onChange={(e) => setAdjustQtyDelta(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-base font-mono font-black outline-none"
                />
              </div>

              {/* Reason Input */}
              <div>
                <label className="block mb-1 text-slate-600">السبب / الملاحظات *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: جرد شهري / بضاعة تالفة / توريد إضافي"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold outline-none"
                />
              </div>

              <div className="pt-3 border-t border-purple-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-5 py-2.5 rounded-2xl border border-gray-300 font-black text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdjust}
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:brightness-110 text-white font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingAdjust ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>تأكيد تعديل المخزون ✨</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD BATCH MODAL */}
      {showAddBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-[#2E1065] via-[#3B0764] to-[#1E1B4B] text-white p-5 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-400/20 rounded-2xl text-amber-300">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-white">إضافة دفعة/شحنة مخزون جديدة (FEFO)</h3>
                  <p className="text-xs text-purple-200 font-bold">إدخال دفعة برقم تشغيلة وتاريخ انتهاء صلاحية محدد</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddBatchModal(false)}
                className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteAddBatch} className="p-6 overflow-y-auto space-y-4 text-xs font-black text-purple-950">
              {/* Product Selector */}
              <div>
                <label className="block mb-1 text-slate-600">اختر المنتج *</label>
                <select
                  value={newBatchProduct?.id || ''}
                  onChange={(e) => {
                    const p = products.find((x) => x.id === e.target.value);
                    if (p) {
                      setNewBatchProduct(p);
                      setNewBatchCost(p.purchasePrice);
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl outline-none font-bold text-xs"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nameAr} - (المخزون الحالي: {p.currentStock})
                    </option>
                  ))}
                </select>
              </div>

              {/* Batch Number */}
              <div>
                <label className="block mb-1 text-slate-600">رقم الدفعة (Lot/Batch Number) *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: LOT-2026-0809"
                  value={newBatchNumber}
                  onChange={(e) => setNewBatchNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-mono font-black outline-none"
                />
              </div>

              {/* Expiration Date & Production Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-slate-600">تاريخ الإنتاج (اختياري)</label>
                  <input
                    type="date"
                    value={newBatchProdDate}
                    onChange={(e) => setNewBatchProdDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-mono font-black outline-none"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-slate-600">تاريخ انتهاء الصلاحية (FEFO) *</label>
                  <input
                    type="date"
                    required
                    value={newBatchExpDate}
                    onChange={(e) => setNewBatchExpDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-mono font-black outline-none"
                  />
                </div>
              </div>

              {/* Quantity & Purchase Cost */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-slate-600">الكمية الواردة بالدفعة *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newBatchQty}
                    onChange={(e) => setNewBatchQty(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-mono font-black outline-none"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-slate-600">سعر الشراء الكلفة (د.ج) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={newBatchCost}
                    onChange={(e) => setNewBatchCost(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-mono font-black outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-purple-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowAddBatchModal(false)}
                  className="px-5 py-2.5 rounded-2xl border border-gray-300 font-black text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBatch || !newBatchExpDate}
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:brightness-110 text-white font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingBatch ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>تأكيد إضافة الدفعة ✨</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
