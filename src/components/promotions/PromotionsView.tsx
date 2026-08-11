import React, { useEffect, useState } from 'react';
import {
  Tag, Plus, Percent, Calendar, CheckCircle2, Clock, Trash2, Edit3, Power,
  Search, Filter, Sparkles, Layers, DollarSign, Gift, Package, RefreshCw, X, AlertTriangle, Check
} from 'lucide-react';
import { api } from '../../api/client';
import { Promotion, Category, Product } from '../../types';
import { platformConfirm, platformAlert } from '../../context/DialogContext';

export const PromotionsView: React.FC = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTIVE' | 'UPCOMING' | 'EXPIRED'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);

  // Form State
  const [titleAr, setTitleAr] = useState('');
  const [type, setType] = useState<'PERCENTAGE' | 'FIXED' | 'BUY_X_GET_Y' | 'BUNDLE'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<number | ''>(10);
  const [buyQuantity, setBuyQuantity] = useState<number | ''>(2);
  const [getQuantity, setGetQuantity] = useState<number | ''>(1);
  const [minPurchaseAmount, setMinPurchaseAmount] = useState<number | ''>('');
  const [startDate, setStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().substring(0, 10));
  const [isActive, setIsActive] = useState(true);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prms, cats, prods] = await Promise.all([
        api.getPromotions(),
        api.getCategories(),
        api.getProducts()
      ]);
      setPromotions(prms || []);
      setCategories(cats || []);
      setProducts(prods || []);
    } catch (err) {
      console.error('Failed to load promotions data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (promo?: Promotion) => {
    if (promo) {
      setEditingPromo(promo);
      setTitleAr(promo.titleAr);
      setType(promo.type);
      setDiscountValue(promo.discountValue || '');
      setBuyQuantity(promo.buyQuantity || 2);
      setGetQuantity(promo.getQuantity || 1);
      setMinPurchaseAmount(promo.minPurchaseAmount || '');
      setStartDate(promo.startDate);
      setEndDate(promo.endDate);
      setIsActive(promo.isActive);
      setSelectedCategoryIds(promo.applicableCategoryIds || []);
      setSelectedProductIds(promo.applicableProductIds || []);
    } else {
      setEditingPromo(null);
      setTitleAr('');
      setType('PERCENTAGE');
      setDiscountValue(10);
      setBuyQuantity(2);
      setGetQuantity(1);
      setMinPurchaseAmount('');
      setStartDate(new Date().toISOString().substring(0, 10));
      setEndDate(new Date(Date.now() + 30 * 86400000).toISOString().substring(0, 10));
      setIsActive(true);
      setSelectedCategoryIds([]);
      setSelectedProductIds([]);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleAr.trim()) {
      alert('يرجى كتابة عنوان العرض الترويجي');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        titleAr: titleAr.trim(),
        type,
        discountValue: Number(discountValue) || 0,
        buyQuantity: type === 'BUY_X_GET_Y' ? Number(buyQuantity) || 1 : undefined,
        getQuantity: type === 'BUY_X_GET_Y' ? Number(getQuantity) || 1 : undefined,
        minPurchaseAmount: minPurchaseAmount ? Number(minPurchaseAmount) : undefined,
        startDate,
        endDate,
        isActive,
        applicableCategoryIds: selectedCategoryIds,
        applicableProductIds: selectedProductIds
      };

      if (editingPromo) {
        await api.updatePromotion(editingPromo.id, payload);
      } else {
        await api.createPromotion(payload);
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'فشلت عملية حفظ العرض الترويجي');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.togglePromotion(id);
      loadData();
    } catch (err: any) {
      alert('فشل تغيير حالة العرض الترويجي');
    }
  };

  const handleDelete = async (promo: Promotion) => {
    const isConfirmed = await platformConfirm({
      title: 'حذف العرض الترويجي 🏷️',
      message: `هل أنت متأكد من حذف العرض الترويجي "${promo.titleAr}"؟`,
      confirmText: 'تأكيد الحذف',
      cancelText: 'إلغاء',
      variant: 'danger'
    });

    if (isConfirmed) {
      try {
        await api.deletePromotion(promo.id);
        loadData();
      } catch (err: any) {
        platformAlert({ title: 'خطأ', message: 'فشل حذف العرض الترويجي', variant: 'error' });
      }
    }
  };

  const toggleCategorySelect = (catId: string) => {
    if (selectedCategoryIds.includes(catId)) {
      setSelectedCategoryIds(selectedCategoryIds.filter(id => id !== catId));
    } else {
      setSelectedCategoryIds([...selectedCategoryIds, catId]);
    }
  };

  const toggleProductSelect = (prodId: string) => {
    if (selectedProductIds.includes(prodId)) {
      setSelectedProductIds(selectedProductIds.filter(id => id !== prodId));
    } else {
      setSelectedProductIds([...selectedProductIds, prodId]);
    }
  };

  // Status helper
  const getPromoStatus = (promo: Promotion) => {
    const today = new Date().toISOString().substring(0, 10);
    if (!promo.isActive) return { code: 'INACTIVE', label: 'غير مفعل ⏸️', color: 'bg-gray-100 text-gray-700 border-gray-200' };
    if (today < promo.startDate) return { code: 'UPCOMING', label: 'قادماً قريباً ⏳', color: 'bg-amber-100 text-amber-900 border-amber-300' };
    if (today > promo.endDate) return { code: 'EXPIRED', label: 'منتهي 🔴', color: 'bg-rose-100 text-rose-800 border-rose-200' };
    return { code: 'ACTIVE', label: 'نشط ساري 🟢', color: 'bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse' };
  };

  // KPIs
  const todayStr = new Date().toISOString().substring(0, 10);
  const activeCount = promotions.filter(p => p.isActive && todayStr >= p.startDate && todayStr <= p.endDate).length;
  const upcomingCount = promotions.filter(p => p.isActive && todayStr < p.startDate).length;
  const expiredCount = promotions.filter(p => todayStr > p.endDate || !p.isActive).length;

  // Filtered List
  const filteredPromotions = promotions.filter(promo => {
    const status = getPromoStatus(promo).code;
    const matchesSearch = promo.titleAr.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filterTab === 'ACTIVE') return status === 'ACTIVE';
    if (filterTab === 'UPCOMING') return status === 'UPCOMING';
    if (filterTab === 'EXPIRED') return status === 'EXPIRED' || status === 'INACTIVE';
    return true;
  });

  // Preset Date Helper
  const applyPresetDates = (days: number) => {
    const start = new Date().toISOString().substring(0, 10);
    const end = new Date(Date.now() + days * 86400000).toISOString().substring(0, 10);
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200 dir-rtl">
      
      {/* Page Header */}
      <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-purple-950 text-white p-6 rounded-3xl border border-amber-400/30 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-amber-400 flex items-center gap-3">
            <Tag className="w-7 h-7 text-amber-400" />
            إدارة العروض والتخفيضات الموسمية
          </h1>
          <p className="text-xs text-amber-100/80 font-bold mt-1">
            إنشاء خصومات مئوية وثابتة وعروض (اشترِ X واحصل على Y مجاناً) تُطبق تلقائياً على الفواتير وشاشة POS
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white font-black text-xs shadow-lg hover:brightness-110 flex items-center gap-2 cursor-pointer transition-all active:scale-98"
        >
          <Plus className="w-5 h-5 text-white" />
          <span>إضافة عرض ترويجي جديد ✨</span>
        </button>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">إجمالي العروض</span>
            <span className="text-2xl font-black text-purple-950">{promotions.length}</span>
          </div>
          <div className="p-3 bg-purple-100 rounded-xl text-purple-700">
            <Tag className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">العروض السارية النشطة</span>
            <span className="text-2xl font-black text-emerald-600">{activeCount}</span>
          </div>
          <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">العروض القادمة</span>
            <span className="text-2xl font-black text-amber-600">{upcomingCount}</span>
          </div>
          <div className="p-3 bg-amber-100 rounded-xl text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">المنتهية أو المتوقفة</span>
            <span className="text-2xl font-black text-slate-600">{expiredCount}</span>
          </div>
          <div className="p-3 bg-slate-100 rounded-xl text-slate-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث باسم العرض الترويجي..."
            className="w-full pr-3.5 pl-9 py-2 bg-[#FFFBF7] border border-amber-200 rounded-xl text-xs font-bold text-purple-950 outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-purple-50 p-1 rounded-xl border border-purple-100 w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setFilterTab('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              filterTab === 'ALL' ? 'bg-purple-950 text-amber-300 shadow-xs' : 'text-purple-900 hover:bg-purple-100'
            }`}
          >
            الكل ({promotions.length})
          </button>
          <button
            onClick={() => setFilterTab('ACTIVE')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              filterTab === 'ACTIVE' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            النشطة 🟢 ({activeCount})
          </button>
          <button
            onClick={() => setFilterTab('UPCOMING')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              filterTab === 'UPCOMING' ? 'bg-amber-500 text-white shadow-xs' : 'text-amber-800 hover:bg-amber-100'
            }`}
          >
            القادمة ⏳ ({upcomingCount})
          </button>
          <button
            onClick={() => setFilterTab('EXPIRED')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              filterTab === 'EXPIRED' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            المنتهية 🔴 ({expiredCount})
          </button>
        </div>
      </div>

      {/* Promotions Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 font-bold flex items-center justify-center gap-3 bg-white rounded-3xl border border-purple-100">
          <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
          <span>جاري تحميل العروض الترويجية...</span>
        </div>
      ) : filteredPromotions.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-purple-200 space-y-3">
          <Tag className="w-12 h-12 text-purple-300 mx-auto" />
          <h3 className="font-black text-purple-950 text-base">لا توجد عروض ترويجية مطابقة!</h3>
          <p className="text-xs text-slate-400 font-bold max-w-sm mx-auto">
            قم بالضغط على زر "إضافة عرض ترويجي جديد" لإنشاء أول عرض ترويجي وتخفيضات للمحل.
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-purple-950 font-black text-xs rounded-xl transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            إنشاء عرض ترويجي جديد
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPromotions.map((p) => {
            const statusInfo = getPromoStatus(p);

            return (
              <div
                key={p.id}
                className="bg-white rounded-3xl border border-purple-100 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Top Banner */}
                <div className="p-5 space-y-3 bg-gradient-to-b from-[#FFFBF7] to-white border-b border-purple-50">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-black text-purple-950 text-sm leading-snug group-hover:text-amber-600 transition-colors">
                      {p.titleAr}
                    </h3>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border shrink-0 ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Promo Type Badge & Main Discount */}
                  <div className="flex items-center gap-2">
                    {p.type === 'PERCENTAGE' && (
                      <div className="px-3 py-1.5 rounded-xl bg-purple-950 text-amber-300 font-black text-xs flex items-center gap-1.5 shadow-xs">
                        <Percent className="w-4 h-4 text-amber-400" />
                        <span>خصم {p.discountValue}%</span>
                      </div>
                    )}

                    {p.type === 'FIXED' && (
                      <div className="px-3 py-1.5 rounded-xl bg-emerald-950 text-emerald-300 font-black text-xs flex items-center gap-1.5 shadow-xs">
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                        <span>خصم ثابت {p.discountValue?.toLocaleString()} د.ج</span>
                      </div>
                    )}

                    {p.type === 'BUY_X_GET_Y' && (
                      <div className="px-3 py-1.5 rounded-xl bg-rose-950 text-rose-200 font-black text-xs flex items-center gap-1.5 shadow-xs">
                        <Gift className="w-4 h-4 text-rose-400" />
                        <span>اشترِ {p.buyQuantity || 2} واحصل على {p.getQuantity || 1} مجاناً</span>
                      </div>
                    )}

                    {p.type === 'BUNDLE' && (
                      <div className="px-3 py-1.5 rounded-xl bg-indigo-950 text-indigo-200 font-black text-xs flex items-center gap-1.5 shadow-xs">
                        <Package className="w-4 h-4 text-indigo-400" />
                        <span>عرض حزمة / كومبو</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Details */}
                <div className="p-5 space-y-3 text-xs font-bold text-slate-600">
                  {/* Validity dates */}
                  <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px] bg-purple-50/60 p-2.5 rounded-xl border border-purple-100/60">
                    <Calendar className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>الصلاحية: من {p.startDate} إلى {p.endDate}</span>
                  </div>

                  {/* Constraints */}
                  {p.minPurchaseAmount && (
                    <div className="flex items-center gap-2 text-amber-800 text-[11px] font-black">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>الحد الأدنى للشراء: {p.minPurchaseAmount.toLocaleString()} د.ج</span>
                    </div>
                  )}

                  {/* Applicable Categories */}
                  {p.applicableCategoryIds && p.applicableCategoryIds.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 block font-bold">الأقسام المستهدفة بالعرض:</span>
                      <div className="flex flex-wrap gap-1">
                        {p.applicableCategoryIds.map(catId => {
                          const cat = categories.find(c => c.id === catId);
                          return (
                            <span key={catId} className="px-2 py-0.5 bg-purple-100 text-purple-900 rounded-md text-[10px] font-black">
                              {cat?.nameAr || catId}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="p-4 bg-slate-50 border-t border-purple-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleToggle(p.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                      p.isActive
                        ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                        : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{p.isActive ? 'إيقاف مؤقت' : 'تفعيل العرض'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenModal(p)}
                      className="p-2 rounded-xl text-purple-900 hover:bg-purple-200 transition-colors cursor-pointer"
                      title="تعديل العرض"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      className="p-2 rounded-xl text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                      title="حذف العرض"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT PROMOTION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-purple-100 overflow-hidden max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-purple-900 text-white p-5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-400/20 rounded-2xl text-amber-300">
                  <Tag className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-white">
                    {editingPromo ? 'تعديل العرض الترويجي ✨' : 'إنشاء عرض ترويجي جديد ✨'}
                  </h3>
                  <p className="text-xs text-purple-200 font-bold">تحديد نوع الخصم، الأقسام المستهدفة، وفترة الصلاحية</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto font-black text-xs text-purple-950">
              
              {/* Title */}
              <div>
                <label className="block mb-1.5 text-gray-700">عنوان العرض الترويجي *</label>
                <input
                  type="text"
                  required
                  value={titleAr}
                  onChange={(e) => setTitleAr(e.target.value)}
                  placeholder="مثال: تخفيض الصيف - خصم 15% على الشوكولاتة الفاخرة..."
                  className="w-full px-3.5 py-2.5 bg-[#FFFBF7] border border-amber-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 font-bold text-purple-950"
                />
              </div>

              {/* Promo Type Card Selection */}
              <div>
                <label className="block mb-2 text-gray-700">نوع الخصم والعرض الترويجي *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setType('PERCENTAGE')}
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      type === 'PERCENTAGE'
                        ? 'bg-purple-950 text-amber-300 border-amber-400 shadow-md scale-102'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-purple-50'
                    }`}
                  >
                    <Percent className="w-5 h-5 text-amber-400" />
                    <span className="text-[11px] font-black">نسبة مئوية %</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setType('FIXED')}
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      type === 'FIXED'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-400 shadow-md scale-102'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-emerald-50'
                    }`}
                  >
                    <DollarSign className="w-5 h-5 text-emerald-400" />
                    <span className="text-[11px] font-black">خصم مبلغ ثابت</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setType('BUY_X_GET_Y')}
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      type === 'BUY_X_GET_Y'
                        ? 'bg-rose-950 text-rose-200 border-rose-400 shadow-md scale-102'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-rose-50'
                    }`}
                  >
                    <Gift className="w-5 h-5 text-rose-400" />
                    <span className="text-[11px] font-black">اشترِ X احصل على Y</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setType('BUNDLE')}
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      type === 'BUNDLE'
                        ? 'bg-indigo-950 text-indigo-200 border-indigo-400 shadow-md scale-102'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-indigo-50'
                    }`}
                  >
                    <Package className="w-5 h-5 text-indigo-400" />
                    <span className="text-[11px] font-black">عرض كومبو / حزمة</span>
                  </button>
                </div>
              </div>

              {/* Discount Value Inputs depending on type */}
              {type === 'PERCENTAGE' && (
                <div>
                  <label className="block mb-1 text-gray-700">نسبة الخصم المئوية (%) *</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="مثال: 15"
                    className="w-full px-3.5 py-2.5 bg-[#FFFBF7] border border-amber-200 rounded-xl outline-none font-mono font-black text-sm text-purple-950 focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              )}

              {type === 'FIXED' && (
                <div>
                  <label className="block mb-1 text-gray-700">قيمة الخصم الثابت بالدينار (د.ج) *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="مثال: 500"
                    className="w-full px-3.5 py-2.5 bg-[#FFFBF7] border border-amber-200 rounded-xl outline-none font-mono font-black text-sm text-purple-950 focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              )}

              {type === 'BUY_X_GET_Y' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-rose-50 rounded-2xl border border-rose-200">
                  <div>
                    <label className="block mb-1 text-rose-950 font-black">كمية الشراء المطلوب (اشترِ) *</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={buyQuantity}
                      onChange={(e) => setBuyQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="مثال: 2"
                      className="w-full px-3.5 py-2 bg-white border border-rose-300 rounded-xl outline-none font-mono font-black text-sm text-rose-950"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-rose-950 font-black">كمية الهدية المجانية (احصل على) *</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={getQuantity}
                      onChange={(e) => setGetQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="مثال: 1"
                      className="w-full px-3.5 py-2 bg-white border border-rose-300 rounded-xl outline-none font-mono font-black text-sm text-rose-950"
                    />
                  </div>
                </div>
              )}

              {/* Minimum Purchase Amount Threshold */}
              <div>
                <label className="block mb-1 text-gray-700">الحد الأدنى لقيمة الشراء بالفاتورة (اختياري - د.ج)</label>
                <input
                  type="number"
                  value={minPurchaseAmount}
                  onChange={(e) => setMinPurchaseAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="مثال: 5000 (يطبق فقط إذا بلغت الفاتورة 5000 د.ج)"
                  className="w-full px-3.5 py-2.5 bg-[#FFFBF7] border border-amber-200 rounded-xl outline-none font-mono font-bold text-purple-950 focus:ring-2 focus:ring-amber-400"
                />
              </div>

              {/* Date Pickers & Presets */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-gray-700 font-black">فترة صلاحية العرض *</label>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-gray-400">اختصارات سرعية:</span>
                    <button type="button" onClick={() => applyPresetDates(7)} className="px-2 py-0.5 bg-purple-100 text-purple-900 rounded-md hover:bg-purple-200 cursor-pointer">أسبوع</button>
                    <button type="button" onClick={() => applyPresetDates(30)} className="px-2 py-0.5 bg-purple-100 text-purple-900 rounded-md hover:bg-purple-200 cursor-pointer">شهر</button>
                    <button type="button" onClick={() => applyPresetDates(90)} className="px-2 py-0.5 bg-purple-100 text-purple-900 rounded-md hover:bg-purple-200 cursor-pointer">3 أشهر</button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="block text-[10px] text-gray-500 mb-1">تاريخ البدء</span>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-[#FFFBF7] border border-amber-200 rounded-xl outline-none font-mono font-bold text-purple-950"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-500 mb-1">تاريخ الانتهاء</span>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-[#FFFBF7] border border-amber-200 rounded-xl outline-none font-mono font-bold text-purple-950"
                    />
                  </div>
                </div>
              </div>

              {/* Target Categories */}
              <div>
                <label className="block mb-1.5 text-gray-700">الأقسام المشمولة بالعرض (اختياري - حدد لتضييق النطاق)</label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-[#FFFBF7] border border-amber-200 rounded-xl">
                  {categories.map(c => {
                    const isSelected = selectedCategoryIds.includes(c.id);
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => toggleCategorySelect(c.id)}
                        className={`px-3 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-purple-950 text-amber-300 shadow-xs'
                            : 'bg-white text-gray-700 border border-gray-200 hover:bg-purple-50'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                        <span>{c.nameAr}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Toggle Switch */}
              <div className="p-3 bg-[#FFFBF7] border border-amber-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="font-black text-purple-950 block">حالة العرض فور الحفظ</span>
                  <span className="text-[10px] text-gray-500 font-bold">تفعيل العرض فوراً وتطبيق الخصومات بشاشة البيع الـ POS</span>
                </div>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-purple-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-black hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white font-black shadow-md hover:brightness-110 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <span>{submitting ? 'جاري الحفظ...' : (editingPromo ? 'حفظ التعديلات ✨' : 'إنشاء العرض الآن ✨')}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
