import React, { useEffect, useState } from 'react';
import {
  Users, Plus, Phone, Award, CreditCard, DollarSign, Search, Filter,
  Edit3, Trash2, CheckCircle2, AlertTriangle, RefreshCw, X, Check, Mail, MapPin,
  History, Wrench, FileText, AlertCircle, Calendar, Printer, ShieldCheck
} from 'lucide-react';
import { api } from '../../api/client';
import { Customer, CustomerPaymentRecord, SystemSettings } from '../../types';
import { exportToExcel, amountInArabicWords } from '../../utils/excelExport';
import { BrandLogo } from '../common/BrandLogo';

export const CustomersView: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSettings().then(setSettings).catch(console.error);
    const handleSettingsUpdated = (e: any) => {
      if (e.detail) setSettings(e.detail);
      else api.getSettings().then(setSettings).catch(console.error);
    };
    window.addEventListener('zerrouki_settings_updated', handleSettingsUpdated);
    return () => window.removeEventListener('zerrouki_settings_updated', handleSettingsUpdated);
  }, []);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'HAS_DEBT' | 'PAID'>('ALL');

  // Customer Add/Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Statement of Account A4 Modal State
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [selectedCustomerForStatement, setSelectedCustomerForStatement] = useState<Customer | null>(null);
  const [statementLedger, setStatementLedger] = useState<any[]>([]);
  const [loadingStatement, setLoadingStatement] = useState(false);

  // Payment Receipt Print State
  const [printingPaymentRecord, setPrintingPaymentRecord] = useState<CustomerPaymentRecord | null>(null);

  // Add/Edit Form Fields
  const [nameAr, setNameAr] = useState('');
  const [phone, setPhone] = useState('');
  const [addressAr, setAddressAr] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Pay General Debt Modal State
  const [isPayDebtModalOpen, setIsPayDebtModalOpen] = useState(false);
  const [selectedCustomerForPay, setSelectedCustomerForPay] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState<number | ''>('');
  const [payNotes, setPayNotes] = useState('');
  const [paying, setPaying] = useState(false);

  // Adjust Balance / Correction Modal State (Fixing Typo / Mistake)
  const [isAdjustBalanceModalOpen, setIsAdjustBalanceModalOpen] = useState(false);
  const [selectedCustomerForAdjust, setSelectedCustomerForAdjust] = useState<Customer | null>(null);
  const [adjustedTotalPaid, setAdjustedTotalPaid] = useState<number | ''>('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  // Payment History Ledger Modal State
  const [isPaymentHistoryModalOpen, setIsPaymentHistoryModalOpen] = useState(false);
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<Customer | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<CustomerPaymentRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Edit Payment Entry Inline State
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editingPaymentAmount, setEditingPaymentAmount] = useState<number | ''>('');
  const [editingPaymentNotes, setEditingPaymentNotes] = useState('');
  const [savingPaymentEdit, setSavingPaymentEdit] = useState(false);

  const handleExportCustomersExcel = () => {
    const headers = ['اسم العميل/الطبيب', 'رقم الهاتف', 'العنوان', 'إجمالي المشتريات', 'المبلغ المدفوع المسجل', 'الدين العام المتبقي', 'نقاط الولاء'];
    const rows = customers.map(c => [
      c.nameAr,
      c.phone,
      c.addressAr || '',
      c.totalPurchases || 0,
      c.totalPaid || 0,
      c.totalDebt || 0,
      c.loyaltyPoints || 0
    ]);
    exportToExcel('سجل_ديون_وعملاء_زروقي', headers, rows);
  };

  const handleOpenStatementModal = async (cust: Customer) => {
    setSelectedCustomerForStatement(cust);
    setIsStatementModalOpen(true);
    try {
      setLoadingStatement(true);
      const [sales, payments] = await Promise.all([
        api.getSales(),
        api.getCustomerPayments(cust.id)
      ]);
      const custSales = sales.filter(s => s.customerId === cust.id && s.status !== 'CANCELLED');
      
      const transactions: any[] = [];
      custSales.forEach(s => {
        transactions.push({
          id: s.id,
          date: s.createdAt,
          type: 'INVOICE',
          refNumber: s.invoiceNumber,
          label: `فاتورة مبيعات (${s.items.length} مواد)`,
          debit: s.grandTotal,
          credit: 0
        });
      });

      payments.forEach(p => {
        transactions.push({
          id: p.id,
          date: p.createdAt,
          type: 'PAYMENT',
          refNumber: p.id,
          label: `تسديد دفعة: ${p.notes || 'تسديد دين'}`,
          debit: 0,
          credit: p.amount
        });
      });

      transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      let runningBalance = 0;
      const ledgerWithBalance = transactions.map(t => {
        runningBalance = runningBalance + t.debit - t.credit;
        return { ...t, runningBalance };
      });

      setStatementLedger(ledgerWithBalance);
    } catch (e) {
      console.error('Failed to load statement ledger:', e);
    } finally {
      setLoadingStatement(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.getCustomers();
      setCustomers(res || []);
    } catch (e) {
      console.error('Failed to load customers:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (cust?: Customer) => {
    if (cust) {
      setEditingCustomer(cust);
      setNameAr(cust.nameAr);
      setPhone(cust.phone);
      setAddressAr(cust.addressAr || '');
      setEmail(cust.email || '');
      setNotes(cust.notes || '');
    } else {
      setEditingCustomer(null);
      setNameAr('');
      setPhone('');
      setAddressAr('');
      setEmail('');
      setNotes('');
    }
    setIsModalOpen(true);
  };

  const handleSubmitCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim() || !phone.trim()) {
      alert('يرجى كتابة اسم العميل ورقم الهاتف');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        nameAr: nameAr.trim(),
        phone: phone.trim(),
        addressAr: addressAr.trim() || undefined,
        email: email.trim() || undefined,
        notes: notes.trim() || undefined
      };

      if (editingCustomer) {
        await api.createCustomer(payload);
      } else {
        await api.createCustomer(payload);
      }

      setIsModalOpen(false);
      loadCustomers();
    } catch (err: any) {
      alert(err.message || 'فشلت عملية حفظ العميل');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Pay Debt Modal
  const handleOpenPayDebtModal = (cust: Customer) => {
    setSelectedCustomerForPay(cust);
    setPayAmount(cust.totalDebt > 0 ? cust.totalDebt : '');
    setPayNotes('');
    setIsPayDebtModalOpen(true);
  };

  const handleConfirmPayDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForPay) return;
    const amountVal = Number(payAmount);
    if (!amountVal || amountVal <= 0) {
      alert('يرجى كتابة مبلغ تسديد صالح أكبر من الصفر');
      return;
    }

    try {
      setPaying(true);
      await api.payCustomerDebt(selectedCustomerForPay.id, amountVal, payNotes || undefined);
      alert(`تم تسديد مبلغ ${amountVal.toLocaleString()} د.ج من الدين العام للعميل ${selectedCustomerForPay.nameAr} بنجاح ✨`);
      setIsPayDebtModalOpen(false);
      loadCustomers();
    } catch (err: any) {
      alert(err.message || 'فشلت عملية تسديد الدين');
    } finally {
      setPaying(false);
    }
  };

  // Open Adjust Balance Modal (Fixing Typo / Incorrect Amount)
  const handleOpenAdjustBalanceModal = (cust: Customer) => {
    setSelectedCustomerForAdjust(cust);
    setAdjustedTotalPaid(cust.totalPaid || 0);
    setAdjustReason('تصحيح خطأ مطبعي في المبلغ المدفوع');
    setIsAdjustBalanceModalOpen(true);
  };

  const handleConfirmAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForAdjust) return;
    const newPaidVal = Number(adjustedTotalPaid);
    if (isNaN(newPaidVal) || newPaidVal < 0) {
      alert('يرجى كتابة مبلغ مدفوع صالح أكبر من أو يساوي الصفر');
      return;
    }

    try {
      setAdjusting(true);
      await api.adjustCustomerBalance(selectedCustomerForAdjust.id, {
        newTotalPaid: newPaidVal,
        reason: adjustReason || 'تصحيح خطأ مطبعي في المبلغ المدفوع'
      });
      alert(`تم تصحيح وتعديل إجمالي المبلغ المدفوع للعميل ${selectedCustomerForAdjust.nameAr} إلى ${newPaidVal.toLocaleString()} د.ج بنجاح ✨`);
      setIsAdjustBalanceModalOpen(false);
      loadCustomers();
    } catch (err: any) {
      alert(err.message || 'فشلت عملية تصحيح رصيد المدفوعات');
    } finally {
      setAdjusting(false);
    }
  };

  // Open Payment History Ledger Modal
  const handleOpenPaymentHistoryModal = (cust: Customer) => {
    setSelectedCustomerForHistory(cust);
    setIsPaymentHistoryModalOpen(true);
    setEditingPaymentId(null);
    loadPaymentHistory(cust.id);
  };

  const loadPaymentHistory = async (customerId: string) => {
    try {
      setLoadingHistory(true);
      const res = await api.getCustomerPayments(customerId);
      setPaymentHistory(res || []);
    } catch (e) {
      console.error('Failed to load payment history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleStartEditPayment = (p: CustomerPaymentRecord) => {
    setEditingPaymentId(p.id);
    setEditingPaymentAmount(p.amount);
    setEditingPaymentNotes(p.notes || '');
  };

  const handleSaveEditPayment = async (paymentId: string) => {
    const newAmount = Number(editingPaymentAmount);
    if (isNaN(newAmount) || newAmount < 0) {
      alert('يرجى أدخال مبلغ دفعة صالح');
      return;
    }

    try {
      setSavingPaymentEdit(true);
      await api.updateCustomerPayment(paymentId, {
        amount: newAmount,
        notes: editingPaymentNotes
      });
      setEditingPaymentId(null);
      if (selectedCustomerForHistory) {
        loadPaymentHistory(selectedCustomerForHistory.id);
      }
      loadCustomers();
      alert('تم تعديل الدفعة وتحديث رصيد العميل والفواتير أوتوماتيكياً بنجاح ✨');
    } catch (err: any) {
      alert(err.message || 'فشلت عملية تعديل الدفعة');
    } finally {
      setSavingPaymentEdit(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('هل أنت تأكد من رغبتك في حذف هذه الدفعة المسجلة بالخطأ؟ سيتم إلغاء تأثيرها وإعادة حساب الدين أوتوماتيكياً.')) return;
    try {
      await api.deleteCustomerPayment(paymentId);
      if (selectedCustomerForHistory) {
        loadPaymentHistory(selectedCustomerForHistory.id);
      }
      loadCustomers();
      alert('تم حذف الدفعة وإعادة حساب الرصيد بنجاح ✨');
    } catch (err: any) {
      alert(err.message || 'فشلت عملية حذف الدفعة');
    }
  };

  // KPIs
  const totalPurchasesSum = customers.reduce((acc, c) => acc + (c.totalPurchases || 0), 0);
  const totalPaidSum = customers.reduce((acc, c) => acc + (c.totalPaid || 0), 0);
  const totalDebtSum = customers.reduce((acc, c) => acc + (c.totalDebt || 0), 0);
  const customersWithDebtCount = customers.filter(c => (c.totalDebt || 0) > 0).length;

  // Filtered List
  const filteredCustomers = customers.filter(cust => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      cust.nameAr.toLowerCase().includes(query) ||
      cust.phone.includes(query) ||
      (cust.addressAr && cust.addressAr.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    if (filterTab === 'HAS_DEBT') return (cust.totalDebt || 0) > 0;
    if (filterTab === 'PAID') return (cust.totalDebt || 0) === 0;
    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200 dir-rtl">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-purple-950 text-white p-6 rounded-3xl border border-amber-400/30 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-amber-400 flex items-center gap-3">
            <Users className="w-7 h-7 text-amber-400" />
            سجل العملاء وتصحيح مدفوعات الديون (Customer Ledger)
          </h1>
          <p className="text-xs text-amber-100/80 font-bold mt-1">
            تتبع ديون الزبائن والأطباء، تسديد الدفعات، وتصحيح الأخطاء المطبعية في المبالغ المدفوعة بكل سهولة
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCustomersExcel}
            className="px-4 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-98 border border-emerald-500"
          >
            <FileText className="w-4 h-4 text-emerald-200" />
            <span>تصدير كشف الديون (Excel) 📊</span>
          </button>

          <button
            onClick={() => handleOpenModal()}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white font-black text-xs shadow-lg hover:brightness-110 flex items-center gap-2 cursor-pointer transition-all active:scale-98"
          >
            <Plus className="w-5 h-5 text-white" />
            <span>إضافة عميل جديد ✨</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">إجمالي العملاء</span>
            <span className="text-2xl font-black text-purple-950">{customers.length}</span>
          </div>
          <div className="p-3 bg-purple-100 rounded-xl text-purple-700">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">إجمالي مشتريات العملاء</span>
            <span className="text-xl font-black text-indigo-950">{totalPurchasesSum.toLocaleString()} د.ج</span>
          </div>
          <div className="p-3 bg-indigo-100 rounded-xl text-indigo-700">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">إجمالي المقبوضات المسددة</span>
            <span className="text-xl font-black text-emerald-600">{totalPaidSum.toLocaleString()} د.ج</span>
          </div>
          <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-black text-rose-800 block">إجمالي ديون العملاء المتبقية</span>
            <span className="text-xl font-black text-rose-600">{totalDebtSum.toLocaleString()} د.ج</span>
            <span className="text-[10px] text-rose-500 font-bold block">({customersWithDebtCount} زبائن عليهم ديون)</span>
          </div>
          <div className="p-3 bg-rose-100 rounded-xl text-rose-600">
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
            placeholder="ابحث باسم العميل أو رقم الهاتف..."
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
            جميع العملاء ({customers.length})
          </button>
          <button
            onClick={() => setFilterTab('HAS_DEBT')}
            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              filterTab === 'HAS_DEBT' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-800 hover:bg-rose-100'
            }`}
          >
            عليهم ديون مستحقة ⚠️ ({customersWithDebtCount})
          </button>
          <button
            onClick={() => setFilterTab('PAID')}
            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              filterTab === 'PAID' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            مسددون بالكامل 🟢 ({customers.length - customersWithDebtCount})
          </button>
        </div>
      </div>

      {/* Customer Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 font-bold flex items-center justify-center gap-3 bg-white rounded-3xl border border-purple-100">
          <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
          <span>جاري تحميل سجل العملاء...</span>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-purple-200 space-y-3">
          <Users className="w-12 h-12 text-purple-300 mx-auto" />
          <h3 className="font-black text-purple-950 text-base">لا يوجد عملاء مطابقون للبحث!</h3>
          <p className="text-xs text-slate-400 font-bold max-w-sm mx-auto">
            قم بإضافة بيانات العملاء وتتبع حساباتهم الجارية وتصحيح المبالغ المدفوعة.
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-purple-950 font-black text-xs rounded-xl transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            إضافة عميل جديد
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCustomers.map((cust) => {
            const debt = cust.totalDebt || 0;
            const purchases = cust.totalPurchases || 0;
            const paid = cust.totalPaid || 0;
            const paidPercent = purchases > 0 ? Math.min(100, Math.round((paid / purchases) * 100)) : 100;

            return (
              <div
                key={cust.id}
                className="bg-white rounded-3xl border border-purple-100 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group"
              >
                {/* Top Card Info */}
                <div className="p-5 space-y-4 bg-gradient-to-b from-[#FFFBF7] to-white border-b border-purple-50">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white font-black flex items-center justify-center text-lg shadow-sm">
                        {cust.nameAr.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-black text-purple-950 text-sm group-hover:text-amber-600 transition-colors">
                          {cust.nameAr}
                        </h3>
                        <span className="text-[11px] font-mono font-bold text-slate-500 block">
                          {cust.phone}
                        </span>
                      </div>
                    </div>

                    <span className="bg-amber-100 text-amber-900 font-black text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 border border-amber-200 shrink-0">
                      <Award className="w-3.5 h-3.5 text-amber-600" />
                      {cust.loyaltyPoints || 0} نقطة
                    </span>
                  </div>

                  {cust.addressAr && (
                    <div className="flex items-center gap-2 text-xs text-slate-600 font-bold">
                      <MapPin className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                      <span className="truncate">{cust.addressAr}</span>
                    </div>
                  )}
                </div>

                {/* Financial overview */}
                <div className="p-5 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-emerald-50/80 rounded-2xl border border-emerald-200">
                      <span className="text-[10px] text-emerald-800 font-bold block">المبلغ المدفوع المسجل</span>
                      <span className="font-black text-emerald-700 text-sm">{paid.toLocaleString()} د.ج</span>
                    </div>

                    <div className={`p-2.5 rounded-2xl border ${debt > 0 ? 'bg-rose-50/80 border-rose-200' : 'bg-purple-50/80 border-purple-200'}`}>
                      <span className="text-[10px] text-slate-500 font-bold block">الدين العام المتبقي</span>
                      <span className={`font-black text-sm ${debt > 0 ? 'text-rose-600' : 'text-purple-950'}`}>
                        {debt.toLocaleString()} د.ج
                      </span>
                    </div>
                  </div>

                  {/* Payment Progress Bar */}
                  <div>
                    <div className="flex justify-between text-[10px] font-black text-slate-400 mb-1">
                      <span>نسبة تسديد الديون:</span>
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

                {/* Action Buttons Grid */}
                <div className="p-4 bg-slate-50 border-t border-purple-100 space-y-2">
                  <button
                    onClick={() => handleOpenPayDebtModal(cust)}
                    className="w-full py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98"
                  >
                    <DollarSign className="w-4 h-4 text-white" />
                    <span>تسديد دفعة جديدة ({debt > 0 ? `${debt.toLocaleString()} د.ج` : '0 د.ج'})</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleOpenAdjustBalanceModal(cust)}
                      className="py-1.5 px-2 rounded-xl text-[11px] font-black bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 flex items-center justify-center gap-1 transition-all cursor-pointer"
                      title="تصحيح خطأ مطبعي في المبلغ المدفوع"
                    >
                      <Wrench className="w-3.5 h-3.5 text-amber-700" />
                      <span>تصحيح المدفوع ✏️</span>
                    </button>

                    <button
                      onClick={() => handleOpenPaymentHistoryModal(cust)}
                      className="py-1.5 px-2 rounded-xl text-[11px] font-black bg-indigo-100 hover:bg-indigo-200 text-indigo-900 border border-indigo-200 flex items-center justify-center gap-1 transition-all cursor-pointer"
                      title="عرض وتعديل كشوفات الدفعات السابقة"
                    >
                      <History className="w-3.5 h-3.5 text-indigo-700" />
                      <span>سجل الدفعات 📜</span>
                    </button>
                  </div>

                  <button
                    onClick={() => handleOpenStatementModal(cust)}
                    className="w-full py-1.5 px-2 rounded-xl text-[11px] font-black bg-purple-100 hover:bg-purple-200 text-purple-950 border border-purple-200 flex items-center justify-center gap-1 transition-all cursor-pointer"
                    title="طباعة كشف حساب جاري تفصيلي A4"
                  >
                    <Printer className="w-3.5 h-3.5 text-purple-700" />
                    <span>طباعة كشف حساب تفصيلي (Statement A4) 🖨️</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT CUSTOMER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-purple-100 overflow-hidden space-y-4">
            <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-purple-900 text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-400/20 rounded-2xl text-amber-300">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-white">إضافة عميل جديد ✨</h3>
                  <p className="text-xs text-purple-200 font-bold">إنشاء ملف حساب جاري جديد للزبون</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCustomer} className="p-6 space-y-4 font-black text-xs text-purple-950">
              <div>
                <label className="block mb-1 text-gray-700">اسم العميل *</label>
                <input
                  type="text"
                  required
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder="مثال: د. أحمد / قاعة أفراح..."
                  className="w-full px-3.5 py-2.5 bg-[#FFFBF7] border border-amber-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 font-bold"
                />
              </div>

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
                <label className="block mb-1 text-gray-700">العنوان / المنطقة (اختياري)</label>
                <input
                  type="text"
                  value={addressAr}
                  onChange={(e) => setAddressAr(e.target.value)}
                  placeholder="الجزائر العاصمة..."
                  className="w-full px-3.5 py-2.5 bg-[#FFFBF7] border border-amber-200 rounded-xl outline-none font-bold"
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
                  {submitting ? 'جاري الحفظ...' : 'حفظ العميل ✨'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAY GENERAL DEBT MODAL */}
      {isPayDebtModalOpen && selectedCustomerForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-purple-100 overflow-hidden space-y-4">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-rose-950 via-purple-950 to-indigo-950 text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-400/20 rounded-2xl text-rose-300">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-white">تسجيل تسديد دفعة من الدين العام</h3>
                  <p className="text-xs text-rose-200 font-bold">{selectedCustomerForPay.nameAr}</p>
                </div>
              </div>
              <button
                onClick={() => setIsPayDebtModalOpen(false)}
                className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleConfirmPayDebt} className="p-6 space-y-4 font-black text-xs text-purple-950">
              <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200 flex items-center justify-between">
                <div>
                  <span className="text-rose-900 font-bold block">إجمالي الدين العام المسجل بالحساب:</span>
                  <span className="text-[10px] text-rose-600 font-bold">يمكن تسديد أي مبلغ مجزأ من الحساب الجاري</span>
                </div>
                <span className="font-mono text-sm bg-rose-950 text-rose-200 px-3 py-1.5 rounded-xl font-black shadow-xs">
                  {selectedCustomerForPay.totalDebt.toLocaleString()} د.ج
                </span>
              </div>

              <div>
                <label className="block mb-1 text-gray-700">المبلغ المراد استلامه وتسديده الآن (د.ج) *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="أدخل المبلغ المسدد (مثلاً 4500 د.ج)..."
                  className="w-full px-3.5 py-3 bg-[#FFFBF7] border border-amber-200 rounded-xl outline-none font-mono font-black text-base text-purple-950 focus:ring-2 focus:ring-rose-400"
                />
              </div>

              <div>
                <label className="block mb-1 text-gray-700">ملاحظات / طريقة التسديد (اختياري)</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="تسديد نقداً، صك بنكي..."
                  className="w-full px-3.5 py-2.5 bg-[#FFFBF7] border border-amber-200 rounded-xl outline-none text-xs font-bold"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPayAmount(selectedCustomerForPay.totalDebt)}
                  className="px-3 py-1.5 bg-rose-100 text-rose-900 rounded-xl text-[11px] font-black hover:bg-rose-200 cursor-pointer"
                >
                  كامل الدين ({selectedCustomerForPay.totalDebt.toLocaleString()} د.ج)
                </button>
                {selectedCustomerForPay.totalDebt > 5000 && (
                  <button
                    type="button"
                    onClick={() => setPayAmount(Math.round(selectedCustomerForPay.totalDebt / 2))}
                    className="px-3 py-1.5 bg-purple-100 text-purple-900 rounded-xl text-[11px] font-black hover:bg-purple-200 cursor-pointer"
                  >
                    النصف ({Math.round(selectedCustomerForPay.totalDebt / 2).toLocaleString()} د.ج)
                  </button>
                )}
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
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-purple-950 text-white font-black rounded-xl shadow-md hover:brightness-110 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <DollarSign className="w-4 h-4 text-amber-300" />
                  <span>{paying ? 'جاري التسجيل...' : 'تأكيد استلام الدفعة ✨'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ADJUST BALANCE / FIX TYPO MODAL */}
      {isAdjustBalanceModalOpen && selectedCustomerForAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-amber-200 overflow-hidden space-y-4">
            
            <div className="bg-gradient-to-r from-amber-950 via-purple-950 to-indigo-950 text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-400/20 rounded-2xl text-amber-300">
                  <Wrench className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-white">تصحيح خطأ في المبلغ المدفوع 🛠️</h3>
                  <p className="text-xs text-amber-200 font-bold">{selectedCustomerForAdjust.nameAr}</p>
                </div>
              </div>
              <button
                onClick={() => setIsAdjustBalanceModalOpen(false)}
                className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmAdjustBalance} className="p-6 space-y-4 font-black text-xs text-purple-950">
              
              <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600 font-bold">إجمالي المشتريات التراكمي:</span>
                  <span className="font-mono font-black text-purple-950">{(selectedCustomerForAdjust.totalPurchases || 0).toLocaleString()} د.ج</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-bold">المبلغ المدفوع الخاطئ حالياً:</span>
                  <span className="font-mono font-black text-rose-600">{(selectedCustomerForAdjust.totalPaid || 0).toLocaleString()} د.ج</span>
                </div>
                <div className="flex justify-between border-t border-amber-200 pt-1">
                  <span className="text-slate-600 font-bold">الدين الحالي قبل التصحيح:</span>
                  <span className="font-mono font-black text-amber-800">{(selectedCustomerForAdjust.totalDebt || 0).toLocaleString()} د.ج</span>
                </div>
              </div>

              <div>
                <label className="block mb-1 text-gray-700">المبلغ المدفوع الصحيح الحقيقي (د.ج) *</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={adjustedTotalPaid}
                  onChange={(e) => setAdjustedTotalPaid(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="أدخل المبلغ المدفوع الصحيح (مثلاً 4500 د.ج)..."
                  className="w-full px-3.5 py-3 bg-[#FFFBF7] border border-amber-300 rounded-xl outline-none font-mono font-black text-base text-purple-950 focus:ring-2 focus:ring-amber-400"
                />
                <span className="text-[11px] text-amber-700 font-bold mt-1 block">
                  💡 سيصبح الدين الجديد أوتوماتيكياً: {Math.max(0, (selectedCustomerForAdjust.totalPurchases || 0) - Number(adjustedTotalPaid || 0)).toLocaleString()} د.ج
                </span>
              </div>

              <div>
                <label className="block mb-1 text-gray-700">سبب التصحيح (اختياري)</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="مثال: خطأ مطبعي في إدخال أصفار زائدة..."
                  className="w-full px-3.5 py-2.5 bg-[#FFFBF7] border border-amber-200 rounded-xl outline-none text-xs font-bold"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-purple-100">
                <button
                  type="button"
                  onClick={() => setIsAdjustBalanceModalOpen(false)}
                  className="px-4 py-2.5 border border-gray-300 rounded-xl font-black text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={adjusting}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-purple-950 text-white font-black rounded-xl shadow-md hover:brightness-110 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <Wrench className="w-4 h-4 text-amber-300" />
                  <span>{adjusting ? 'جاري التصحيح...' : 'حفظ وتأكيد التصحيح ✨'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* PAYMENT HISTORY LEDGER MODAL */}
      {isPaymentHistoryModalOpen && selectedCustomerForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-indigo-100 overflow-hidden space-y-4 max-h-[90vh] flex flex-col">
            
            <div className="bg-gradient-to-r from-indigo-950 via-purple-950 to-indigo-900 text-white p-5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-400/20 rounded-2xl text-indigo-300">
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-white">سجل المقبوضات وتعديل الدفعات السابقة 📜</h3>
                  <p className="text-xs text-indigo-200 font-bold">{selectedCustomerForHistory.nameAr}</p>
                </div>
              </div>
              <button
                onClick={() => setIsPaymentHistoryModalOpen(false)}
                className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs font-bold text-purple-950">
              {loadingHistory ? (
                <div className="p-8 text-center text-slate-400 font-bold flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
                  <span>جاري تحميل سجل الدفعات والمقبوضات...</span>
                </div>
              ) : paymentHistory.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                  <History className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-slate-500 font-bold">لا توجد دفعات مسجلة سابقاً لهذا العميل في السجل الإسترجاعي.</p>
                  <p className="text-[11px] text-slate-400">يمكنك استخدام زر "تصحيح المدفوع" لتعديل إجمالي المبلغ المدفوع مباشرة.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <span className="text-slate-500 text-[11px] block font-bold">
                    إجمالي الدفعات المسجلة بالسجل: {paymentHistory.length} دفعة
                  </span>

                  {paymentHistory.map((p) => (
                    <div key={p.id} className="p-4 bg-[#FFFBF7] rounded-2xl border border-amber-200 space-y-3 shadow-xs">
                      {editingPaymentId === p.id ? (
                        <div className="space-y-3 bg-white p-3 rounded-xl border border-amber-300">
                          <span className="text-amber-900 font-black block">تعديل هذه الدفعة:</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-500 block">المبلغ الصحيح (د.ج):</label>
                              <input
                                type="number"
                                value={editingPaymentAmount}
                                onChange={(e) => setEditingPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-full p-2 bg-amber-50 border border-amber-300 rounded-lg font-mono font-black text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500 block">الملاحظات:</label>
                              <input
                                type="text"
                                value={editingPaymentNotes}
                                onChange={(e) => setEditingPaymentNotes(e.target.value)}
                                className="w-full p-2 bg-amber-50 border border-amber-300 rounded-lg text-xs"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setEditingPaymentId(null)}
                              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold"
                            >
                              إلغاء
                            </button>
                            <button
                              type="button"
                              disabled={savingPaymentEdit}
                              onClick={() => handleSaveEditPayment(p.id)}
                              className="px-4 py-1 bg-emerald-600 text-white rounded-lg text-xs font-black hover:bg-emerald-700"
                            >
                              {savingPaymentEdit ? 'جاري الحفظ...' : 'تأكيد التعديل ✨'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-emerald-700 text-base">
                                {p.amount.toLocaleString()} د.ج
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ({new Date(p.createdAt).toLocaleDateString('ar-DZ')})
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5">{p.notes || 'تسديد دفعة حساب جاري'}</p>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <button
                              onClick={() => setPrintingPaymentRecord(p)}
                              className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5 text-purple-700" />
                              <span>طباعة سند 🖨️</span>
                            </button>

                            <button
                              onClick={() => handleStartEditPayment(p)}
                              className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                              <span>تعديل</span>
                            </button>

                            <button
                              onClick={() => handleDeletePayment(p.id)}
                              className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-900 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-700" />
                              <span>حذف</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                onClick={() => setIsPaymentHistoryModalOpen(false)}
                className="px-5 py-2 bg-purple-950 text-amber-300 rounded-xl font-black text-xs hover:brightness-110"
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 5: STATEMENT OF ACCOUNT A4 PRINTABLE MODAL */}
      {isStatementModalOpen && selectedCustomerForStatement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-purple-100 overflow-hidden my-8 flex flex-col max-h-[90vh]">
            
            {/* Modal Control Header (Hidden when printing) */}
            <div className="print:hidden p-4 bg-gradient-to-r from-purple-950 via-indigo-950 to-purple-950 text-white flex items-center justify-between border-b border-amber-400/30 shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-sm text-white">معاينة وطباعة كشف حساب جاري تفصيلي (Statement A4)</h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:brightness-110 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الكشف (A4) 🖨️</span>
                </button>

                <button
                  onClick={() => setIsStatementModalOpen(false)}
                  className="text-gray-300 hover:text-white p-1"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* A4 Printable Document Body */}
            <div className="p-8 space-y-6 overflow-y-auto bg-white text-slate-900 font-sans text-right dir-rtl print:p-0 print:overflow-visible">
              
              {/* Document Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                <div className="space-y-1">
                  <h1 className="text-2xl font-black text-purple-950">{settings?.storeNameAr || 'مؤسسة زروقي للحلويات'}</h1>
                  <p className="text-xs font-bold text-slate-600">{settings?.taglineAr || 'حلويات ومستلزمات متكاملة عالية الجودة'}</p>
                  <p className="text-xs text-slate-500 font-mono">هاتف: {settings?.phone || '0550123456'} {settings?.addressAr ? `| العنوان: ${settings.addressAr}` : ''}</p>
                </div>

                <div className="text-left space-y-1">
                  <div className="inline-block bg-purple-950 text-amber-400 px-4 py-1.5 rounded-xl font-black text-sm">
                    كشف حساب جاري تفصيلي (A4)
                  </div>
                  <p className="text-xs font-mono font-bold text-slate-500">
                    تاريخ الإصدار: {new Date().toLocaleDateString('ar-DZ')}
                  </p>
                </div>
              </div>

              {/* Customer Info Box */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-bold">
                <div>
                  <span className="text-slate-400 block text-[10px]">اسم الطبيب / العميل:</span>
                  <span className="text-purple-950 font-black text-base">{selectedCustomerForStatement.nameAr}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">رقم الهاتف:</span>
                  <span className="font-mono">{selectedCustomerForStatement.phone || 'غير مسجل'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">العنوان:</span>
                  <span>{selectedCustomerForStatement.addressAr || 'غير مسجل'}</span>
                </div>
              </div>

              {/* Ledger Transactions Table */}
              <div className="border border-slate-300 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-900 text-white font-black">
                    <tr>
                      <th className="p-3">التاريخ والوقت</th>
                      <th className="p-3">نوع الحركة / مرجع البيع</th>
                      <th className="p-3 text-center">مدين (فواتير د.ج)</th>
                      <th className="p-3 text-center">دائن (تسديدات د.ج)</th>
                      <th className="p-3 text-left">الرصيد التراكمي المتبقي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                    {loadingStatement ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 font-bold">
                          جاري تحميل كشف الحساب التفصيلي...
                        </td>
                      </tr>
                    ) : statementLedger.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 font-bold">
                          لا توجد عمليات مبيعات أو تسديدات مسجلة لهذا العميل بعد
                        </td>
                      </tr>
                    ) : (
                      statementLedger.map((t, idx) => (
                        <tr key={idx} className={t.type === 'PAYMENT' ? 'bg-emerald-50/50' : ''}>
                          <td className="p-3 font-mono text-slate-600">
                            {new Date(t.date).toLocaleString('ar-DZ')}
                          </td>
                          <td className="p-3 font-bold">
                            <div>{t.label}</div>
                            {t.refNumber && <div className="text-[10px] text-slate-400 font-mono">مرجع: #{t.refNumber}</div>}
                          </td>
                          <td className="p-3 text-center font-mono font-black text-slate-900">
                            {t.debit > 0 ? `${t.debit.toLocaleString()} د.ج` : '—'}
                          </td>
                          <td className="p-3 text-center font-mono font-black text-emerald-700">
                            {t.credit > 0 ? `${t.credit.toLocaleString()} د.ج` : '—'}
                          </td>
                          <td className="p-3 text-left font-mono font-black text-purple-950 text-sm">
                            {t.runningBalance.toLocaleString()} د.ج
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Statement Summary Card */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-slate-900 text-white rounded-2xl text-center">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">إجمالي المبيعات (مدين)</span>
                  <span className="font-mono font-black text-base text-amber-300">
                    {statementLedger.reduce((sum, t) => sum + t.debit, 0).toLocaleString()} د.ج
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">إجمالي التسديدات (دائن)</span>
                  <span className="font-mono font-black text-base text-emerald-400">
                    {statementLedger.reduce((sum, t) => sum + t.credit, 0).toLocaleString()} د.ج
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">الرصيد المتبقي الحالي</span>
                  <span className="font-mono font-black text-lg text-rose-400">
                    {selectedCustomerForStatement.totalDebt.toLocaleString()} د.ج
                  </span>
                </div>
              </div>

              {/* Signatures Section */}
              <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs font-black text-slate-800">
                <div className="space-y-12">
                  <p>توقيع وموافقة الطبيب / العميل:</p>
                  <p className="text-slate-300">________________________</p>
                </div>
                <div className="space-y-12">
                  <p>ختم وتوقيع الإدارة العامة:</p>
                  <p className="text-slate-300">________________________</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: PAYMENT RECEIPT PRINT MODAL (سند قبض) */}
      {printingPaymentRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-purple-100 overflow-hidden">
            
            {/* Header Controls */}
            <div className="p-4 bg-purple-950 text-white flex items-center justify-between border-b border-amber-400/30 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-sm text-white">طباعة سند استلام دفعة مالية (سند قبض)</h3>
              </div>
              <button onClick={() => setPrintingPaymentRecord(null)} className="text-gray-300 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Printable Widget */}
            <div className="p-6 space-y-4 bg-white text-slate-900 font-sans text-right dir-rtl">
              <div className="text-center border-b border-slate-200 pb-3 space-y-1">
                <h2 className="font-black text-lg text-purple-950">{settings?.storeNameAr || 'مؤسسة زروقي للحلويات'}</h2>
                <div className="inline-block bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black px-3 py-1 rounded-full">
                  سند قبض واستلام مبلغ (Payment Receipt)
                </div>
                <p className="text-[10px] text-slate-400 font-mono mt-1">
                  رقم السند: REC-{printingPaymentRecord.id.substring(0, 8)} | التاريخ: {new Date(printingPaymentRecord.createdAt).toLocaleString('ar-DZ')}
                </p>
              </div>

              <div className="space-y-2 text-xs font-bold text-slate-800">
                <div className="flex justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-500">استلمنا من السيد/الطبيب:</span>
                  <span className="font-black text-purple-950">
                    {printingPaymentRecord.customerNameAr || selectedCustomerForHistory?.nameAr || 'العميل'}
                  </span>
                </div>

                <div className="flex justify-between bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-emerald-900">
                  <span>المبلغ المقبوض بالأرقام:</span>
                  <span className="font-mono font-black text-base text-emerald-700">
                    {printingPaymentRecord.amount.toLocaleString()} د.ج
                  </span>
                </div>

                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-950">
                  <span className="text-slate-500 text-[10px] block mb-0.5">المبلغ بالحروف والكلمات (تفقيط):</span>
                  <span className="font-black text-xs text-amber-900">
                    {amountInArabicWords(printingPaymentRecord.amount)}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 text-[10px] block mb-0.5">البيان والتفاصيل:</span>
                  <span>{printingPaymentRecord.notes || 'تسديد دفعة من الدين العام المتبقي'}</span>
                </div>
              </div>

              {/* Receipt Footer */}
              <div className="pt-4 border-t border-slate-200 flex justify-between items-end text-xs font-bold">
                <div>
                  <span className="text-[10px] text-slate-400 block">توقيع المستلم (الإدارة):</span>
                  <span className="text-slate-300 font-mono">________________</span>
                </div>

                <button
                  onClick={() => window.print()}
                  className="print:hidden px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs rounded-xl shadow-md hover:brightness-110 flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة السند 🖨️</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};

