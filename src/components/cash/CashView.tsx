import React, { useEffect, useState } from 'react';
import { Wallet, Plus, ArrowUpRight, ArrowDownRight, CheckCircle2, Lock } from 'lucide-react';
import { api } from '../../api/client';
import { Expense } from '../../types';

export const CashView: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Expense Modal
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [amount, setAmount] = useState(1000);
  const [categoryId, setCategoryId] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');

  useEffect(() => {
    loadCashData();
  }, []);

  const loadCashData = async () => {
    try {
      setLoading(true);
      const expRes = await api.getExpenses();
      setExpenses(expRes.expenses);
      setCategories(expRes.categories);
      if (expRes.categories.length > 0) setCategoryId(expRes.categories[0].id);
    } catch (e) {
      console.error('Failed to load expenses data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createExpense({ categoryId, amount, descriptionAr });
      setIsExpenseModalOpen(false);
      setDescriptionAr('');
      loadCashData();
    } catch (err: any) {
      alert(err.message || 'فشل تسجيل المصروف');
    }
  };

  const totalExpensesSum = expenses.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-purple-950 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-amber-500" />
            إدارة المصاريف والنثريات اليومية
          </h1>
          <p className="text-xs text-slate-500 font-bold mt-1">
            تسجيل ومتابعة المصاريف التشغيلية للمحل والنثريات اليومية
          </p>
        </div>

        <button
          onClick={() => setIsExpenseModalOpen(true)}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white font-black text-xs shadow-md hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-white" />
          تسجيل مصروف جديد ✨
        </button>
      </div>

      {/* Expense Summary Card */}
      <div className="bg-gradient-to-r from-[#2E1065] via-[#3B0764] to-[#1E1B4B] text-white p-6 md:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row justify-between items-center gap-4 border border-amber-300/40 relative overflow-hidden">
        <div className="absolute -top-10 -left-10 w-36 h-36 bg-rose-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-purple-950 font-black text-[10px] px-3 py-1 rounded-full mb-2 inline-block shadow-xs">
            ✨ إجمالي المصاريف المسجلة
          </span>
          <h3 className="text-3xl font-black font-mono text-white">
            {totalExpensesSum.toLocaleString()} د.ج
          </h3>
          <p className="text-xs text-purple-200 mt-1 font-bold">
            عدد المصاريف: {expenses.length} عملية مسجلة
          </p>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-purple-100 shadow-xs overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-purple-50 via-rose-50 to-amber-50 border-b border-purple-100">
          <h3 className="font-black text-sm text-purple-950">سجل المصاريف والنثريات</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#FAF7F2] text-[#3D2314] font-extrabold border-b border-gray-200">
              <tr>
                <th className="p-3.5">التاريخ</th>
                <th className="p-3.5">التصنيف</th>
                <th className="p-3.5">البيان والتفاصيل</th>
                <th className="p-3.5">المبلغ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400 font-bold">
                    جاري تحميل سجل المصاريف...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400 font-bold">
                    لا توجد مصاريف مسجلة
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-[#FAF7F2]/50 transition-colors">
                    <td className="p-3.5 font-mono text-gray-500">{exp.expenseDate}</td>
                    <td className="p-3.5 font-bold text-[#2A160A]">{exp.categoryNameAr}</td>
                    <td className="p-3.5">{exp.descriptionAr}</td>
                    <td className="p-3.5 font-black text-red-600 font-mono">
                      {exp.amount.toLocaleString()} د.ج
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 space-y-4">
            <h3 className="font-black text-lg text-[#2A160A]">تسجيل مصروف جديد</h3>
            <form onSubmit={handleCreateExpense} className="space-y-3 text-xs font-bold text-gray-700">
              <div>
                <label className="block mb-1">تصنيف المصروف *</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-gray-300 rounded-xl outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1">المبلغ (د.ج) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-gray-300 rounded-xl outline-none font-mono text-base"
                />
              </div>

              <div>
                <label className="block mb-1">شرح المصروف *</label>
                <input
                  type="text"
                  required
                  value={descriptionAr}
                  onChange={(e) => setDescriptionAr(e.target.value)}
                  placeholder="مثال: فاتورة الكهرباء أو أكياس التغليف"
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-gray-300 rounded-xl outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 border rounded-xl"
                >
                  إلغاء
                </button>
                <button type="submit" className="px-5 py-2 bg-[#3D2314] text-[#D4AF37] font-black rounded-xl">
                  حفظ المصروف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
