import React, { useEffect, useState } from 'react';
import {
  Users, Plus, Phone, Mail, MapPin, CreditCard, DollarSign, Search, Filter,
  Edit3, Trash2, CheckCircle2, AlertTriangle, RefreshCw, X, FileText, Check, TrendingDown
} from 'lucide-react';
import { api } from '../../api/client';
import { Supplier } from '../../types';
import { platformConfirm, platformAlert } from '../../context/DialogContext';

export const SuppliersView: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'HAS_DEBT' | 'PAID'>('ALL');

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Add/Edit Form fields
  const [nameAr, setNameAr] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressAr, setAddressAr] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Pay Debt Modal State
  const [isPayDebtModalOpen, setIsPayDebtModalOpen] = useState(false);
  const [selectedSupplierForPay, setSelectedSupplierForPay] = useState<Supplier | null>(null);
  const [payAmount, setPayAmount] = useState<number | ''>('');
  const [payNotes, setPayNotes] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const res = await api.getSuppliers();
      setSuppliers(res || []);
    } catch (e) {
      console.error('Failed to load suppliers:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (sup?: Supplier) => {
    if (sup) {
      setEditingSupplier(sup);
      setNameAr(sup.nameAr);
      setCompanyName(sup.companyName || '');
      setPhone(sup.phone);
      setAddressAr(sup.addressAr || '');
      setEmail(sup.email || '');
      setNotes(sup.notes || '');
    } else {
      setEditingSupplier(null);
      setNameAr('');
      setCompanyName('');
      setPhone('');
      setAddressAr('');
      setEmail('');
      setNotes('');
    }
    setIsModalOpen(true);
  };

  const handleSubmitSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim() || !phone.trim()) {
      alert('يرجى كتابة اسم المورد ورقم الهاتف على الأقل');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        nameAr: nameAr.trim(),
        companyName: companyName.trim() || undefined,
        phone: phone.trim(),
        addressAr: addressAr.trim() || undefined,
        email: email.trim() || undefined,
        notes: notes.trim() || undefined
      };

      if (editingSupplier) {
        await api.updateSupplier(editingSupplier.id, payload);
      } else {
        await api.createSupplier(payload);
      }

      setIsModalOpen(false);
      loadSuppliers();
    } catch (err: any) {
      alert(err.message || 'فشلت عملية حفظ المورد');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSupplier = async (sup: Supplier) => {
    const isConfirmed = await platformConfirm({
      title: 'حذف المورد من المنصة 🗑️',
      message: `هل أنت متأكد من حذف المورد "${sup.nameAr}" من النظام؟`,
      confirmText: 'تأكيد الحذف النهائي',
      cancelText: 'تراجع وإلغاء',
      variant: 'danger'
    });

    if (isConfirmed) {
      try {
        await api.deleteSupplier(sup.id);
        loadSuppliers();
      } catch (err: any) {
        platformAlert({ title: 'خطأ', message: 'فشل حذف المورد', variant: 'error' });
      }
    }
  };

  // Open Pay Debt Modal
  const handleOpenPayDebtModal = (sup: Supplier) => {
    setSelectedSupplierForPay(sup);
    setPayAmount(sup.totalDebt > 0 ? sup.totalDebt : '');
    setPayNotes('');
    setIsPayDebtModalOpen(true);
  };

  // Handle Pay Debt Submission
  const handleConfirmPayDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierForPay) return;
    const amountVal = Number(payAmount);
    if (!amountVal || amountVal <= 0) {
      alert('يرجى كتابة مبلغ تسديد صالح اكبر من الصفر');
      return;
    }

    try {
      setPaying(true);
      await api.paySupplierDebt(selectedSupplierForPay.id, amountVal);
      alert(`تم تسديد مبلغ ${amountVal.toLocaleString()} د.ج للمورد ${selectedSupplierForPay.nameAr} بنجاح ✨`);
      setIsPayDebtModalOpen(false);
      loadSuppliers();
    } catch (err: any) {
      alert(err.message || 'فشلت عملية تسديد الدين');
    } finally {
      setPaying(false);
    }
  };

  // KPIs Calculations
  const totalPurchasesSum = suppliers.reduce((acc, s) => acc + (s.totalPurchases || 0), 0);
  const totalPaidSum = suppliers.reduce((acc, s) => acc + (s.totalPaid || 0), 0);
  const totalDebtSum = suppliers.reduce((acc, s) => acc + (s.totalDebt || 0), 0);
  const suppliersWithDebtCount = suppliers.filter(s => (s.totalDebt || 0) > 0).length;

  // Filtered List
  const filteredSuppliers = suppliers.filter(sup => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      sup.nameAr.toLowerCase().includes(query) ||
      (sup.companyName && sup.companyName.toLowerCase().includes(query)) ||
      sup.phone.includes(query) ||
      (sup.addressAr && sup.addressAr.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    if (filterTab === 'HAS_DEBT') return (sup.totalDebt || 0) > 0;
    if (filterTab === 'PAID') return (sup.totalDebt || 0) === 0;
    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200 dir-rtl">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-purple-950 text-white p-6 rounded-3xl border border-amber-400/30 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-amber-400 flex items-center gap-3">
            <Users className="w-7 h-7 text-amber-400" />
            دليل الموردين وشركات التوزيع
          </h1>
          <p className="text-xs text-amber-100/80 font-bold mt-1">
            إدارة الموردين وشركات الشوكولاتة والحلويات، متابعة فواتير البضاعة، وتسديد الديون والمستحقات
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white font-black text-xs shadow-lg hover:brightness-110 flex items-center gap-2 cursor-pointer transition-all active:scale-98"
        >
          <Plus className="w-5 h-5 text-white" />
          <span>إضافة مورد جديد ✨</span>
        </button>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">إجمالي الموردين والشركات</span>
            <span className="text-2xl font-black text-purple-950">{suppliers.length}</span>
          </div>
          <div className="p-3 bg-purple-100 rounded-xl text-purple-700">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">إجمالي المشتريات البضاعة</span>
            <span className="text-xl font-black text-indigo-950">{totalPurchasesSum.toLocaleString()} د.ج</span>
          </div>
          <div className="p-3 bg-indigo-100 rounded-xl text-indigo-700">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">إجمالي المبالغ المسددة</span>
            <span className="text-xl font-black text-emerald-600">{totalPaidSum.toLocaleString()} د.ج</span>
          </div>
          <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-black text-rose-800 block">ديون ومستحقات الموردين</span>
            <span className="text-xl font-black text-rose-600">{totalDebtSum.toLocaleString()} د.ج</span>
            <span className="text-[10px] text-rose-500 font-bold block">({suppliersWithDebtCount} موردين عليهم مستحقات)</span>
          </div>
          <div className="p-3 bg-rose-100 rounded-xl text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث باسم المورد، الشركة، الهاتف..."
            className="w-full pr-3.5 pl-9 py-2 bg-[#FFFBF7] border border-amber-200 rounded-xl text-xs font-bold text-purple-950 outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-purple-50 p-1 rounded-xl border border-purple-100 w-full md:w-auto">
          <button
            onClick={() => setFilterTab('ALL')}
            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              filterTab === 'ALL' ? 'bg-purple-950 text-amber-300 shadow-xs' : 'text-purple-900 hover:bg-purple-100'
            }`}
          >
            جميع الموردين ({suppliers.length})
          </button>
          <button
            onClick={() => setFilterTab('HAS_DEBT')}
            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              filterTab === 'HAS_DEBT' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-800 hover:bg-rose-100'
            }`}
          >
            عليهم ديون مستحقة ⚠️ ({suppliersWithDebtCount})
          </button>
          <button
            onClick={() => setFilterTab('PAID')}
            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              filterTab === 'PAID' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            مسددون بالكامل 🟢 ({suppliers.length - suppliersWithDebtCount})
          </button>
        </div>
      </div>

      {/* Supplier Grid List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 font-bold flex items-center justify-center gap-3 bg-white rounded-3xl border border-purple-100">
          <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
          <span>جاري تحميل قائمة الموردين وشركات التوزيع...</span>
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-purple-200 space-y-3">
          <Users className="w-12 h-12 text-purple-300 mx-auto" />
          <h3 className="font-black text-purple-950 text-base">لا يوجد موردون مطاطبقون للبحث!</h3>
          <p className="text-xs text-slate-400 font-bold max-w-sm mx-auto">
            قم بإضافة بيانات الموردين وشركات الشوكولاتة لمتابعة الفواتير والدفوعات.
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-purple-950 font-black text-xs rounded-xl transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            إضافة مورد جديد
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSuppliers.map((sup) => {
            const debt = sup.totalDebt || 0;
            const purchases = sup.totalPurchases || 0;
            const paid = sup.totalPaid || 0;
            const paidPercent = purchases > 0 ? Math.min(100, Math.round((paid / purchases) * 100)) : 100;

            return (
              <div
                key={sup.id}
                className="bg-white rounded-3xl border border-purple-100 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Top Info */}
                <div className="p-5 space-y-4 bg-gradient-to-b from-[#FFFBF7] to-white border-b border-purple-50">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-950 to-indigo-900 text-amber-400 font-black flex items-center justify-center text-lg shadow-sm">
                        {sup.nameAr.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-black text-purple-950 text-sm group-hover:text-amber-600 transition-colors">
                          {sup.nameAr}
                        </h3>
                        {sup.companyName && (
                          <span className="text-[11px] font-mono font-bold text-amber-700 block">
                            شركة: {sup.companyName}
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                        debt > 0
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      {debt > 0 ? 'مستحق الدفع ⚠️' : 'خالي الديون 🟢'}
                    </span>
                  </div>

                  {/* Contact Info Chips */}
                  <div className="space-y-1.5 text-xs text-slate-600 font-bold">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <a href={`tel:${sup.phone}`} className="font-mono hover:text-amber-600 transition-colors">
                        {sup.phone}
                      </a>
                    </div>

                    {sup.addressAr && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        <span className="truncate">{sup.addressAr}</span>
                      </div>
                    )}

                    {sup.email && (
                      <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                        <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">{sup.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial Overview & Progress Bar */}
                <div className="p-5 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-purple-50/70 rounded-2xl border border-purple-100">
                      <span className="text-[10px] text-slate-400 font-bold block">إجمالي المشتريات</span>
                      <span className="font-black text-purple-950 text-sm">{purchases.toLocaleString()} د.ج</span>
                    </div>

                    <div className={`p-2.5 rounded-2xl border ${debt > 0 ? 'bg-rose-50/80 border-rose-200' : 'bg-emerald-50/80 border-emerald-200'}`}>
                      <span className="text-[10px] text-slate-500 font-bold block">الدين المتبقي</span>
                      <span className={`font-black text-sm ${debt > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {debt.toLocaleString()} د.ج
                      </span>
                    </div>
                  </div>

                  {/* Payment Progress bar */}
                  <div>
                    <div className="flex justify-between text-[10px] font-black text-slate-400 mb-1">
                      <span>نسبة تسديد الفواتير:</span>
                      <span className="text-purple-950 font-mono font-bold">{paidPercent}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                        style={{ width: `${paidPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-4 bg-slate-50 border-t border-purple-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenPayDebtModal(sup)}
                    disabled={debt <= 0}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                      debt > 0
                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs active:scale-98'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <DollarSign className="w-4 h-4 text-white" />
                    <span>تسديد الدين</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenModal(sup)}
                      className="p-2 rounded-xl text-purple-900 hover:bg-purple-200 transition-colors cursor-pointer"
                      title="تعديل البيانات"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSupplier(sup)}
                      className="p-2 rounded-xl text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                      title="حذف المورد"
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

      {/* CREATE / EDIT SUPPLIER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-purple-100 overflow-hidden space-y-4">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-purple-900 text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-400/20 rounded-2xl text-amber-300">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-white">
                    {editingSupplier ? 'تعديل بيانات المورد ✨' : 'إضافة مورد / شركة جديدة ✨'}
                  </h3>
                  <p className="text-xs text-purple-200 font-bold">تسجيل الموردين ومعلومات التواصل والشركة الممثلة</p>
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
            <form onSubmit={handleSubmitSupplier} className="p-6 space-y-4 font-black text-xs text-purple-950">
              
              <div>
                <label className="block mb-1 text-gray-700">اسم المورد / المندوب *</label>
                <input
                  type="text"
                  required
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder="مثال: أحمد الزروقي (مندوب الشوكولاتة)"
                  className="w-full px-3.5 py-2.5 bg-[#FFFBF7] border border-amber-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 font-bold"
                />
              </div>

              <div>
                <label className="block mb-1 text-gray-700">اسم شركة التوزيع / العلامة التجارية (اختياري)</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="مثال: شركة سوفال Sofal / نستله Nestle / فيريرو"
                  className="w-full px-3.5 py-2.5 bg-[#FFFBF7] border border-amber-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-gray-700">رقم الهاتف *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0550 00 00 00"
                    className="w-full px-3.5 py-2.5 bg-[#FFFBF7] border border-amber-200 rounded-xl outline-none font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-gray-700">البريد الإلكتروني (اختياري)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="supplier@company.dz"
                    className="w-full px-3.5 py-2.5 bg-[#FFFBF7] border border-amber-200 rounded-xl outline-none font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 text-gray-700">عنوان المقر / الولاية (اختياري)</label>
                <input
                  type="text"
                  value={addressAr}
                  onChange={(e) => setAddressAr(e.target.value)}
                  placeholder="الجزائر العاصمة - المنطقة الصناعية"
                  className="w-full px-3.5 py-2.5 bg-[#FFFBF7] border border-amber-200 rounded-xl outline-none font-bold"
                />
              </div>

              <div>
                <label className="block mb-1 text-gray-700">ملاحظات وشروط الدفع (اختياري)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: دفع آجال 30 يوماً مع تخفيض البونص..."
                  className="w-full px-3.5 py-2 bg-[#FFFBF7] border border-amber-200 rounded-xl outline-none font-bold resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-purple-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-gray-300 rounded-xl font-black text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white font-black rounded-xl shadow-md hover:brightness-110 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'جاري الحفظ...' : (editingSupplier ? 'حفظ التعديلات ✨' : 'حفظ المورد ✨')}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* PAY SUPPLIER DEBT MODAL */}
      {isPayDebtModalOpen && selectedSupplierForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-purple-100 overflow-hidden space-y-4">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-purple-950 text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-400/20 rounded-2xl text-rose-300">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-white">تسديد ديون ومستحقات المورد</h3>
                  <p className="text-xs text-rose-200 font-bold">{selectedSupplierForPay.nameAr}</p>
                </div>
              </div>
              <button
                onClick={() => setIsPayDebtModalOpen(false)}
                className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pay Debt Form */}
            <form onSubmit={handleConfirmPayDebt} className="p-6 space-y-4 font-black text-xs text-purple-950">
              
              {/* Current Debt Alert Banner */}
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 flex items-center justify-between">
                <span className="text-rose-900 font-bold">الدين الحسابي المتبقي:</span>
                <span className="font-mono text-sm bg-rose-950 text-rose-200 px-3 py-1 rounded-xl font-black">
                  {selectedSupplierForPay.totalDebt.toLocaleString()} د.ج
                </span>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block mb-1 text-gray-700">المبلغ المراد تسديده الآن (د.ج) *</label>
                <input
                  type="number"
                  min={1}
                  max={selectedSupplierForPay.totalDebt}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="أدخل المبلغ المسدد..."
                  className="w-full px-3.5 py-3 bg-[#FFFBF7] border border-amber-200 rounded-xl outline-none font-mono font-black text-base text-purple-950 focus:ring-2 focus:ring-rose-400"
                />
              </div>

              {/* Quick Amount Presets */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPayAmount(selectedSupplierForPay.totalDebt)}
                  className="px-3 py-1.5 bg-rose-100 text-rose-900 rounded-xl text-[11px] font-black hover:bg-rose-200 cursor-pointer"
                >
                  كامل الدين ({selectedSupplierForPay.totalDebt.toLocaleString()} د.ج)
                </button>
                {selectedSupplierForPay.totalDebt > 10000 && (
                  <button
                    type="button"
                    onClick={() => setPayAmount(Math.round(selectedSupplierForPay.totalDebt / 2))}
                    className="px-3 py-1.5 bg-purple-100 text-purple-900 rounded-xl text-[11px] font-black hover:bg-purple-200 cursor-pointer"
                  >
                    النصف ({Math.round(selectedSupplierForPay.totalDebt / 2).toLocaleString()} د.ج)
                  </button>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block mb-1 text-gray-700">ملاحظات حول الدفعة (اختياري)</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="رقم الصك البانكي، وصل استلام نقدي..."
                  className="w-full px-3.5 py-2.5 bg-[#FFFBF7] border border-amber-200 rounded-xl outline-none font-bold"
                />
              </div>

              {/* Guidance Note */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-[11px] text-indigo-900 font-bold">
                💡 تذكير: سيتم خصم هذا المبلغ فوراً من الحساب الجاري للمورد، وتحديث فواتير المشتريات تلقائياً بدءاً من الفاتورة الأقدم.
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-purple-100">
                <button
                  type="button"
                  onClick={() => setIsPayDebtModalOpen(false)}
                  className="px-4 py-2.5 border border-gray-300 rounded-xl font-black text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={paying}
                  className="px-6 py-2.5 bg-gradient-to-r from-rose-600 to-purple-950 text-white font-black rounded-xl shadow-md hover:brightness-110 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  <span>{paying ? 'جاري التسديد...' : 'تأكيد تسديد المبلغ ✨'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
