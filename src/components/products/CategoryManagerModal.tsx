import React, { useState } from 'react';
import { FolderPlus, X, Edit3, Trash2, Check, Plus, Tag, Layers, Sparkles, RefreshCw } from 'lucide-react';
import { api } from '../../api/client';
import { Category } from '../../types';
import { platformConfirm, platformAlert } from '../../context/DialogContext';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onCategoriesUpdated: () => void;
  onCategoryCreated?: (newCat: Category) => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  onCategoriesUpdated,
  onCategoryCreated
}) => {
  const [newCatName, setNewCatName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  if (!isOpen) return null;

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      setIsSubmitting(true);
      const created = await api.createCategory({
        nameAr: newCatName.trim(),
        nameFr: newCatName.trim()
      });
      setNewCatName('');
      onCategoriesUpdated();
      if (onCategoryCreated) {
        onCategoryCreated(created);
      }
    } catch (err: any) {
      alert(err.message || 'فشلت إضافة التصنيف');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEditing = (cat: Category) => {
    setEditingId(cat.id);
    setEditingName(cat.nameAr);
  };

  const handleSaveEdit = async (catId: string) => {
    if (!editingName.trim()) return;

    try {
      await api.updateCategory(catId, { nameAr: editingName.trim() });
      setEditingId(null);
      setEditingName('');
      onCategoriesUpdated();
    } catch (err: any) {
      alert(err.message || 'فشل تعديل التصنيف');
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    const isConfirmed = await platformConfirm({
      title: 'حذف قسم التصنيف 📂',
      message: `هل أنت متأكد من حذف تصنيف: "${cat.nameAr}"؟`,
      confirmText: 'تأكيد الحذف',
      cancelText: 'إلغاء',
      variant: 'danger'
    });

    if (isConfirmed) {
      try {
        await api.deleteCategory(cat.id);
        onCategoriesUpdated();
      } catch (err: any) {
        platformAlert({ title: 'خطأ', message: err.message || 'فشل حذف التصنيف', variant: 'error' });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#2E1065] via-[#3B0764] to-[#1E1B4B] text-white p-5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-400/20 rounded-2xl text-amber-300">
              <FolderPlus className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white">إدارة ودليل تصنيفات المحل</h3>
              <p className="text-xs text-purple-200 font-bold">
                إضافة تصنيفات جديدة، تعديل أسمائها، أو حذف التصنيفات الغير مستخدمة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs font-black text-purple-950">
          {/* Add New Category Form */}
          <form onSubmit={handleCreateCategory} className="p-4 bg-[#FFFBF7] rounded-2xl border border-amber-200 space-y-2">
            <label className="block text-purple-950 text-xs font-black flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>إضافة تصنيف جديد:</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="اسم التصنيف (مثال: مكسرات وفواكه مجففة)"
                className="flex-1 px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-black outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                type="submit"
                disabled={isSubmitting || !newCatName.trim()}
                className="px-4 py-2 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white font-black rounded-xl hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-md"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>إضافة ✨</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Existing Categories List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-purple-100 pb-2">
              <h4 className="font-black text-purple-950 text-xs flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-amber-500" />
                <span>التصنيفات المتاحة حالياً ({categories.length}):</span>
              </h4>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {categories.length === 0 ? (
                <div className="p-4 text-center text-slate-400 font-bold">لا توجد تصنيفات معرفة</div>
              ) : (
                categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-3 bg-slate-50 border border-slate-200 hover:border-amber-300 rounded-2xl flex items-center justify-between transition-all"
                  >
                    {editingId === cat.id ? (
                      <div className="flex items-center gap-2 w-full">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="flex-1 px-2.5 py-1 bg-white border border-amber-400 rounded-xl text-xs font-black outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(cat.id)}
                          className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 cursor-pointer"
                          title="حفظ التعديل"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="p-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 cursor-pointer"
                          title="إلغاء"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center text-xs font-black">
                            📁
                          </div>
                          <span className="font-black text-xs text-purple-950">{cat.nameAr}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStartEditing(cat)}
                            className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
                            title="تعديل اسم التصنيف"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                            title="حذف التصنيف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-purple-100 bg-[#FFF9F2] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-2xl bg-gradient-to-r from-purple-950 to-indigo-900 text-white font-black text-xs hover:brightness-110 shadow-md cursor-pointer"
          >
            إغلاق النافذة ✨
          </button>
        </div>
      </div>
    </div>
  );
};
