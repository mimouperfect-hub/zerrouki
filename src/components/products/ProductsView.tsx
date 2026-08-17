import React, { useEffect, useState } from 'react';
import {
  Package, Plus, Search, Barcode, AlertTriangle, Edit3, Trash2,
  CheckCircle2, Filter, Layers, DollarSign, Image as ImageIcon,
  FileSpreadsheet, Upload, Download, Check, RefreshCw, Printer, FolderPlus
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../../api/client';
import { Product, Category } from '../../types';
import { BarcodePrintModal } from '../common/BarcodePrintModal';
import { CategoryManagerModal } from './CategoryManagerModal';
import { platformConfirm, platformAlert } from '../../context/DialogContext';

interface ImportedProductRow {
  nameAr: string;
  nameFr?: string;
  barcode?: string;
  categoryNameAr?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  currentStock?: number;
  minStock?: number;
  expirationDate?: string;
  status?: 'VALID' | 'INVALID';
  errorMessage?: string;
}

export const ProductsView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Category Manager Modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Barcode Printing Modal state
  const [isBarcodePrintModalOpen, setIsBarcodePrintModalOpen] = useState(false);
  const [selectedProductForBarcodePrint, setSelectedProductForBarcodePrint] = useState<Product | null>(null);

  // New Product Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProdVariants, setNewProdVariants] = useState<Array<{
    nameAr: string;
    price: number;
    purchasePrice?: number;
    stockQuantity?: number;
    barcode?: string;
  }>>([]);
  const [newProdForm, setNewProdForm] = useState({
    nameAr: '',
    nameFr: '',
    barcode: '',
    categoryId: '',
    purchasePrice: 0,
    sellingPrice: 0,
    currentStock: 0,
    minStock: 10,
    batchNumber: '',
    expirationDate: ''
  });

  // Excel Import Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportedProductRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prods, cats] = await Promise.all([
        api.getProducts(),
        api.getCategories()
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (e) {
      console.error('Failed to load products data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formattedVariants = newProdVariants
        .filter(v => v.nameAr.trim())
        .map((v, idx) => ({
          id: `v-${Date.now()}-${idx}`,
          nameAr: v.nameAr.trim(),
          price: Number(v.price) || 0,
          purchasePrice: Number(v.purchasePrice) || 0,
          stockQuantity: Number(v.stockQuantity) || 0,
          barcode: v.barcode ? v.barcode.trim() : undefined
        }));

      await api.createProduct({
        ...newProdForm,
        categoryId: newProdForm.categoryId || categories[0]?.id,
        variants: formattedVariants
      });
      setIsAddModalOpen(false);
      setNewProdVariants([]);
      setNewProdForm({
        nameAr: '',
        nameFr: '',
        barcode: '',
        categoryId: '',
        purchasePrice: 0,
        sellingPrice: 0,
        currentStock: 0,
        minStock: 10,
        batchNumber: '',
        expirationDate: ''
      });
      await loadData();
      window.dispatchEvent(new CustomEvent('zerrouki:products-updated'));
    } catch (err: any) {
      alert(err.message || 'فشلت إضافة المنتج');
    }
  };

  const handleDisableProduct = async (id: string, name: string) => {
    const isConfirmed = await platformConfirm({
      title: 'تعطيل / حذف المنتج 📦',
      message: `هل أنت متأكد من تعطيل وحذف المنتج: "${name}" من القائمة؟`,
      confirmText: 'تأكيد الحذف',
      cancelText: 'إلغاء',
      variant: 'danger'
    });

    if (isConfirmed) {
      try {
        await api.deleteProduct(id);
        await loadData();
        window.dispatchEvent(new CustomEvent('zerrouki:products-updated'));
      } catch (err: any) {
        platformAlert({ title: 'خطأ', message: err.message || 'فشل تعطيل المنتج', variant: 'error' });
      }
    }
  };

  // Download Sample Excel Template for Store Manager
  const handleDownloadExcelTemplate = () => {
    const sampleData = [
      {
        'اسم المنتج (عربي)': 'شوكولاتة نوتيلا 350غ (Nutella 350g)',
        'الاسم بالفرنسية': 'Nutella Hazelnut Spread 350g',
        'الباركود': '3017620422003',
        'التصنيف': 'الشوكولاتة',
        'سعر الشراء': 450,
        'سعر البيع': 600,
        'المخزون الأولي': 40,
        'الحد الأدنى': 10,
        'تاريخ انتهاء الصلاحية': '2027-06-30'
      },
      {
        'اسم المنتج (عربي)': 'علكة هوليوود نعناع (Hollywood Chewing Gum)',
        'الاسم بالفرنسية': 'Hollywood Chewing Gum Mint',
        'الباركود': '3596710311234',
        'التصنيف': 'اللبان',
        'سعر الشراء': 60,
        'سعر البيع': 90,
        'المخزون الأولي': 150,
        'الحد الأدنى': 20,
        'تاريخ انتهاء الصلاحية': '2026-12-31'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'منتجات_زروقي');
    XLSX.writeFile(workbook, 'Zerrouki_Sweets_Products_Template.xlsx');
  };

  // Handle Excel file selection & parsing
  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws);

        const parsedRows: ImportedProductRow[] = rawJson.map((row) => {
          const nameAr = String(row['اسم المنتج (عربي)'] || row['اسم المنتج'] || row['Name'] || row['Product Name'] || '').trim();
          const nameFr = String(row['الاسم بالفرنسية'] || row['Name Fr'] || '').trim();
          const barcode = String(row['الباركود'] || row['Barcode'] || '').trim();
          const categoryNameAr = String(row['التصنيف'] || row['Category'] || '').trim();
          const purchasePrice = Number(row['سعر الشراء'] || row['Purchase Price'] || 0);
          const sellingPrice = Number(row['سعر البيع'] || row['Selling Price'] || 0);
          const currentStock = Number(row['المخزون الأولي'] || row['المخزون'] || row['Stock'] || 0);
          const minStock = Number(row['الحد الأدنى'] || row['Min Stock'] || 10);
          const expirationDate = String(row['تاريخ انتهاء الصلاحية'] || row['Expiration Date'] || '').trim();

          const isValid = !!nameAr && sellingPrice > 0;
          return {
            nameAr,
            nameFr,
            barcode,
            categoryNameAr,
            purchasePrice,
            sellingPrice,
            currentStock,
            minStock,
            expirationDate,
            status: isValid ? 'VALID' : 'INVALID',
            errorMessage: !nameAr ? 'اسم المنتج مطلوب' : (sellingPrice <= 0 ? 'سعر البيع يجب أن يكون أكبر من 0' : undefined)
          };
        });

        setImportRows(parsedRows);
        setImportSuccessCount(null);
      } catch (err: any) {
        alert('فشل قراءة ملف Excel: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Execute bulk import with high-speed single-batch payload
  const handleExecuteImport = async () => {
    const validRows = importRows.filter((r) => r.status === 'VALID');
    if (validRows.length === 0) return;

    setIsImporting(true);

    try {
      const payload = validRows.map(item => {
        let catId = categories[0]?.id || 'cat-1';
        if (item.categoryNameAr) {
          const matchedCat = categories.find((c) => c.nameAr.includes(item.categoryNameAr!) || item.categoryNameAr!.includes(c.nameAr));
          if (matchedCat) catId = matchedCat.id;
        }

        return {
          nameAr: item.nameAr,
          nameFr: item.nameFr || item.nameAr,
          barcode: item.barcode || undefined,
          categoryId: catId,
          purchasePrice: item.purchasePrice,
          sellingPrice: item.sellingPrice,
          currentStock: item.currentStock,
          minStock: item.minStock,
          expirationDate: item.expirationDate || undefined
        };
      });

      const res = await api.bulkCreateProducts(payload);
      setImportSuccessCount(res.count || validRows.length);
      loadData();
    } catch (e: any) {
      console.error('Bulk import failed:', e);
      platformAlert({ title: 'خطأ', message: e.message || 'فشلت عملية استيراد المنتجات', variant: 'error' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportAllProductsToExcel = () => {
    const exportData = products.map((p) => {
      const categoryName = categories.find((c) => c.id === p.categoryId)?.nameAr || 'عام';
      return {
        'رمز المنتج (ID)': p.id,
        'اسم المنتج (عربي)': p.nameAr,
        'الاسم بالفرنسية': p.nameFr || '',
        'الباركود': p.barcode,
        'التصنيف': categoryName,
        'سعر الشراء': p.purchasePrice,
        'سعر البيع': p.sellingPrice,
        'سعر الجملة': p.wholesalePrice || p.sellingPrice,
        'المخزون الحالي': p.currentStock,
        'الحد الأدنى': p.minStock,
        'إجمالي القيمة بسعر الشراء (د.ج)': p.currentStock * p.purchasePrice
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'كتالوج_منتجات_زروقي');
    XLSX.writeFile(workbook, `قائمة_منتجات_مؤسسة_زروقي_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory ? p.categoryId === selectedCategory : true;
    const matchesLowStock = showLowStockOnly ? p.currentStock <= p.minStock : true;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.nameAr.toLowerCase().includes(q) ||
      p.barcode.includes(q) ||
      p.internalCode.toLowerCase().includes(q);

    return matchesCategory && matchesLowStock && matchesSearch;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200 dir-rtl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-purple-950 flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-500" />
            دليل المنتجات والأصناف
          </h1>
          <p className="text-xs text-slate-500 font-bold mt-1">
            إدارة الشوكولاتة والحلويات والبار كود وتتبع المخزون والأسعار
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportAllProductsToExcel}
            className="px-3.5 py-2.5 rounded-2xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 font-black text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-700" />
            تصدير لـ Excel 📊
          </button>

          <button
            onClick={() => {
              setSelectedProductForBarcodePrint(null);
              setIsBarcodePrintModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-900 to-indigo-900 text-amber-300 font-black text-xs shadow-md hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            طباعة ملصقات الباركود 🖨️
          </button>

          <button
            onClick={() => {
              setImportRows([]);
              setImportSuccessCount(null);
              setIsImportModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs shadow-md hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            استيراد من Excel
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white font-black text-xs shadow-md hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            إضافة منتج جديد ✨
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم المنتج أو الباركود..."
            className="w-full pr-9 pl-4 py-2 bg-[#FAF7F2] border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none"
          />
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 bg-[#FAF7F2] border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none"
        >
          <option value="">جميع التصنيفات</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nameAr}
            </option>
          ))}
        </select>

        {/* Manage Categories Button */}
        <button
          onClick={() => setIsCategoryModalOpen(true)}
          className="px-3.5 py-2 bg-[#FAF7F2] border border-amber-300 text-purple-950 hover:bg-amber-100/60 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <FolderPlus className="w-4 h-4 text-amber-500" />
          <span>إدارة التصنيفات ⚙️</span>
        </button>

        {/* Low Stock Filter Button */}
        <button
          onClick={() => setShowLowStockOnly(!showLowStockOnly)}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
            showLowStockOnly
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-[#FAF7F2] text-amber-800 border border-amber-200 hover:bg-amber-100/50'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          منخفض المخزون فقط
        </button>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-gradient-to-r from-purple-50 via-rose-50 to-amber-50 text-purple-950 font-black border-b border-purple-100">
              <tr>
                <th className="p-3.5">المنتج</th>
                <th className="p-3.5">الباركود / الكود</th>
                <th className="p-3.5">التصنيف</th>
                <th className="p-3.5">سعر الشراء</th>
                <th className="p-3.5">سعر البيع</th>
                <th className="p-3.5">المخزون الحالي</th>
                <th className="p-3.5">الحالة</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400 font-bold">
                    جاري تحميل دليل المنتجات...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400 font-bold">
                    لا توجد منتجات مطابقة لخيارات البحث
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLow = p.currentStock <= p.minStock;
                  const cat = categories.find((c) => c.id === p.categoryId);

                  return (
                    <tr key={p.id} className="hover:bg-[#FAF7F2]/50 transition-colors">
                      <td className="p-3.5 flex items-center gap-3">
                        <img
                          src={p.imageUrl}
                          alt={p.nameAr}
                          className="w-9 h-9 rounded-xl object-cover bg-gray-100 shrink-0 border border-gray-200"
                        />
                        <div>
                          <div className="font-extrabold text-[#2A160A]">{p.nameAr}</div>
                          {p.variants && p.variants.length > 0 ? (
                            <div className="text-[10px] text-amber-900 font-bold bg-amber-100/80 px-1.5 py-0.5 rounded-md inline-block mt-0.5">
                              {p.variants.length} متغيرات ({p.variants.map(v => v.nameAr).join(' - ')})
                            </div>
                          ) : (
                            p.nameFr && <div className="text-[10px] text-gray-400 font-mono">{p.nameFr}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-gray-600">
                        <div className="flex items-center gap-1 font-extrabold">
                          <Barcode className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>{p.barcode}</span>
                        </div>
                      </td>
                      <td className="p-3.5">{cat ? cat.nameAr : 'عام'}</td>
                      <td className="p-3.5 font-mono text-gray-500">{p.purchasePrice.toLocaleString()} د.ج</td>
                      <td className="p-3.5 font-black text-[#8C6B1B] font-mono">
                        {p.variants && p.variants.length > 0
                          ? `من ${Math.min(...p.variants.map(v => v.price)).toLocaleString()} د.ج`
                          : `${p.sellingPrice.toLocaleString()} د.ج`}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`font-black px-2.5 py-1 rounded-lg text-xs font-mono inline-block ${
                            isLow ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {p.currentStock} قطعة
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                          نشط
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedProductForBarcodePrint(p);
                              setIsBarcodePrintModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
                            title="طباعة ملصقات الباركود لهذا المنتج"
                          >
                            <Printer className="w-4 h-4 text-amber-600" />
                          </button>
                          <button
                            onClick={() => handleDisableProduct(p.id, p.nameAr)}
                            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer"
                            title="تعطيل المنتج"
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

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl p-6 border border-[#3D2314]/20 flex flex-col space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="font-black text-lg text-[#2A160A] flex items-center gap-2">
                <Package className="w-5 h-5 text-[#D4AF37]" />
                إضافة منتج جديد للمحل
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs font-bold text-gray-700">
              <div>
                <label className="block mb-1">اسم المنتج بالعربية *</label>
                <input
                  type="text"
                  required
                  value={newProdForm.nameAr}
                  onChange={(e) => setNewProdForm({ ...newProdForm, nameAr: e.target.value })}
                  placeholder="مثال: شوكولاتة ميلكا بالحليب 100غ"
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-gray-300 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">الباركود (اختياري)</label>
                  <input
                    type="text"
                    value={newProdForm.barcode}
                    onChange={(e) => setNewProdForm({ ...newProdForm, barcode: e.target.value })}
                    placeholder="توليد تلقائي إن ترك فارغاً"
                    className="w-full px-3 py-2 bg-[#FAF7F2] border border-gray-300 rounded-xl outline-none font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block">التصنيف *</label>
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="text-[11px] font-black text-amber-800 hover:text-amber-950 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <FolderPlus className="w-3.5 h-3.5 text-amber-500" />
                      <span>إدارة التصنيفات ⚙️</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={newProdForm.categoryId}
                      onChange={(e) => setNewProdForm({ ...newProdForm, categoryId: e.target.value })}
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-gray-300 rounded-xl outline-none text-xs font-bold"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nameAr}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="p-2 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white rounded-xl hover:brightness-110 shrink-0 cursor-pointer shadow-xs"
                      title="إضافة تصنيف جديد"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">سعر الشراء (د.ج) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={newProdForm.purchasePrice}
                    onChange={(e) => setNewProdForm({ ...newProdForm, purchasePrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#FAF7F2] border border-gray-300 rounded-xl outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block mb-1">سعر البيع (د.ج) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={newProdForm.sellingPrice}
                    onChange={(e) => setNewProdForm({ ...newProdForm, sellingPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#FAF7F2] border border-gray-300 rounded-xl outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">المخزون الأولي الافتتاحي</label>
                  <input
                    type="number"
                    min={0}
                    value={newProdForm.currentStock}
                    onChange={(e) => setNewProdForm({ ...newProdForm, currentStock: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#FAF7F2] border border-gray-300 rounded-xl outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block mb-1">تاريخ انتهاء الصلاحية (FEFO)</label>
                  <input
                    type="date"
                    value={newProdForm.expirationDate}
                    onChange={(e) => setNewProdForm({ ...newProdForm, expirationDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF7F2] border border-gray-300 rounded-xl outline-none font-mono"
                  />
                </div>
              </div>

              {/* Product Variants Creator UI */}
              <div className="p-4 bg-[#FFFBF7] border border-amber-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-black text-purple-950 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-amber-500" />
                      <span>تخصيص متغيرات وأحجام وأشكال المنتج (Product Variants):</span>
                    </label>
                    <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                      تخصيص أسعار الشراء، أسعار البيع، والكميات لكل حجم أو شكل على حدة.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setNewProdVariants((prev) => [
                        ...prev,
                        {
                          nameAr: '',
                          purchasePrice: newProdForm.purchasePrice || 0,
                          price: newProdForm.sellingPrice || 0,
                          stockQuantity: 0,
                          barcode: ''
                        }
                      ])
                    }
                    className="px-3 py-1.5 text-xs font-black bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white rounded-xl flex items-center gap-1 hover:brightness-110 transition-all cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة حجم / شكل / نكهة ✨</span>
                  </button>
                </div>

                {newProdVariants.length === 0 ? (
                  <p className="text-[11px] text-slate-400 font-bold italic">
                    لا توجد متغيرات مضافة لهذا المنتج حتى الآن (سيتم التعامل معه كمنتج موحد بحجم واحد).
                  </p>
                ) : (
                  <div className="space-y-3 pt-1">
                    {newProdVariants.map((varItem, idx) => (
                      <div key={idx} className="p-3 bg-white border border-amber-200 rounded-2xl space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-purple-950">المتغير / الخيار #{idx + 1}:</span>
                          <button
                            type="button"
                            onClick={() => setNewProdVariants((prev) => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title="حذف المتغير"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          {/* Name / Size */}
                          <div className="md:col-span-2">
                            <label className="block text-[10px] text-slate-500 font-bold mb-0.5">اسم الحجم / الشكل *</label>
                            <input
                              type="text"
                              required
                              placeholder="مثال: علبة كبيرة 1 كغ / شكل دائري"
                              value={varItem.nameAr}
                              onChange={(e) => {
                                const updated = [...newProdVariants];
                                updated[idx].nameAr = e.target.value;
                                setNewProdVariants(updated);
                              }}
                              className="w-full px-2.5 py-1.5 bg-[#FFFBF7] border border-amber-200 rounded-xl font-bold outline-none focus:ring-1 focus:ring-amber-400"
                            />
                          </div>

                          {/* Purchase Price */}
                          <div>
                            <label className="block text-[10px] text-slate-500 font-bold mb-0.5">سعر الشراء (د.ج)</label>
                            <input
                              type="number"
                              min={0}
                              placeholder="سعر الكلفة"
                              value={varItem.purchasePrice ?? 0}
                              onChange={(e) => {
                                const updated = [...newProdVariants];
                                updated[idx].purchasePrice = Number(e.target.value);
                                setNewProdVariants(updated);
                              }}
                              className="w-full px-2 py-1.5 bg-[#FFFBF7] border border-amber-200 rounded-xl font-mono font-bold outline-none focus:ring-1 focus:ring-amber-400"
                            />
                          </div>

                          {/* Selling Price */}
                          <div>
                            <label className="block text-[10px] text-slate-500 font-bold mb-0.5">سعر البيع (د.ج) *</label>
                            <input
                              type="number"
                              required
                              min={0}
                              placeholder="سعر البيع"
                              value={varItem.price}
                              onChange={(e) => {
                                const updated = [...newProdVariants];
                                updated[idx].price = Number(e.target.value);
                                setNewProdVariants(updated);
                              }}
                              className="w-full px-2 py-1.5 bg-[#FFFBF7] border border-amber-200 rounded-xl font-mono font-bold outline-none focus:ring-1 focus:ring-amber-400"
                            />
                          </div>

                          {/* Stock Quantity */}
                          <div>
                            <label className="block text-[10px] text-slate-500 font-bold mb-0.5">الكمية بالمخزن</label>
                            <input
                              type="number"
                              min={0}
                              placeholder="الكمية"
                              value={varItem.stockQuantity ?? 0}
                              onChange={(e) => {
                                const updated = [...newProdVariants];
                                updated[idx].stockQuantity = Number(e.target.value);
                                setNewProdVariants(updated);
                              }}
                              className="w-full px-2 py-1.5 bg-[#FFFBF7] border border-amber-200 rounded-xl font-mono font-bold outline-none focus:ring-1 focus:ring-amber-400"
                            />
                          </div>

                          {/* Custom Barcode */}
                          <div className="md:col-span-3">
                            <label className="block text-[10px] text-slate-500 font-bold mb-0.5">الباركود المخصص لهذا الحجم (اختياري)</label>
                            <input
                              type="text"
                              placeholder="ترك فارغاً لاستخدام باركود المنتج الرئيسي"
                              value={varItem.barcode || ''}
                              onChange={(e) => {
                                const updated = [...newProdVariants];
                                updated[idx].barcode = e.target.value;
                                setNewProdVariants(updated);
                              }}
                              className="w-full px-2.5 py-1.5 bg-[#FFFBF7] border border-amber-200 rounded-xl font-mono text-xs font-bold outline-none focus:ring-1 focus:ring-amber-400"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#3D2314] text-[#D4AF37] font-black hover:bg-[#2A160A]"
                >
                  حفظ المنتج
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Excel Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl p-6 border border-[#3D2314]/20 flex flex-col space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="font-black text-lg text-[#2A160A] flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                استيراد المنتجات والمخزون من ملف Excel
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {/* Template Download & File Upload Buttons */}
            <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-extrabold text-[#2A160A] text-xs">تحميل نموذج Excel الموحد</h4>
                <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                  قم بتحميل الملف التجريبي المملوء بالأعمدة لتعبئة منتجات المحل بالشكل الصحيح.
                </p>
              </div>

              <button
                onClick={handleDownloadExcelTemplate}
                className="px-4 py-2 rounded-xl bg-white border border-gray-300 text-gray-800 font-bold text-xs hover:bg-gray-50 flex items-center gap-2 shrink-0 shadow-2xs"
              >
                <Download className="w-4 h-4 text-[#D4AF37]" />
                تحميل النموذج النموذج (.xlsx)
              </button>
            </div>

            {/* File Upload Selector */}
            <div className="border-2 border-dashed border-emerald-300 bg-emerald-50/50 p-6 rounded-2xl text-center space-y-2">
              <Upload className="w-8 h-8 mx-auto text-emerald-600" />
              <label className="cursor-pointer inline-block px-5 py-2.5 bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs hover:bg-emerald-800 transition-colors">
                اختر ملف Excel من جهازك
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleExcelFileUpload}
                  className="hidden"
                />
              </label>
              <p className="text-[10px] text-gray-400 font-medium">يدعم صيغ (.xlsx / .xls / .csv)</p>
            </div>

            {/* Success Message Banner */}
            {importSuccessCount !== null && (
              <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-800 font-extrabold text-xs rounded-xl flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>تم استيراد وإضافة ({importSuccessCount}) منتج بنجاح إلى قاعدة بيانات المحل والمخزون!</span>
              </div>
            )}

            {/* Preview Parsed Rows Table */}
            {importRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-gray-700">
                  <span>معاينة المنتجات المستخرجة من الملف ({importRows.length}):</span>
                  <span className="text-emerald-700">
                    جاهز للاستيراد: {importRows.filter((r) => r.status === 'VALID').length}
                  </span>
                </div>

                <div className="border border-gray-200 rounded-xl overflow-x-auto max-h-56">
                  <table className="w-full text-right text-[11px]">
                    <thead className="bg-gray-100 font-extrabold text-gray-700 border-b border-gray-200">
                      <tr>
                        <th className="p-2">اسم المنتج</th>
                        <th className="p-2">الباركود</th>
                        <th className="p-2">التصنيف</th>
                        <th className="p-2">سعر الشراء</th>
                        <th className="p-2">سعر البيع</th>
                        <th className="p-2">المخزون</th>
                        <th className="p-2">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-semibold text-gray-600">
                      {importRows.map((row, idx) => (
                        <tr key={idx} className={row.status === 'INVALID' ? 'bg-red-50/60' : ''}>
                          <td className="p-2 font-bold text-[#2A160A]">{row.nameAr || '—'}</td>
                          <td className="p-2 font-mono text-gray-500">{row.barcode || 'توليد تلقائي'}</td>
                          <td className="p-2">{row.categoryNameAr || 'افتراضي'}</td>
                          <td className="p-2 font-mono">{row.purchasePrice} د.ج</td>
                          <td className="p-2 font-mono font-bold text-amber-700">{row.sellingPrice} د.ج</td>
                          <td className="p-2 font-mono">{row.currentStock} قطعة</td>
                          <td className="p-2">
                            {row.status === 'VALID' ? (
                              <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">صحيح</span>
                            ) : (
                              <span className="text-red-600 font-bold bg-red-100 px-1.5 py-0.5 rounded">{row.errorMessage}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold hover:bg-gray-50"
              >
                إغلاق
              </button>
              <button
                onClick={handleExecuteImport}
                disabled={isImporting || importRows.filter((r) => r.status === 'VALID').length === 0}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 text-white font-black text-xs hover:bg-emerald-800 disabled:opacity-50 flex items-center gap-2"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    جاري استيراد المنتجات...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    تأكيد وإتمام استيراد المنتجات ({importRows.filter((r) => r.status === 'VALID').length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Print Modal */}
      <BarcodePrintModal
        isOpen={isBarcodePrintModalOpen}
        onClose={() => setIsBarcodePrintModalOpen(false)}
        product={selectedProductForBarcodePrint}
        products={products}
      />

      {/* Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        onCategoriesUpdated={() => loadData()}
        onCategoryCreated={(newCat) => {
          setNewProdForm((prev) => ({ ...prev, categoryId: newCat.id }));
        }}
      />
    </div>
  );
};
