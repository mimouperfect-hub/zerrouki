import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Scan, ShoppingCart, Trash2, Plus, Minus,
  Wallet, User, Printer, CheckCircle, X, Tag, Sparkles, Check, RefreshCw, Layers, ChevronDown, Camera
} from 'lucide-react';
import { api } from '../../api/client';
import { Product, Category, Customer, PaymentMethod, ProductVariant } from '../../types';
import { ThermalReceiptModal } from '../common/ThermalReceiptModal';
import { CameraBarcodeScannerModal } from './CameraBarcodeScannerModal';

interface CartItem {
  product: Product;
  selectedVariant?: ProductVariant;
  quantity: number;
  discountAmount: number;
}

export const PosView: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(''); // Default: empty ("زبون عادي")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');

  // Customer Search in POS
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // Variant Modal selection state
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<Product | null>(null);

  // Manual / Camera Barcode Modal / Toast
  const [showManualBarcodeModal, setShowManualBarcodeModal] = useState(false);
  const [showCameraScannerModal, setShowCameraScannerModal] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Completed Invoice Modal state
  const [completedSale, setCompletedSale] = useState<any | null>(null);

  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // USB Barcode Scanner buffer listener
  const barcodeBufferRef = useRef<string>('');
  const barcodeTimeoutRef = useRef<any>(null);

  useEffect(() => {
    loadPosData();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events when typing inside text inputs, textareas, or select dropdowns
      const activeTag = (e.target as HTMLElement)?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag)) {
        return;
      }

      // Barcode Scanner Listener
      if (e.key === 'Enter') {
        if (barcodeBufferRef.current.length >= 2) {
          handleBarcodeScanned(barcodeBufferRef.current);
          barcodeBufferRef.current = '';
        }
      } else if (e.key.length === 1) {
        barcodeBufferRef.current += e.key;
        clearTimeout(barcodeTimeoutRef.current);
        barcodeTimeoutRef.current = setTimeout(() => {
          barcodeBufferRef.current = '';
        }, 150);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [products]);

  // Click outside listener for customer search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Audio fallback
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const loadPosData = async () => {
    try {
      const [cats, prods, custs] = await Promise.all([
        api.getCategories(),
        api.getProducts(),
        api.getCustomers()
      ]);
      setCategories(cats);
      setProducts(prods);
      setCustomers(custs);
    } catch (e) {
      console.error('فشل تحميل بيانات واجهة البائع:', e);
    }
  };

  const handleBarcodeScanned = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    // Search locally first for main barcode, internal code, or variant barcode
    for (const p of products) {
      if (p.barcode === trimmed || p.internalCode === trimmed) {
        if (p.currentStock <= 0) {
          showToast(`⚠️ المنتج ${p.nameAr} غير متوفر بالمخزون`);
          return;
        }
        handleProductCardClick(p);
        return;
      }

      if (p.variants && p.variants.length > 0) {
        const matchedVariant = p.variants.find(v => v.barcode === trimmed);
        if (matchedVariant) {
          if (p.currentStock <= 0) {
            showToast(`⚠️ المنتج ${p.nameAr} غير متوفر بالمخزون`);
            return;
          }
          addToCart(p, matchedVariant);
          playChime();
          showToast(`✅ تم العثور على الخيار: ${p.nameAr} (${matchedVariant.nameAr})`);
          return;
        }
      }
    }

    // Try backend API lookup
    try {
      const prod = await api.getProductByBarcode(trimmed);
      if (prod) {
        if (prod.currentStock <= 0) {
          showToast(`⚠️ المنتج ${prod.nameAr} غير متوفر بالمخزون`);
          return;
        }
        const matchedVar = prod.variants?.find(v => v.barcode === trimmed);
        if (matchedVar) {
          addToCart(prod, matchedVar);
          playChime();
          showToast(`✅ تم العثور على الخيار: ${prod.nameAr} (${matchedVar.nameAr})`);
        } else {
          handleProductCardClick(prod);
        }
      } else {
        showToast(`❌ الباركود (${trimmed}) غير موجود بالمنتجات`);
      }
    } catch {
      showToast(`❌ لم يتم العثور على المنتج برقم الباركود: ${trimmed}`);
    }
  };

  const handleProductCardClick = (product: Product) => {
    if (product.currentStock <= 0) return;
    if (product.variants && product.variants.length > 0) {
      setSelectedProductForVariants(product);
    } else {
      addToCart(product);
      playChime();
      showToast(`✅ تم إضافة: ${product.nameAr}`);
    }
  };

  const getItemKey = (item: CartItem) =>
    item.selectedVariant ? `${item.product.id}_${item.selectedVariant.id}` : item.product.id;

  const addToCart = (product: Product, variant?: ProductVariant) => {
    if (product.currentStock <= 0) return;
    const targetKey = variant ? `${product.id}_${variant.id}` : product.id;

    setCart(prev => {
      const existing = prev.find(item => getItemKey(item) === targetKey);
      if (existing) {
        return prev.map(item =>
          getItemKey(item) === targetKey
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, selectedVariant: variant, quantity: 1, discountAmount: 0 }];
    });
  };

  const updateQuantity = (itemKey: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (getItemKey(item) === itemKey) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (itemKey: string) => {
    setCart(prev => prev.filter(item => getItemKey(item) !== itemKey));
  };

  // Calculations
  const grandTotal = cart.reduce((sum, item) => {
    const unitPrice = item.selectedVariant ? item.selectedVariant.price : item.product.sellingPrice;
    return sum + (unitPrice * item.quantity);
  }, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsCheckoutLoading(true);
    setErrorMessage(null);

    try {
      const payload = {
        items: cart.map(item => {
          const unitPrice = item.selectedVariant ? item.selectedVariant.price : item.product.sellingPrice;
          return {
            productId: item.product.id,
            variantId: item.selectedVariant?.id,
            productNameAr: item.selectedVariant
              ? `${item.product.nameAr} (${item.selectedVariant.nameAr})`
              : item.product.nameAr,
            quantity: item.quantity,
            unitPrice,
            discountAmount: 0
          };
        }),
        customerId: selectedCustomerId || undefined,
        discountAmount: 0,
        paymentMethod
      };

      const res = await api.checkoutSale(payload);
      setCompletedSale(res.sale);
      playChime();
      // Reset POS cart
      setCart([]);
      setSelectedCustomerId('');
      setPaymentMethod('CASH');
      // Refresh products stock
      loadPosData();
    } catch (err: any) {
      setErrorMessage(err.message || 'فشلت عملية البيع، يرجى المحاولة لاحقاً');
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory ? p.categoryId === selectedCategory : true;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || p.nameAr.toLowerCase().includes(q) || p.barcode.includes(q) || p.internalCode?.includes(q);
    return matchesCategory && matchesSearch;
  });

  const selectedCustomerObj = customers.find(c => c.id === selectedCustomerId);

  const filteredCustomers = customers.filter(c => {
    const q = customerSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return c.nameAr.toLowerCase().includes(q) || (c.phone && c.phone.includes(q));
  });

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row overflow-hidden bg-[#FFF9F2] pb-16 md:pb-0 relative">
      {/* Printable thermal receipt styling container */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #thermal-receipt-print-area, #thermal-receipt-print-area * {
            visibility: visible !important;
          }
          #thermal-receipt-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            margin: 0 !important;
            padding: 10px !important;
            background: white !important;
            color: black !important;
            font-family: monospace, sans-serif !important;
          }
        }
      `}</style>

      {/* Main Left Section: Search Bar & Products Grid */}
      <div className="flex-1 flex flex-col p-3 sm:p-4 space-y-3 overflow-hidden border-l border-purple-100">
        
        {/* Top Header & Barcode Search Bar */}
        <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-purple-100 shadow-xs flex flex-wrap items-center gap-2 shrink-0">
          
          {/* Active Scanner Indicator */}
          <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-2.5 py-2 rounded-xl border border-emerald-200 shrink-0">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-black hidden sm:inline">الباركود نشط 🟢</span>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[140px]">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم أو الباركود..."
              className="w-full pr-9 pl-7 py-2 bg-[#FFFBF7] border border-amber-200/80 rounded-xl text-xs font-bold text-purple-950 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-amber-400 outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Camera Phone Barcode Scanner Button */}
          <button
            onClick={() => setShowCameraScannerModal(true)}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white font-black text-xs flex items-center justify-center gap-1.5 hover:brightness-110 transition-all shrink-0 shadow-md active:scale-98 cursor-pointer"
            title="مسح كود المنتج باستخدام كاميرا الهاتف"
          >
            <Camera className="w-4 h-4 text-white" />
            <span className="text-[11px]">كاميرا 📷</span>
          </button>

          {/* Manual Barcode Button */}
          <button
            onClick={() => setShowManualBarcodeModal(true)}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-purple-900 to-indigo-900 text-amber-300 font-black text-xs flex items-center justify-center gap-1.5 hover:from-purple-800 hover:to-indigo-800 transition-all shrink-0 shadow-md active:scale-98 cursor-pointer"
            title="إدخال كود الباركود يدويـاً"
          >
            <Scan className="w-4 h-4 text-amber-400" />
            <span className="text-[11px]">باركود</span>
          </button>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-xl text-xs font-black shrink-0 transition-all ${
              selectedCategory === null
                ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white shadow-md'
                : 'bg-white text-purple-950 border border-purple-100 hover:bg-purple-50'
            }`}
          >
            جميع المنتجات ({products.length})
          </button>
          {categories.map((cat) => {
            const count = products.filter(p => p.categoryId === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white shadow-md'
                    : 'bg-white text-purple-950 border border-purple-100 hover:bg-purple-50'
                }`}
              >
                {cat.nameAr} ({count})
              </button>
            );
          })}
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pr-1">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full h-48 flex flex-col items-center justify-center text-center text-gray-400 bg-white/50 rounded-2xl border border-dashed border-gray-300">
              <Search className="w-8 h-8 mb-2 stroke-1 text-gray-300" />
              <p className="text-xs font-bold text-gray-500">
                {products.length === 0 ? 'لا توجد منتجات مسجلة في النظام بعد. يرجى إضافة منتجاتك من إدارة المخزون للبدء!' : 'لا توجد منتجات تطابق البحث الحالي'}
              </p>
            </div>
          ) : (
            filteredProducts.map((product) => {
              const isOutOfStock = product.currentStock <= 0;
              const hasVariants = product.variants && product.variants.length > 0;
              const cartCount = cart
                .filter(item => item.product.id === product.id)
                .reduce((sum, item) => sum + item.quantity, 0);

              return (
                <div
                  key={product.id}
                  onClick={() => handleProductCardClick(product)}
                  className={`bg-white p-3 rounded-2xl border transition-all flex flex-col justify-between select-none relative group ${
                    isOutOfStock
                      ? 'opacity-50 border-red-200 cursor-not-allowed bg-red-50/20'
                      : 'border-purple-100 hover:border-amber-400 hover:shadow-lg hover:scale-[1.02] cursor-pointer active:scale-98'
                  }`}
                >
                  {/* Cart quantity indicator badge */}
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shadow-md z-10 animate-in zoom-in-50 duration-150">
                      {cartCount}
                    </span>
                  )}

                  {/* Has Variants Badge */}
                  {hasVariants && (
                    <span className="absolute top-2 left-2 bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs z-10 flex items-center gap-0.5">
                      <Layers className="w-2.5 h-2.5" /> خيارات
                    </span>
                  )}

                  <div>
                    {/* Image / Fallback Icon */}
                    <div className="aspect-square w-full rounded-xl overflow-hidden bg-amber-50/50 mb-2 relative flex items-center justify-center">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.nameAr}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <Sparkles className="w-8 h-8 text-amber-400" />
                      )}

                      {/* Stock Badge */}
                      <span className={`absolute top-1.5 right-1.5 text-[10px] font-black px-2 py-0.5 rounded-md backdrop-blur-xs ${
                        isOutOfStock
                          ? 'bg-rose-600 text-white'
                          : 'bg-purple-950/85 text-amber-200'
                      }`}>
                        {isOutOfStock ? 'نفذ' : `${product.currentStock} قطعة`}
                      </span>
                    </div>

                    <h4 className="text-xs font-black text-purple-950 line-clamp-2 leading-snug mb-1">
                      {product.nameAr}
                    </h4>

                    {/* Expiry Warning Badge */}
                    {(() => {
                      if (!product.batches || product.batches.length === 0) return null;
                      const active = product.batches.filter(b => (b.quantity || 0) > 0 && b.expirationDate);
                      if (active.length === 0) return null;
                      active.sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());
                      const earliestExp = new Date(active[0].expirationDate).getTime();
                      const daysLeft = Math.ceil((earliestExp - Date.now()) / (1000 * 60 * 60 * 24));
                      if (daysLeft > 30) return null;

                      return (
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 mt-0.5 w-fit ${
                          daysLeft <= 0 ? 'bg-rose-600 text-white animate-pulse' : 'bg-amber-500 text-white'
                        }`}>
                          ⚠️ {daysLeft <= 0 ? 'صلاحية منتهية!' : `صلاحية قريبة (${daysLeft} يوم)`}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
                    <span className="text-xs font-black text-rose-600">
                      {hasVariants ? `من ${Math.min(...product.variants!.map(v => v.price)).toLocaleString()} د.ج` : `${product.sellingPrice.toLocaleString()} د.ج`}
                    </span>
                    <button
                      disabled={isOutOfStock}
                      className="p-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 text-white hover:brightness-110 transition-colors disabled:opacity-50 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Sidebar: POS Cart Terminal & Checkout (Desktop md+ view) */}
      <div className="hidden md:flex w-96 bg-white flex-col h-full border-r border-purple-100 shadow-xl shrink-0">
        
        {/* Cart Header */}
        <div className="p-3.5 border-b border-purple-100 flex items-center justify-between bg-gradient-to-r from-purple-50 via-rose-50 to-amber-50">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-purple-900" />
            <h3 className="font-black text-purple-950 text-sm">سلة البيع الحالية</h3>
            <span className="bg-gradient-to-r from-purple-700 to-indigo-700 text-amber-200 text-xs font-black px-2.5 py-0.5 rounded-full shadow-xs">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} قطعة
            </span>
          </div>

          {cart.length > 0 && (
            <button
              onClick={() => setCart([])}
              className="text-xs font-black text-rose-600 hover:text-rose-700 flex items-center gap-1 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              مسح السلة
            </button>
          )}
        </div>

        {/* Searchable Customer Selection Section */}
        <div className="p-3 border-b border-purple-100 bg-white relative" ref={customerDropdownRef}>
          <div className="flex justify-between items-center mb-1">
            <label className="text-[11px] font-black text-purple-900 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-amber-500" />
              <span>اختيار / البحث عن العميل:</span>
            </label>
            {selectedCustomerId && (
              <button
                onClick={() => {
                  setSelectedCustomerId('');
                  setCustomerSearchQuery('');
                  setPaymentMethod('CASH');
                }}
                className="text-[10px] font-black text-rose-600 hover:text-rose-800 flex items-center gap-0.5 cursor-pointer hover:underline"
              >
                <X className="w-3 h-3" />
                إلغاء (زبون عادي)
              </button>
            )}
          </div>

          {/* Search Input Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none" />
            <input
              type="text"
              value={customerSearchQuery}
              onFocus={() => setIsCustomerDropdownOpen(true)}
              onChange={(e) => {
                setCustomerSearchQuery(e.target.value);
                setIsCustomerDropdownOpen(true);
              }}
              placeholder={selectedCustomerObj ? selectedCustomerObj.nameAr : "ابحث باسم العميل أو رقم الهاتف..."}
              className={`w-full pr-8 pl-8 py-2 bg-[#FFFBF7] border rounded-xl text-xs font-black outline-none transition-all ${
                selectedCustomerObj 
                  ? 'border-amber-400 text-purple-950 bg-amber-50/40 ring-1 ring-amber-300' 
                  : 'border-amber-200 text-purple-950 focus:ring-2 focus:ring-amber-400'
              }`}
            />
            {customerSearchQuery ? (
              <button
                onClick={() => setCustomerSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <ChevronDown className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            )}
          </div>

          {/* Dropdown Menu */}
          {isCustomerDropdownOpen && (
            <div className="absolute right-3 left-3 top-full mt-1 bg-white border border-amber-200 rounded-2xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-purple-50 animate-in fade-in duration-150">
              {/* Option: Guest / Normal Customer */}
              <div
                onClick={() => {
                  setSelectedCustomerId('');
                  setCustomerSearchQuery('');
                  setIsCustomerDropdownOpen(false);
                  setPaymentMethod('CASH');
                }}
                className={`p-2.5 hover:bg-amber-50 cursor-pointer flex items-center justify-between transition-colors ${
                  !selectedCustomerId ? 'bg-amber-100/60 font-black' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-black">
                    👤
                  </div>
                  <div>
                    <div className="text-xs font-black text-purple-950">زبون عادي (بدون اسم / بيع مباشر)</div>
                    <div className="text-[10px] text-slate-500 font-bold">دفع مباشر نقدي بدون تسجيل ديون</div>
                  </div>
                </div>
                {!selectedCustomerId && <Check className="w-4 h-4 text-emerald-600" />}
              </div>

              {/* Filtered Customer Options */}
              {filteredCustomers.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 font-bold">
                  لا يوجد عميل يطابق "{customerSearchQuery}"
                </div>
              ) : (
                filteredCustomers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedCustomerId(c.id);
                      setCustomerSearchQuery('');
                      setIsCustomerDropdownOpen(false);
                    }}
                    className={`p-2.5 hover:bg-amber-50 cursor-pointer flex items-center justify-between transition-colors ${
                      selectedCustomerId === c.id ? 'bg-amber-100/60 font-black' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center text-xs font-black shadow-2xs shrink-0">
                        {c.nameAr.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black text-purple-950 flex items-center gap-1.5 truncate">
                          <span className="truncate">{c.nameAr}</span>
                          {c.totalDebt > 0 && (
                            <span className="text-[9px] bg-rose-100 text-rose-700 font-black px-1.5 py-0.2 rounded-md shrink-0">
                              دين: {c.totalDebt.toLocaleString()} د.ج
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono font-bold truncate">
                          📱 {c.phone || 'بدون هاتف'} • ⭐ {c.loyaltyPoints || 0} نقطة
                        </div>
                      </div>
                    </div>
                    {selectedCustomerId === c.id && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Selected Customer Card Details */}
          {selectedCustomerObj && (
            <div className="mt-2 p-2.5 bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200 rounded-xl text-[11px] font-black text-purple-950 flex justify-between items-center shadow-2xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-purple-950">
                  <span className="font-extrabold text-slate-500">العميل المحدد:</span>
                  <span className="text-purple-950 font-black">{selectedCustomerObj.nameAr}</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono font-bold">
                  هاتف: {selectedCustomerObj.phone || 'غير مسجل'} | نقاط الولاء: {selectedCustomerObj.loyaltyPoints || 0}
                </div>
              </div>
              {selectedCustomerObj.totalDebt > 0 ? (
                <span className="bg-rose-100 text-rose-800 font-black text-[10px] px-2 py-0.5 rounded-lg border border-rose-200 shrink-0">
                  دين: {selectedCustomerObj.totalDebt.toLocaleString()} د.ج
                </span>
              ) : (
                <span className="bg-emerald-100 text-emerald-800 font-black text-[10px] px-2 py-0.5 rounded-lg border border-emerald-200 shrink-0">
                  لا توجد ديون 🟢
                </span>
              )}
            </div>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
              <ShoppingCart className="w-12 h-12 stroke-1 mb-2 text-rose-300" />
              <p className="text-xs font-black text-purple-950">السلة فارغة حالياً</p>
              <p className="text-[11px] mt-1 text-slate-500 font-bold">
                امسح الباركود أو انقر على المنتج لإضافته للبيع مباشرة
              </p>
            </div>
          ) : (
            cart.map((item) => {
              const itemKey = getItemKey(item);
              const unitPrice = item.selectedVariant ? item.selectedVariant.price : item.product.sellingPrice;

              return (
                <div
                  key={itemKey}
                  className="p-2.5 bg-[#FFFBF7] rounded-2xl border border-purple-100 flex items-center justify-between gap-2 shadow-2xs hover:border-amber-300 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-black text-purple-950 truncate">
                      {item.product.nameAr}
                    </h5>
                    {item.selectedVariant && (
                      <span className="inline-block bg-amber-200/80 text-amber-950 text-[10px] font-black px-1.5 py-0.5 rounded-md mt-0.5">
                        {item.selectedVariant.nameAr}
                      </span>
                    )}
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5 font-bold">
                      {unitPrice.toLocaleString()} د.ج × {item.quantity} ={' '}
                      <span className="font-black text-rose-600">
                        {(unitPrice * item.quantity).toLocaleString()} د.ج
                      </span>
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-1 bg-white rounded-xl border border-purple-100 p-0.5 shadow-xs">
                    <button
                      onClick={() => updateQuantity(itemKey, -1)}
                      className="p-1 text-purple-900 hover:bg-purple-50 rounded-lg active:scale-95 transition-transform"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-black px-1.5 min-w-5 text-center text-purple-950">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(itemKey, 1)}
                      className="p-1 text-purple-900 hover:bg-purple-50 rounded-lg active:scale-95 transition-transform"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => removeFromCart(itemKey)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Checkout Footer & Payment Action */}
        <div className="p-4 border-t border-purple-100 bg-[#FFF9F2] space-y-3">
          {errorMessage && (
            <div className="p-2.5 bg-rose-100 text-rose-800 text-xs font-black rounded-xl text-center border border-rose-200">
              {errorMessage}
            </div>
          )}

          {/* Payment Method Selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPaymentMethod('CASH')}
              className={`py-2.5 px-3 rounded-xl text-xs font-black border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                paymentMethod === 'CASH'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-500 shadow-md'
                  : 'bg-white text-purple-950 border-purple-100 hover:bg-purple-50'
              }`}
            >
              <Wallet className="w-4 h-4 text-emerald-200" />
              <span>دفع نقداً (كاش)</span>
            </button>

            <button
              onClick={() => {
                if (!selectedCustomerId) {
                  showToast('⚠️ يجب اختيار اسم عميل مسجل لتسجيل البيع بالدين');
                  return;
                }
                setPaymentMethod('CREDIT');
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-black border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                paymentMethod === 'CREDIT'
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white border-rose-500 shadow-md'
                  : 'bg-white text-purple-950 border-purple-100 hover:bg-purple-50'
              } ${!selectedCustomerId ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Tag className="w-4 h-4 text-amber-200" />
              <span>بيع بالدين</span>
            </button>
          </div>

          {/* Total Display */}
          <div className="bg-white p-3.5 rounded-2xl border border-purple-100 space-y-1 shadow-xs">
            <div className="flex justify-between text-slate-500 text-xs font-extrabold">
              <span>العميل المختار:</span>
              <span className="text-purple-950 font-black">
                {selectedCustomerObj ? selectedCustomerObj.nameAr : 'زبون عادي'}
              </span>
            </div>
            <div className="flex justify-between text-base font-black text-purple-950 border-t border-purple-100 pt-2">
              <span>المجموع النهائي:</span>
              <span className="text-rose-600 text-lg font-mono font-black">
                {grandTotal.toLocaleString()} د.ج
              </span>
            </div>
          </div>

          {/* Complete & Print Invoice Button */}
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || isCheckoutLoading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white font-black text-sm shadow-xl shadow-orange-500/25 hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isCheckoutLoading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>جاري حفظ الفاتورة...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>إتمام البيع واستخراج الفاتورة ({grandTotal.toLocaleString()} د.ج) ✨</span>
              </>
            )}
          </button>
        </div>
      </div>


      {/* Variant Selection Modal */}
      {selectedProductForVariants && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 border border-[#3D2314]/20 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div>
                <span className="text-[10px] font-black bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md">
                  اختر الأحجام أو الخيارات المناسبة
                </span>
                <h3 className="font-extrabold text-base text-[#2A160A] mt-1">
                  {selectedProductForVariants.nameAr}
                </h3>
              </div>
              <button
                onClick={() => setSelectedProductForVariants(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {selectedProductForVariants.variants?.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => {
                    addToCart(selectedProductForVariants, variant);
                    playChime();
                    showToast(`✅ تم اختيار: ${selectedProductForVariants.nameAr} (${variant.nameAr})`);
                    setSelectedProductForVariants(null);
                  }}
                  className="w-full p-3.5 bg-[#FAF7F2] hover:bg-[#3D2314] hover:text-[#D4AF37] border border-gray-200/80 rounded-2xl flex items-center justify-between text-xs font-black transition-all group active:scale-98"
                >
                  <span className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#D4AF37]" />
                    <span>{variant.nameAr}</span>
                  </span>
                  <span className="font-mono text-[#8C6B1B] group-hover:text-[#D4AF37]">
                    {variant.price.toLocaleString()} د.ج
                  </span>
                </button>
              ))}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedProductForVariants(null)}
                className="w-full py-2.5 rounded-xl border border-gray-300 font-bold text-xs text-gray-700 hover:bg-gray-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Barcode Entry Modal */}
      {showManualBarcodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 border border-[#3D2314]/20 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="font-extrabold text-sm text-[#2A160A] flex items-center gap-2">
                <Scan className="w-4 h-4 text-[#D4AF37]" />
                إدخال رقم الباركود يدوياً
              </h3>
              <button
                onClick={() => setShowManualBarcodeModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (manualBarcode) {
                  handleBarcodeScanned(manualBarcode);
                  setManualBarcode('');
                  setShowManualBarcodeModal(false);
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  رقم الباركود:
                </label>
                <input
                  type="text"
                  autoFocus
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  placeholder="مثال: 629110012345"
                  className="w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-gray-300 rounded-xl text-xs font-mono font-bold text-[#2A160A] outline-none focus:ring-2 focus:ring-[#3D2314]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#3D2314] text-[#D4AF37] font-bold text-xs hover:bg-[#2A160A]"
                >
                  إضافة السلعة
                </button>
                <button
                  type="button"
                  onClick={() => setShowManualBarcodeModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 font-bold text-xs text-gray-700 hover:bg-gray-50"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Camera Phone Barcode Scanner Modal */}
      <CameraBarcodeScannerModal
        isOpen={showCameraScannerModal}
        onClose={() => setShowCameraScannerModal(false)}
        onScan={(scannedCode) => {
          handleBarcodeScanned(scannedCode);
        }}
      />

      {/* Completed Sale Receipt Modal */}
      {completedSale && (
        <ThermalReceiptModal
          sale={completedSale}
          onClose={() => setCompletedSale(null)}
        />
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-900 to-indigo-900 text-amber-300 px-4 py-3 rounded-2xl shadow-2xl text-xs font-black flex items-center gap-2 animate-in slide-in-from-bottom-5 duration-200 border border-amber-300/40">
          <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Mobile Floating Cart Action Bar (Visible only on mobile screens < md) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-purple-200 p-2.5 shadow-2xl flex items-center justify-between gap-2">
        <button
          onClick={() => setIsMobileCartOpen(true)}
          className="flex-1 py-3 px-3.5 rounded-2xl bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 text-amber-300 font-black text-xs shadow-lg flex items-center justify-between cursor-pointer border border-amber-300/30"
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <ShoppingCart className="w-5 h-5 text-amber-400" />
              {cart.length > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </div>
            <span>سلة البيع</span>
          </div>

          <span className="font-mono text-xs font-black text-amber-300">
            {grandTotal.toLocaleString()} د.ج 🔼
          </span>
        </button>

        {cart.length > 0 && (
          <button
            onClick={handleCheckout}
            disabled={isCheckoutLoading}
            className="py-3 px-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white font-black text-xs shadow-lg hover:brightness-110 active:scale-98 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
          >
            {isCheckoutLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>إتمام البيع ⚡</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Mobile Fullscreen Cart Modal / Bottom Sheet Drawer */}
      {isMobileCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs md:hidden flex flex-col justify-end animate-in fade-in duration-150">
          <div className="bg-white rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl border-t border-purple-200 animate-in slide-in-from-bottom duration-200">
            {/* Modal Header */}
            <div className="p-3.5 border-b border-purple-100 flex items-center justify-between bg-gradient-to-r from-purple-950 to-indigo-900 text-white rounded-t-3xl">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-amber-300" />
                <h3 className="font-black text-xs text-white">سلة البيع ودفع الفاتورة 🛒</h3>
                <span className="bg-amber-400 text-purple-950 text-xs font-black px-2 py-0.5 rounded-full">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} قطعة
                </span>
              </div>
              <button
                onClick={() => setIsMobileCartOpen(false)}
                className="p-1.5 text-slate-300 hover:text-white bg-white/10 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Cart Content */}
            <div className="overflow-y-auto p-4 space-y-3.5 max-h-[70vh]">
              {/* Customer Selector */}
              <div className="p-3 border border-amber-200 rounded-2xl bg-[#FFFBF7]">
                <label className="text-xs font-black text-purple-950 block mb-1.5">
                  👤 اختيار العميل أو البيع المباشر:
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => {
                    setSelectedCustomerId(e.target.value);
                    if (!e.target.value) setPaymentMethod('CASH');
                  }}
                  className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-xs font-black text-purple-950 outline-none"
                >
                  <option value="">زبون عادي (دفع نقدي مباشر بدون اسم)</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameAr} ({c.phone || 'بدون هاتف'}) {c.totalDebt > 0 ? `- دين: ${c.totalDebt} د.ج` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cart Items List */}
              <div className="space-y-2">
                {cart.length === 0 ? (
                  <div className="text-center p-6 text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl">
                    سلة البيع فارغة حالياً. اضغط على المنتجات لإضافتها!
                  </div>
                ) : (
                  cart.map((item) => {
                    const itemKey = getItemKey(item);
                    const unitPrice = item.selectedVariant ? item.selectedVariant.price : item.product.sellingPrice;
                    return (
                      <div key={itemKey} className="p-3 bg-[#FFFBF7] rounded-2xl border border-purple-100 flex items-center justify-between gap-2 shadow-2xs">
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-black text-purple-950 truncate">{item.product.nameAr}</h5>
                          {item.selectedVariant && (
                            <span className="inline-block bg-amber-200 text-purple-950 text-[10px] font-black px-1.5 py-0.5 rounded-md mt-0.5">
                              {item.selectedVariant.nameAr}
                            </span>
                          )}
                          <div className="text-[11px] font-mono text-slate-600 mt-0.5 font-bold">
                            {unitPrice.toLocaleString()} د.ج × {item.quantity} = <span className="font-black text-rose-600">{(unitPrice * item.quantity).toLocaleString()} د.ج</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 bg-white rounded-xl border border-purple-100 p-1">
                          <button onClick={() => updateQuantity(itemKey, -1)} className="p-1 text-purple-950">
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-black px-1.5">{item.quantity}</span>
                          <button onClick={() => updateQuantity(itemKey, 1)} className="p-1 text-purple-950">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button onClick={() => removeFromCart(itemKey)} className="p-1 text-rose-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Payment Method Selector */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => setPaymentMethod('CASH')}
                  className={`py-3 px-3 rounded-xl text-xs font-black border flex items-center justify-center gap-1.5 cursor-pointer ${
                    paymentMethod === 'CASH'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                      : 'bg-white text-purple-950 border-purple-100'
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                  <span>دفع نقداً (كاش)</span>
                </button>

                <button
                  onClick={() => {
                    if (!selectedCustomerId) {
                      showToast('⚠️ يجب اختيار اسم عميل مسجل لتسجيل البيع بالدين');
                      return;
                    }
                    setPaymentMethod('CREDIT');
                  }}
                  className={`py-3 px-3 rounded-xl text-xs font-black border flex items-center justify-center gap-1.5 cursor-pointer ${
                    paymentMethod === 'CREDIT'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                      : 'bg-white text-purple-950 border-purple-100'
                  } ${!selectedCustomerId ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Tag className="w-4 h-4" />
                  <span>بيع بالدين</span>
                </button>
              </div>

              {/* Total & Checkout */}
              <div className="bg-purple-950 text-white p-4 rounded-2xl space-y-3">
                <div className="flex justify-between items-center text-xs font-black">
                  <span>المجموع النهائي للفاتورة:</span>
                  <span className="text-amber-300 text-base font-mono font-black">{grandTotal.toLocaleString()} د.ج</span>
                </div>

                <button
                  onClick={() => {
                    handleCheckout();
                    setIsMobileCartOpen(false);
                  }}
                  disabled={cart.length === 0 || isCheckoutLoading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white font-black text-xs shadow-lg hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isCheckoutLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>إتمام البيع واستخراج الفاتورة ({grandTotal.toLocaleString()} د.ج) ✨</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



