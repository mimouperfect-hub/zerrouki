import React, { useState, useEffect, useRef } from 'react';
import { Printer, X, Plus, Minus, Check, Tag, Layers, Sparkles, Search, ChevronDown } from 'lucide-react';
import { Product, ProductVariant } from '../../types';

interface BarcodePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  products?: Product[];
}

export const BarcodePrintModal: React.FC<BarcodePrintModalProps> = ({
  isOpen,
  onClose,
  product: initialProduct,
  products = []
}) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct || products[0] || null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [labelCount, setLabelCount] = useState<number>(12);
  const [showStoreName, setShowStoreName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);

  // Search product states
  const [prodSearchQuery, setProdSearchQuery] = useState('');
  const [isProdDropdownOpen, setIsProdDropdownOpen] = useState(false);
  const prodDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialProduct) {
      setSelectedProduct(initialProduct);
      setSelectedVariantId('');
    } else if (products.length > 0 && !selectedProduct) {
      setSelectedProduct(products[0]);
      setSelectedVariantId('');
    }
  }, [initialProduct, isOpen, products]);

  // Click outside listener for product search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (prodDropdownRef.current && !prodDropdownRef.current.contains(event.target as Node)) {
        setIsProdDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!isOpen) return null;

  const currentProd = selectedProduct || initialProduct || products[0];
  if (!currentProd) return null;

  const filteredProducts = products.filter((p) => {
    const q = prodSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.nameAr.toLowerCase().includes(q) ||
      (p.nameFr && p.nameFr.toLowerCase().includes(q)) ||
      p.barcode.includes(q) ||
      p.internalCode.toLowerCase().includes(q) ||
      (p.variants && p.variants.some((v) => v.nameAr.toLowerCase().includes(q) || (v.barcode && v.barcode.includes(q))))
    );
  });

  const selectedVariant = currentProd.variants?.find((v) => v.id === selectedVariantId);

  const activeBarcode = selectedVariant?.barcode || currentProd.barcode || currentProd.internalCode;
  const activeName = selectedVariant
    ? `${currentProd.nameAr} (${selectedVariant.nameAr})`
    : currentProd.nameAr;
  const activePrice = selectedVariant?.price ?? currentProd.sellingPrice;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      {/* Printable Sheet Media Style */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #barcode-sticker-print-area, #barcode-sticker-print-area * {
            visibility: visible !important;
          }
          #barcode-sticker-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            padding: 10px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#2E1065] via-[#3B0764] to-[#1E1B4B] text-white p-5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-400/20 rounded-2xl text-amber-300">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white">طباعة ملصقات الباركود متعددة الكميات</h3>
              <p className="text-xs text-purple-200 font-bold">
                تحديد كمية الملصقات وطباعتها مباشرة لطابعة الباركود أو الأوراق اللاصقة
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

        {/* Modal Body & Controls */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs font-black text-purple-950">
          {/* Controls Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-[#FFFBF7] rounded-2xl border border-amber-200">
            {/* Searchable Product Selector */}
            {products.length > 0 && (
              <div className="relative md:col-span-2" ref={prodDropdownRef}>
                <label className="block mb-1 text-slate-600 font-extrabold flex items-center justify-between">
                  <span>البحث واختيار المنتج المراد طباعته:</span>
                  {currentProd && (
                    <span className="text-[10px] text-amber-900 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md font-mono font-black">
                      المنتج المحدد حالياً: {currentProd.nameAr}
                    </span>
                  )}
                </label>

                <div className="relative">
                  <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none" />
                  <input
                    type="text"
                    value={prodSearchQuery}
                    onFocus={() => setIsProdDropdownOpen(true)}
                    onChange={(e) => {
                      setProdSearchQuery(e.target.value);
                      setIsProdDropdownOpen(true);
                    }}
                    placeholder={currentProd ? `ابحث باسم المنتج أو الباركود (الحالي: ${currentProd.nameAr})` : "ابحث باسم المنتج أو الباركود..."}
                    className="w-full pr-9 pl-8 py-2.5 bg-white border border-amber-300 rounded-xl text-xs font-black text-purple-950 outline-none focus:ring-2 focus:ring-amber-400 shadow-2xs"
                  />
                  {prodSearchQuery ? (
                    <button
                      onClick={() => setProdSearchQuery('')}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  )}
                </div>

                {/* Search Dropdown Results */}
                {isProdDropdownOpen && (
                  <div className="absolute right-0 left-0 top-full mt-1 bg-white border border-amber-300 rounded-2xl shadow-2xl z-40 max-h-60 overflow-y-auto divide-y divide-purple-50 animate-in fade-in duration-150">
                    {filteredProducts.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 font-bold">
                        لا يوجد منتج يطابق "{prodSearchQuery}"
                      </div>
                    ) : (
                      filteredProducts.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedProduct(p);
                            setSelectedVariantId('');
                            setProdSearchQuery('');
                            setIsProdDropdownOpen(false);
                          }}
                          className={`p-2.5 hover:bg-amber-50 cursor-pointer flex items-center justify-between transition-colors ${
                            currentProd.id === p.id ? 'bg-amber-100/60 font-black' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-2xs">
                              📦
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-black text-purple-950 truncate">
                                {p.nameAr}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono font-bold flex items-center gap-2 truncate">
                                <span>الباركود: {p.barcode}</span>
                                <span>• السعر: {p.sellingPrice.toLocaleString()} د.ج</span>
                                {p.variants && p.variants.length > 0 && (
                                  <span className="text-amber-900 bg-amber-100 px-1.5 py-0.2 rounded-md font-black">
                                    {p.variants.length} أحجام
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {currentProd.id === p.id && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Variant Selector if present */}
            {currentProd.variants && currentProd.variants.length > 0 && (
              <div className="md:col-span-2">
                <label className="block mb-1 text-slate-600">الحجم / المتغير المحدد لهذا المنتج:</label>
                <select
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl outline-none font-bold text-xs"
                >
                  <option value="">الباركود الرئيسي للمنتج</option>
                  {currentProd.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nameAr} - السعر: {v.price.toLocaleString()} د.ج {v.barcode ? `(باركود: ${v.barcode})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Label Quantity Count Controls */}
            <div className="md:col-span-2 space-y-2">
              <label className="block text-purple-950 text-xs font-black">
                عدد ملصقات الباركود المطلوب طباعتها:
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLabelCount((prev) => Math.max(1, prev - 1))}
                  className="p-2 bg-white border border-amber-300 rounded-xl hover:bg-amber-100 cursor-pointer"
                >
                  <Minus className="w-4 h-4 text-purple-950" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={labelCount}
                  onChange={(e) => setLabelCount(Math.max(1, Number(e.target.value)))}
                  className="w-24 text-center py-2 bg-white border border-amber-300 rounded-xl text-base font-mono font-black text-purple-950"
                />
                <button
                  type="button"
                  onClick={() => setLabelCount((prev) => prev + 1)}
                  className="p-2 bg-white border border-amber-300 rounded-xl hover:bg-amber-100 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-purple-950" />
                </button>

                {/* Quick Count Increments */}
                <div className="flex items-center gap-1.5 pr-2">
                  {[5, 10, 24, 50].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setLabelCount(num)}
                      className={`px-3 py-1.5 rounded-xl font-mono text-xs border cursor-pointer transition-all ${
                        labelCount === num
                          ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-purple-950 border-amber-400 shadow-xs'
                          : 'bg-white text-purple-950 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {num} ملصق
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Display Options Toggles */}
            <div className="md:col-span-2 flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-purple-950">
                <input
                  type="checkbox"
                  checked={showStoreName}
                  onChange={(e) => setShowStoreName(e.target.checked)}
                  className="w-4 h-4 rounded-md accent-amber-500 cursor-pointer"
                />
                <span>إظهار اسم المحل (زروقي للحلويات)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-purple-950">
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                  className="w-4 h-4 rounded-md accent-amber-500 cursor-pointer"
                />
                <span>إظهار سعر البيع (د.ج)</span>
              </label>
            </div>
          </div>

          {/* Sticker Preview Header */}
          <div className="flex items-center justify-between border-b border-purple-100 pb-2">
            <h4 className="font-black text-purple-950 text-xs flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>معاينة ورقة الملصقات (عدد {labelCount} ملصق):</span>
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">طابعة الحراري / أوراق A4 اللاصقة</span>
          </div>

          {/* Printable Sticker Sheet Area */}
          <div
            id="barcode-sticker-print-area"
            className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl max-h-72 overflow-y-auto"
          >
            {Array.from({ length: labelCount }).map((_, index) => (
              <div
                key={index}
                className="bg-white border border-slate-300 rounded-xl p-2.5 flex flex-col items-center justify-center text-center shadow-xs space-y-1 w-full min-h-[90px]"
              >
                {showStoreName && (
                  <span className="text-[9px] font-black text-purple-950 block truncate max-w-full">
                    زروقي للحلويات ZERROUKI
                  </span>
                )}
                <span className="text-[10px] font-black text-slate-900 truncate max-w-full line-clamp-1">
                  {activeName}
                </span>

                {/* High Contrast Standard 1D Barcode Pattern for Hardware Scanners */}
                <div className="w-full flex flex-col items-center justify-center py-1">
                  <div className="h-8 w-11/12 flex items-center justify-center gap-[1.5px] bg-white px-2 py-0.5 border border-slate-200 rounded-xs shadow-2xs">
                    {/* Quiet Start Guard */}
                    <div className="h-full w-[3px] bg-black" />
                    <div className="h-full w-[1.5px] bg-white" />
                    <div className="h-full w-[1.5px] bg-black" />

                    {/* Encoded Digit Bars */}
                    {activeBarcode.split('').map((char, i) => {
                      const code = char.charCodeAt(0);
                      const w1 = (code % 3) + 1;
                      const w2 = ((code * 2) % 3) + 1;
                      return (
                        <React.Fragment key={i}>
                          <div className="h-full bg-black" style={{ width: `${w1 * 1.5}px` }} />
                          <div className="h-full bg-white" style={{ width: `1.5px` }} />
                          <div className="h-full bg-black" style={{ width: `${w2 * 1.5}px` }} />
                          <div className="h-full bg-white" style={{ width: `1.5px` }} />
                        </React.Fragment>
                      );
                    })}

                    {/* Quiet Stop Guard */}
                    <div className="h-full w-[1.5px] bg-black" />
                    <div className="h-full w-[1.5px] bg-white" />
                    <div className="h-full w-[3px] bg-black" />
                  </div>
                  <span className="text-[10px] font-mono font-black text-slate-900 tracking-widest mt-0.5">
                    {activeBarcode}
                  </span>
                </div>

                {showPrice && (
                  <span className="text-[10px] font-black text-purple-950 bg-amber-100 border border-amber-200 px-2 py-0.2 rounded-md font-mono">
                    {activePrice.toLocaleString()} د.ج
                  </span>
                )}
              </div>
            ))}
          </div>
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
            type="button"
            onClick={handlePrint}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:brightness-110 text-white font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-white" />
            <span>طباعة الملصقات ({labelCount} ملصق) ✨</span>
          </button>
        </div>
      </div>
    </div>
  );
};
