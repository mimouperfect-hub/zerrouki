import React, { useState } from 'react';
import {
  Truck, X, Plus, Trash2, DollarSign, Calendar, FileText, Check, Sparkles, User, Layers, Barcode, FolderPlus
} from 'lucide-react';
import { api } from '../../api/client';
import { Product, Supplier, ProductVariant } from '../../types';

interface NewPurchaseInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  products: Product[];
  onPurchaseCreated: () => void;
}

interface PurchaseItemRow {
  productId: string;
  variantId?: string;
  quantity: number;
  purchasePrice: number;
  batchNumber?: string;
  expirationDate?: string;
}

export const NewPurchaseInvoiceModal: React.FC<NewPurchaseInvoiceModalProps> = ({
  isOpen,
  onClose,
  suppliers,
  products,
  onPurchaseCreated
}) => {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [supplierInvoiceRef, setSupplierInvoiceRef] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [notes, setNotes] = useState<string>('');

  // Items List State
  const [items, setItems] = useState<PurchaseItemRow[]>([
    {
      productId: products[0]?.id || '',
      quantity: 10,
      purchasePrice: products[0]?.purchasePrice || 100,
      expirationDate: new Date(Date.now() + 180 * 24 * 3600000).toISOString().substring(0, 10)
    }
  ]);

  // Financial State
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const currentSupplier = suppliers.find((s) => s.id === selectedSupplierId);

  // Calculations
  const calculatedSubtotal = items.reduce((sum, item) => sum + (item.quantity * item.purchasePrice), 0);
  const finalDiscount = Math.min(calculatedSubtotal, Math.max(0, discountAmount));
  const grandTotal = Math.max(0, calculatedSubtotal - finalDiscount);
  const remainingDebt = Math.max(0, grandTotal - Math.max(0, paidAmount));

  const handleAddItemRow = () => {
    const firstProd = products[0];
    setItems((prev) => [
      ...prev,
      {
        productId: firstProd?.id || '',
        quantity: 10,
        purchasePrice: firstProd?.purchasePrice || 100,
        expirationDate: new Date(Date.now() + 180 * 24 * 3600000).toISOString().substring(0, 10)
      }
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof PurchaseItemRow, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // If product changed, update default purchase price
      if (field === 'productId') {
        const prod = products.find((p) => p.id === value);
        if (prod) {
          updated[index].purchasePrice = prod.purchasePrice;
          updated[index].variantId = undefined;
        }
      }

      // If variant changed, update purchase price if variant has custom cost
      if (field === 'variantId') {
        const prod = products.find((p) => p.id === updated[index].productId);
        const variant = prod?.variants?.find((v) => v.id === value);
        if (variant && variant.purchasePrice) {
          updated[index].purchasePrice = variant.purchasePrice;
        }
      }

      return updated;
    });
  };

  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      alert('يرجى اختيار المورد');
      return;
    }
    if (items.length === 0) {
      alert('يرجى إضافة صنف واحد على الأقل لشحنة الشراء');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.createPurchase({
        supplierId: selectedSupplierId,
        supplierInvoiceRef: supplierInvoiceRef.trim(),
        purchaseDate,
        items: items.map((it) => ({
          productId: it.productId,
          variantId: it.variantId,
          quantity: Number(it.quantity) || 0,
          purchasePrice: Number(it.purchasePrice) || 0,
          batchNumber: it.batchNumber?.trim() || undefined,
          expirationDate: it.expirationDate || undefined
        })),
        discountAmount: finalDiscount,
        paidAmount: Number(paidAmount) || 0,
        notes: notes.trim()
      });

      onPurchaseCreated();
      onClose();
    } catch (err: any) {
      alert(err.message || 'فشلت عملية تسجيل فاتورة الشراء');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200 dir-rtl">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#2E1065] via-[#3B0764] to-[#1E1B4B] text-white p-5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-400/20 rounded-2xl text-amber-300">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white">تسجيل فاتورة شراء وتوريد متعددة الأصناف</h3>
              <p className="text-xs text-purple-200 font-bold">
                إدخال أصناف الشحنة، تحديث كلفة الشراء، حساب ديون المورد وتوليد دُفعات الصلاحية FEFO
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
        <form onSubmit={handleSubmitPurchase} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs font-black text-purple-950">
          {/* Section 1: Supplier & Invoice Header Details */}
          <div className="p-4 bg-[#FFFBF7] rounded-2xl border border-amber-200 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Supplier Selector */}
            <div>
              <label className="block mb-1 text-slate-600 font-black">المورد / الشركة الموزعة *</label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl outline-none font-bold text-xs"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nameAr} {s.companyName ? `(${s.companyName})` : ''} - دين سابق: {s.totalDebt.toLocaleString()} د.ج
                  </option>
                ))}
              </select>
              {currentSupplier && (
                <div className="mt-1 text-[10px] text-slate-500 font-bold">
                  دين المورد المتبقي قبل هذه الفاتورة: <span className="font-mono text-rose-600 font-black">{currentSupplier.totalDebt.toLocaleString()} د.ج</span>
                </div>
              )}
            </div>

            {/* Supplier Ref Invoice Number */}
            <div>
              <label className="block mb-1 text-slate-600 font-black">رقم فاتورة المورد (مرجع الشحنة)</label>
              <input
                type="text"
                placeholder="مثال: INV-SUP-2026-88"
                value={supplierInvoiceRef}
                onChange={(e) => setSupplierInvoiceRef(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-mono font-black outline-none"
              />
            </div>

            {/* Purchase Date */}
            <div>
              <label className="block mb-1 text-slate-600 font-black">تاريخ الشراء والاستلام *</label>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-mono font-black outline-none"
              />
            </div>
          </div>

          {/* Section 2: Dynamic Multi-Item Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-purple-100 pb-2">
              <h4 className="font-black text-purple-950 text-xs flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>جدول أصناف الفاتورة الواردة ({items.length} أصناف):</span>
              </h4>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white rounded-xl font-black text-xs hover:brightness-110 flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة صنف جديد للشحنة ✨</span>
              </button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {items.map((item, idx) => {
                const prod = products.find((p) => p.id === item.productId);
                const hasVariants = prod?.variants && prod.variants.length > 0;
                const rowTotal = item.quantity * item.purchasePrice;

                return (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-purple-950">الصنف #{idx + 1}:</span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-lg cursor-pointer"
                          title="حذف هذا الصنف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2 text-xs">
                      {/* Product Selector */}
                      <div className="md:col-span-2">
                        <label className="block text-[10px] text-slate-500 font-bold mb-0.5">المنتج المشترى *</label>
                        <select
                          value={item.productId}
                          onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-xl font-black text-purple-950 outline-none"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nameAr} ({p.barcode})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Variant Selector if present */}
                      {hasVariants && (
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold mb-0.5">الحجم / المتغير</label>
                          <select
                            value={item.variantId || ''}
                            onChange={(e) => handleItemChange(idx, 'variantId', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded-xl font-black outline-none"
                          >
                            <option value="">الحجم الافتراضي</option>
                            {prod?.variants?.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.nameAr}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Quantity */}
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-0.5">الكمية الواردة *</label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', Math.max(1, Number(e.target.value)))}
                          className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded-xl font-mono font-black text-purple-950 outline-none"
                        />
                      </div>

                      {/* Unit Purchase Price */}
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-0.5">سعر شراء القطعة (د.ج) *</label>
                        <input
                          type="number"
                          required
                          min={0}
                          value={item.purchasePrice}
                          onChange={(e) => handleItemChange(idx, 'purchasePrice', Number(e.target.value))}
                          className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded-xl font-mono font-black text-purple-950 outline-none"
                        />
                      </div>

                      {/* Expiration Date FEFO */}
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-0.5">تاريخ الانتهاء FEFO</label>
                        <input
                          type="date"
                          value={item.expirationDate || ''}
                          onChange={(e) => handleItemChange(idx, 'expirationDate', e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded-xl font-mono text-[11px] font-black outline-none"
                        />
                      </div>

                      {/* Item Total */}
                      <div className="md:col-span-6 flex justify-end items-center gap-2 pt-1 border-t border-slate-200">
                        <span className="text-[10px] text-slate-500 font-bold">إجمالي هذا الصنف:</span>
                        <span className="font-mono text-xs font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                          {rowTotal.toLocaleString()} د.ج
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Financial Summary & Payment Box */}
          <div className="p-4 bg-[#FFFBF7] rounded-2xl border border-amber-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="block text-[10px] text-slate-500 font-bold">مجموع أصناف الفاتورة:</span>
              <div className="text-sm font-black font-mono text-purple-950 mt-0.5">
                {calculatedSubtotal.toLocaleString()} د.ج
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 font-bold mb-0.5">خصم ممنوح من المورد (د.ج):</label>
              <input
                type="number"
                min={0}
                max={calculatedSubtotal}
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Number(e.target.value))}
                className="w-full px-2 py-1 bg-white border border-amber-300 rounded-xl font-mono font-black outline-none text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 font-bold mb-0.5">المبلغ المدفوع كاش للمورد (د.ج):</label>
              <input
                type="number"
                min={0}
                value={paidAmount}
                onChange={(e) => setPaidAmount(Number(e.target.value))}
                className="w-full px-2 py-1 bg-white border border-amber-300 rounded-xl font-mono font-black text-emerald-700 outline-none text-xs"
              />
            </div>

            <div>
              <span className="block text-[10px] text-slate-500 font-bold">الدين المتبقي للمورد بهذه الفاتورة:</span>
              <div className="text-sm font-black font-mono text-rose-600 mt-0.5">
                {remainingDebt.toLocaleString()} د.ج
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block mb-1 text-slate-600">ملاحظات / بيان الفاتورة (اختياري):</label>
            <input
              type="text"
              placeholder="مثال: شحنة شوكولاتة وعلب هدايا بمناسبة الموسم"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
            />
          </div>

          {/* Footer CTAs */}
          <div className="p-4 border-t border-purple-100 bg-[#FFF9F2] flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl border border-gray-300 font-black text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting || items.length === 0}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:brightness-110 text-white font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4 text-white" />
              <span>حفظ وتأكيد فاتورة الشراء ({grandTotal.toLocaleString()} د.ج) ✨</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
