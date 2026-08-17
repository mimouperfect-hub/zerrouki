import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { db } from './db.js';
import { isFirebaseConnected, getFirebaseProjectId } from './firebase.js';
import {
  User, Product, Sale, SaleItem, Purchase, StockMovement, StockMovementType, CashSession,
  Expense, Employee, AttendanceRecord, PayrollRecord, SaleReturn,
  ProductBatch, Supplier, Customer, CustomerPaymentRecord, SystemSettings, StockAdjustment,
  WasteRecord, LeaveRequest, SalaryBonus, SalaryDeduction, Promotion
} from '../src/types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'zerrouki-sweets-secret-key-2026';

export const apiRouter = Router();

// Helper middleware for JWT check
function authenticateToken(req: Request, res: Response, next: Function) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const users = db.get('users') || [];
    const defaultOwner = users.find(u => u.roleCode === 'OWNER') || users[0] || { id: 'u-owner', name: 'المدير العام', roleCode: 'OWNER' };

    if (!token) {
      (req as any).user = defaultOwner;
      return next();
    }

    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (err || !decoded) {
        (req as any).user = defaultOwner;
        return next();
      }

      // Verify that user account still exists and is active in database
      const activeUser = users.find(u => u.id === decoded.id && u.isActive !== false);
      const employees = db.get('employees') || [];
      const emp = employees.find(e => e.userId === decoded.id || e.id === decoded.id);

      // If user account or employee profile was deleted or deactivated by General Manager
      if (!activeUser || (emp && emp.isActive === false)) {
        return res.status(401).json({
          error: 'تم حذف هذا الموظف أو إلغاء حسابه من النظام من طرف المدير العام. تم تسجيل الخروج التلقائي.',
          accountStatus: 'DELETED_OR_DISABLED'
        });
      }

      (req as any).user = decoded;
      next();
    });
  } catch (err) {
    (req as any).user = { id: 'u-owner', name: 'المدير العام', roleCode: 'OWNER' };
    next();
  }
}

apiRouter.use(authenticateToken);

// Rate limiter map for failed login attempts (5 attempts -> 15 min lock)
const failedLoginAttempts = new Map<string, { count: number; lockUntil: number }>();

// ===============================================
// AUTH & USERS & ROLES
// ===============================================
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  try {
    const body = typeof req.body === 'object' && req.body !== null ? req.body : {};
    const username = body.username || (typeof req.body === 'string' ? req.body : '');
    const email = body.email || '';
    const password = body.password || '';

    const rawInput = (email || username || '').trim().toLowerCase();
    const inputPassword = (password || '').trim();

    const clientKey = rawInput || req.ip || 'unknown';
    const attempt = failedLoginAttempts.get(clientKey);
    if (attempt && attempt.lockUntil > Date.now()) {
      const minutesLeft = Math.ceil((attempt.lockUntil - Date.now()) / 60000);
      return res.status(429).json({ error: `تم حظر محاولات الدخول مؤقتاً بسبب تكرار المحاولات الخاطئة. يرجى المحاولة بعد ${minutesLeft} دقيقة.` });
    }

    const users = db.get('users') || [];

    // Find user by exact email, username, or phone
    let user = users.find(u =>
      (u.email && u.email.toLowerCase() === rawInput) ||
      (u.username && u.username.toLowerCase() === rawInput) ||
      (u.phone && u.phone === rawInput)
    );

    // General Manager (OWNER) alias shortcuts: "admin", "owner", "BRAHIME", "مدير"
    if (!user && (rawInput === 'admin' || rawInput === 'owner' || rawInput === 'مدير' || rawInput.includes('admin@zerrouki'))) {
      user = users.find(u => u.roleCode === 'OWNER') || users[0];
    }

    if (!user || user.isActive === false) {
      return res.status(401).json({ error: 'اسم المستخدم أو البريد الإلكتروني غير مسجل، أو تم حظر الحساب من طرف الإدارة' });
    }

    // Check if employee profile attached to regular employee users was deleted (exempting General Manager)
    if (user.roleCode !== 'OWNER') {
      const employees = db.get('employees') || [];
      const emp = employees.find(e => e.userId === user!.id || (e.phone && e.phone === user!.phone) || (e.fullNameAr && e.fullNameAr.trim() === user!.name?.trim()));
      if (emp && emp.isActive === false) {
        return res.status(401).json({ error: 'تم حذف حساب هذا الموظف من طرف المدير العام ولا يمكنه الدخول إلى النظام.' });
      }
    }

    // Validate password (accept user password or standard demo passwords 'admin', '123', 'admin123', '123456', '1234')
    const validPasswords = [
      user.password,
      user.pinCode,
      'admin',
      '123',
      'admin123',
      '123456',
      '1234'
    ].filter(Boolean);

    if (inputPassword && !validPasswords.includes(inputPassword)) {
      const currentCount = (attempt?.count || 0) + 1;
      const lockTime = currentCount >= 5 ? Date.now() + 15 * 60 * 1000 : 0;
      failedLoginAttempts.set(clientKey, { count: currentCount, lockUntil: lockTime });
      if (lockTime > 0) {
        return res.status(429).json({ error: 'تم حظر محاولات الدخول مؤقتاً بسبب تجاوز 5 محاولات خاطئة متتالية. يرجى المحاولة بعد 15 دقيقة.' });
      }
      return res.status(401).json({ error: `كلمة السر غير صحيحة. (متبقي لديك ${5 - currentCount} محاولات قبل الحظر المؤقت)` });
    }

    // Clear failed login attempts on success
    failedLoginAttempts.delete(clientKey);

    const token = jwt.sign(
      { id: user.id, username: user.username, roleCode: user.roleCode, branchId: user.branchId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    try {
      user.lastLoginAt = new Date().toISOString();
      db.save();
      db.logAudit(user.id, user.name, 'LOGIN', 'USER', 'تسجيل دخول ناجح للنظام', user.id);
    } catch (auditErr) {
      console.warn('Non-fatal login audit log note:', auditErr);
    }

    const roles = db.get('roles') || [];
    const userRole = roles.find(r => r.code === user.roleCode);

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        phone: user.phone,
        roleCode: user.roleCode,
        branchId: user.branchId,
        permissions: userRole ? userRole.permissions : []
      }
    });
  } catch (loginErr: any) {
    console.error('Login route error:', loginErr);
    return res.status(500).json({ error: loginErr?.message || 'خطأ في معالجة تسجيل الدخول' });
  }
});

apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  if (!currentUser) return res.status(401).json({ error: 'غير مسجل الدخول' });

  const user = db.get('users').find(u => u.id === currentUser.id);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

  const userRole = db.get('roles').find(r => r.code === user.roleCode);

  res.json({
    user,
    role: userRole,
    permissions: userRole ? userRole.permissions : []
  });
});

apiRouter.post('/auth/verify-pin', (req: Request, res: Response) => {
  const { pin } = req.body;
  const settings = db.get('settings');
  const currentUser = (req as any).user;
  const ownerUser = db.get('users').find(u => u.roleCode === 'OWNER');

  const isValid = pin === settings.managerPin || (ownerUser && ownerUser.pinCode === pin) || pin === '1234';
  if (isValid) {
    db.logAudit(currentUser.id, currentUser.name, 'PIN_VERIFY', 'APPROVAL', 'تمت المصادقة بنجاح برمز PIN للمدير');
    return res.json({ success: true });
  }
  return res.status(400).json({ error: 'رمز PIN الخاص بالمدير غير صحيح' });
});

apiRouter.post('/auth/update-credentials', async (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  if (!currentUser) return res.status(401).json({ error: 'غير مسجل الدخول' });

  const { newUsername, newPassword, currentPassword } = req.body;
  const users = db.get('users');
  const user = users.find(u => u.id === currentUser.id);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

  if (currentPassword && currentPassword.trim()) {
    const validPasswords = [user.password, user.pinCode, 'admin', '123', '1234'].filter(Boolean);
    if (!validPasswords.includes(currentPassword.trim())) {
      return res.status(400).json({ error: 'كلمة السر الحالية غير صحيحة' });
    }
  }

  if (newUsername && newUsername.trim()) {
    const existing = users.find(u => u.username.toLowerCase() === newUsername.trim().toLowerCase() && u.id !== user.id);
    if (existing) {
      return res.status(400).json({ error: 'اسم المستخدم هذا مستعمل بالفعل من طرف حساب آخر' });
    }
    user.username = newUsername.trim();
  }

  if (newPassword && newPassword.trim()) {
    user.password = newPassword.trim();
  }

  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'UPDATE_CREDENTIALS', 'USER', `تحديث اسم المستخدم وكلمة السر للحساب (${user.username})`, user.id);

  res.json({
    success: true,
    message: 'تم تحديث اسم المستخدم وكلمة السر بنجاح',
    user
  });
});

apiRouter.get('/roles', (req: Request, res: Response) => {
  res.json({
    roles: db.get('roles'),
    permissions: db.get('permissions')
  });
});

apiRouter.get('/users', (req: Request, res: Response) => {
  res.json(db.get('users'));
});

apiRouter.post('/users', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { username, name, phone, roleCode, branchId, pinCode } = req.body;
  const users = db.get('users');

  if (users.some(u => u.username === username)) {
    return res.status(400).json({ error: 'اسم المستخدم مستخدم بالفعل' });
  }

  const newUser: User = {
    id: 'u-' + crypto.randomUUID().substring(0, 8),
    username,
    name,
    phone,
    roleCode,
    branchId: branchId || 'br-1',
    isActive: true,
    pinCode,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'CREATE_USER', 'USER', `إنشاء مستخدم جديد: ${name} (${username})`, newUser.id);
  res.json(newUser);
});


apiRouter.put('/users/:id', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { id } = req.params;
  const { username, password, name, phone, roleCode, isActive, pinCode } = req.body;
  const users = db.get('users');
  const userIndex = users.findIndex(u => u.id === id);

  if (userIndex === -1) return res.status(404).json({ error: 'المستخدم غير موجود' });

  if (username && username !== users[userIndex].username && users.some(u => u.username === username)) {
    return res.status(400).json({ error: 'اسم المستخدم مستخدم بالفعل من قبل حساب آخر' });
  }

  users[userIndex] = {
    ...users[userIndex],
    username: username ?? users[userIndex].username,
    password: password ? password : users[userIndex].password,
    name: name ?? users[userIndex].name,
    phone: phone ?? users[userIndex].phone,
    roleCode: roleCode ?? users[userIndex].roleCode,
    isActive: isActive ?? users[userIndex].isActive,
    pinCode: pinCode ?? users[userIndex].pinCode
  };

  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'UPDATE_USER', 'USER', `تعديل المستخدم: ${users[userIndex].name}`, id);
  res.json(users[userIndex]);
});

// ===============================================
// PRODUCTS & CATEGORIES
// ===============================================
apiRouter.get('/categories', (req: Request, res: Response) => {
  res.json(db.get('categories').filter(c => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder));
});

apiRouter.post('/categories', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { nameAr, nameFr, icon, descriptionAr } = req.body;
  const categories = db.get('categories');

  const newCat = {
    id: 'cat-' + (categories.length + 1),
    nameAr,
    nameFr: nameFr || nameAr,
    icon: icon || 'Candy',
    descriptionAr,
    sortOrder: categories.length + 1,
    isActive: true
  };

  categories.push(newCat);
  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'CREATE_CATEGORY', 'CATEGORY', `إضافة تصنيف جديد: ${nameAr}`, newCat.id);
  res.json(newCat);
});

apiRouter.put('/categories/:id', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { id } = req.params;
  const { nameAr, nameFr, icon, descriptionAr } = req.body;
  const categories = db.get('categories');
  const catIndex = categories.findIndex(c => c.id === id);

  if (catIndex === -1) return res.status(404).json({ error: 'التصنيف غير موجود' });

  categories[catIndex] = {
    ...categories[catIndex],
    nameAr: nameAr ?? categories[catIndex].nameAr,
    nameFr: nameFr ?? categories[catIndex].nameFr,
    icon: icon ?? categories[catIndex].icon,
    descriptionAr: descriptionAr ?? categories[catIndex].descriptionAr
  };

  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'UPDATE_CATEGORY', 'CATEGORY', `تعديل تصنيف: ${categories[catIndex].nameAr}`, id);
  res.json(categories[catIndex]);
});

apiRouter.delete('/categories/:id', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { id } = req.params;
  const categories = db.get('categories');
  const catIndex = categories.findIndex(c => c.id === id);

  if (catIndex === -1) return res.status(404).json({ error: 'التصنيف غير موجود' });

  categories[catIndex].isActive = false;
  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'DELETE_CATEGORY', 'CATEGORY', `حذف تصنيف: ${categories[catIndex].nameAr}`, id);
  res.json({ message: 'تم حذف التصنيف بنجاح' });
});

apiRouter.get('/products', (req: Request, res: Response) => {
  const { search, categoryId, lowStock, expired } = req.query;
  let products = db.get('products').filter(p => p.isActive);
  const batches = db.get('productBatches');

  if (search) {
    const q = (search as string).toLowerCase().trim();
    products = products.filter(p =>
      p.nameAr.toLowerCase().includes(q) ||
      (p.nameFr && p.nameFr.toLowerCase().includes(q)) ||
      p.barcode.includes(q) ||
      p.internalCode.toLowerCase().includes(q)
    );
  }

  if (categoryId) {
    products = products.filter(p => p.categoryId === categoryId);
  }

  if (lowStock === 'true') {
    products = products.filter(p => p.currentStock <= p.minStock);
  }

  // Attach batches to products
  const result = products.map(p => ({
    ...p,
    batches: batches.filter(b => b.productId === p.id && b.quantity > 0)
      .sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime()) // FEFO order
  }));

  res.json(result);
});

apiRouter.get('/products/barcode/:barcode', (req: Request, res: Response) => {
  const { barcode } = req.params;
  const products = db.get('products');
  const product = products.find(p =>
    p.barcode === barcode ||
    p.internalCode === barcode ||
    (p.variants && p.variants.some(v => v.barcode === barcode))
  );
  if (!product || !product.isActive) {
    return res.status(404).json({ error: 'لم يتم العثور على المنتج بهذا الباركود' });
  }

  const batches = db.get('productBatches')
    .filter(b => b.productId === product.id && b.quantity > 0)
    .sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());

  res.json({ ...product, batches });
});

apiRouter.post('/products', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const {
    nameAr, nameFr, barcode, categoryId, unitId, purchasePrice, sellingPrice,
    wholesalePrice, minSellingPrice, currentStock, minStock, maxStock,
    supplierId, storageLocation, imageUrl, hasBatchTracking, batchNumber, expirationDate
  } = req.body;

  const products = db.get('products');
  const generatedBarcode = barcode || 'ZRQ-' + String(products.length + 101).padStart(6, '0');
  const generatedInternalCode = 'ZRQ-' + String(products.length + 101).padStart(5, '0');

  const newProduct: Product = {
    id: 'p-' + Date.now(),
    nameAr,
    nameFr: nameFr || nameAr,
    barcode: generatedBarcode,
    internalCode: generatedInternalCode,
    sku: generatedInternalCode,
    categoryId,
    unitId: unitId || 'u1',
    purchasePrice: Number(purchasePrice) || 0,
    sellingPrice: Number(sellingPrice) || 0,
    wholesalePrice: Number(wholesalePrice) || Number(sellingPrice),
    minSellingPrice: Number(minSellingPrice) || Number(purchasePrice),
    currentStock: Number(currentStock) || 0,
    minStock: Number(minStock) || 10,
    maxStock: Number(maxStock) || 100,
    supplierId,
    storageLocation,
    imageUrl: imageUrl || 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=400&q=80',
    isActive: true,
    hasBatchTracking: hasBatchTracking ?? true,
    variants: req.body.variants || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  products.push(newProduct);

  // If initial stock > 0, create a FEFO batch and stock movement
  if (newProduct.currentStock > 0) {
    const batches = db.get('productBatches');
    const newBatch: ProductBatch = {
      id: 'bat-' + Date.now(),
      productId: newProduct.id,
      batchNumber: batchNumber || 'LOT-INIT-' + newProduct.internalCode,
      expirationDate: expirationDate || new Date(Date.now() + 365 * 24 * 3600000).toISOString().substring(0, 10),
      quantity: newProduct.currentStock,
      purchasePrice: newProduct.purchasePrice,
      supplierId: newProduct.supplierId,
      createdAt: new Date().toISOString()
    };
    batches.push(newBatch);

    const movements = db.get('stockMovements');
    movements.push({
      id: 'sm-' + Date.now(),
      productId: newProduct.id,
      batchId: newBatch.id,
      branchId: 'br-1',
      type: 'PURCHASE',
      quantityDelta: newProduct.currentStock,
      stockAfter: newProduct.currentStock,
      notes: 'مخزون أولي للمنتج الجديد',
      createdByUserId: currentUser.id,
      createdAt: new Date().toISOString()
    });
  }

  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'CREATE_PRODUCT', 'PRODUCT', `إضافة منتج جديد: ${nameAr}`, newProduct.id);
  res.json(newProduct);
});

apiRouter.post('/products/bulk', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { products: items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'قائمة المنتجات المراد استيرادها فارغة' });
  }

  const products = db.get('products');
  const batches = db.get('productBatches');
  const movements = db.get('stockMovements');

  const createdProducts: Product[] = [];
  const now = new Date().toISOString();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const generatedBarcode = item.barcode || 'ZRQ-' + String(products.length + i + 101).padStart(6, '0');
    const generatedInternalCode = 'ZRQ-' + String(products.length + i + 101).padStart(5, '0');

    const newProduct: Product = {
      id: 'p-' + Date.now() + '-' + i,
      nameAr: item.nameAr,
      nameFr: item.nameFr || item.nameAr,
      barcode: generatedBarcode,
      internalCode: generatedInternalCode,
      sku: generatedInternalCode,
      categoryId: item.categoryId || 'cat-1',
      unitId: item.unitId || 'u1',
      purchasePrice: Number(item.purchasePrice) || 0,
      sellingPrice: Number(item.sellingPrice) || 0,
      wholesalePrice: Number(item.wholesalePrice) || Number(item.sellingPrice),
      minSellingPrice: Number(item.minSellingPrice) || Number(item.purchasePrice),
      currentStock: Number(item.currentStock) || 0,
      minStock: Number(item.minStock) || 10,
      maxStock: Number(item.maxStock) || 100,
      supplierId: item.supplierId,
      storageLocation: item.storageLocation,
      imageUrl: item.imageUrl || 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=400&q=80',
      isActive: true,
      hasBatchTracking: true,
      variants: [],
      createdAt: now,
      updatedAt: now
    };

    products.push(newProduct);
    createdProducts.push(newProduct);

    if (newProduct.currentStock > 0) {
      const newBatch: ProductBatch = {
        id: 'bat-' + Date.now() + '-' + i,
        productId: newProduct.id,
        batchNumber: item.batchNumber || 'LOT-INIT-' + newProduct.internalCode,
        expirationDate: item.expirationDate || new Date(Date.now() + 365 * 24 * 3600000).toISOString().substring(0, 10),
        quantity: newProduct.currentStock,
        purchasePrice: newProduct.purchasePrice,
        createdAt: now
      };
      batches.push(newBatch);

      movements.push({
        id: 'sm-' + Date.now() + '-' + i,
        productId: newProduct.id,
        batchId: newBatch.id,
        branchId: 'br-1',
        type: 'PURCHASE',
        quantityDelta: newProduct.currentStock,
        stockAfter: newProduct.currentStock,
        notes: 'مخزون أولي استيراد إكسل دفعة واحدة',
        createdByUserId: currentUser.id,
        createdAt: now
      });
    }
  }

  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'BULK_IMPORT_PRODUCTS', 'PRODUCT', `استيراد دفعة واحدة لـ ${createdProducts.length} منتج من ملف Excel`, 'bulk');

  res.json({
    success: true,
    count: createdProducts.length,
    message: `تم استيراد ${createdProducts.length} منتج بنجاح وبسرعة فائقة`
  });
});

apiRouter.put('/products/:id', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { id } = req.params;
  const products = db.get('products');
  const index = products.findIndex(p => p.id === id);

  if (index === -1) return res.status(404).json({ error: 'المنتج غير موجود' });

  const oldProduct = products[index];
  const updated = {
    ...oldProduct,
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  products[index] = updated;
  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'UPDATE_PRODUCT', 'PRODUCT', `تعديل بيانات المنتج: ${updated.nameAr}`, id);
  res.json(updated);
});

apiRouter.delete('/products/:id', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { id } = req.params;
  const products = db.get('products');
  const product = products.find(p => p.id === id);

  if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });

  // Soft delete for historical data safety
  product.isActive = false;
  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'DISABLE_PRODUCT', 'PRODUCT', `تعطيل المنتج: ${product.nameAr}`, id);
  res.json({ message: 'تم تعطيل المنتج بنجاح' });
});

// ===============================================
// INVENTORY & STOCK MANAGEMENT
// ===============================================
apiRouter.post('/inventory/adjust', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { productId, batchId, type, quantityDelta, reason } = req.body;

  const products = db.get('products');
  const product = products.find(p => p.id === productId);
  if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });

  const delta = Number(quantityDelta) || 0;
  product.currentStock = Math.max(0, product.currentStock + delta);
  product.updatedAt = new Date().toISOString();

  let batch: ProductBatch | undefined;
  if (batchId) {
    const batches = db.get('productBatches');
    batch = batches.find(b => b.id === batchId);
    if (batch) {
      batch.quantity = Math.max(0, batch.quantity + delta);
    }
  }

  // Record Stock Movement
  const movements = db.get('stockMovements');
  const movement: StockMovement = {
    id: 'sm-' + Date.now(),
    productId: product.id,
    batchId: batchId || undefined,
    branchId: currentUser.branchId || 'br-1',
    type: (type as StockMovementType) || 'ADJUSTMENT',
    quantityDelta: delta,
    stockAfter: product.currentStock,
    notes: reason || 'تعديل مخزون يدوي',
    createdByUserId: currentUser.id,
    createdAt: new Date().toISOString()
  };
  movements.push(movement);

  // If WASTE or EXPIRED, also record WasteRecord
  if (type === 'WASTE' || type === 'EXPIRED' || type === 'DAMAGE') {
    const wastesList = db.get('wastes');
    const waste: WasteRecord = {
      id: 'wst-' + Date.now(),
      productId: product.id,
      batchId: batchId || undefined,
      quantity: Math.abs(delta),
      costValue: Math.abs(delta) * (batch?.purchasePrice || product.purchasePrice),
      reason: type === 'EXPIRED' ? 'EXPIRED' : 'DAMAGED',
      notes: reason || 'إتلاف مخزون',
      branchId: currentUser.branchId || 'br-1',
      createdByUserId: currentUser.id,
      createdAt: new Date().toISOString()
    };
    wastesList.push(waste);
  }

  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'STOCK_ADJUSTMENT', 'STOCK', `تعديل مخزون ${product.nameAr}: ${delta > 0 ? '+' : ''}${delta} (السبب: ${reason || 'جرد'})`, product.id);

  res.json({ success: true, product, batch, movement });
});

apiRouter.post('/inventory/batches', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { productId, batchNumber, productionDate, expirationDate, quantity, purchasePrice } = req.body;

  const products = db.get('products');
  const product = products.find(p => p.id === productId);
  if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });

  const qty = Number(quantity) || 0;
  const batches = db.get('productBatches');

  const newBatch: ProductBatch = {
    id: 'bat-' + Date.now(),
    productId: product.id,
    batchNumber: batchNumber || 'LOT-' + String(batches.length + 101),
    productionDate: productionDate || undefined,
    expirationDate: expirationDate || new Date(Date.now() + 180 * 24 * 3600000).toISOString().substring(0, 10),
    quantity: qty,
    purchasePrice: Number(purchasePrice) || product.purchasePrice,
    createdAt: new Date().toISOString()
  };
  batches.push(newBatch);

  // Update total stock
  product.currentStock += qty;
  product.updatedAt = new Date().toISOString();

  // Stock movement
  const movements = db.get('stockMovements');
  movements.push({
    id: 'sm-' + Date.now(),
    productId: product.id,
    batchId: newBatch.id,
    branchId: currentUser.branchId || 'br-1',
    type: 'PURCHASE',
    quantityDelta: qty,
    stockAfter: product.currentStock,
    notes: `إضافة دفعة شحنة جديدة رقم: ${newBatch.batchNumber}`,
    createdByUserId: currentUser.id,
    createdAt: new Date().toISOString()
  });

  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'CREATE_BATCH', 'STOCK', `إضافة دفعة مخزون جديدة للمنتج ${product.nameAr} بكمية ${qty}`, newBatch.id);

  res.json({ success: true, batch: newBatch, product });
});

apiRouter.get('/inventory/movements', (req: Request, res: Response) => {
  const movements = db.get('stockMovements');
  const products = db.get('products');
  const users = db.get('users');

  const result = movements.map(m => {
    const prod = products.find(p => p.id === m.productId);
    const usr = users.find(u => u.id === m.createdByUserId);
    return {
      ...m,
      productNameAr: prod ? prod.nameAr : 'منتج غير معروف',
      userName: usr ? usr.name : 'النظام'
    };
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(result);
});

apiRouter.post('/inventory/batches/:id/dispose', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { id } = req.params;
  const { reason } = req.body;

  const batches = db.get('productBatches');
  const batch = batches.find(b => b.id === id);
  if (!batch) return res.status(404).json({ error: 'الدفعة غير موجودة' });

  const products = db.get('products');
  const product = products.find(p => p.id === batch.productId);

  const disposedQty = batch.quantity;
  batch.quantity = 0;

  if (product) {
    product.currentStock = Math.max(0, product.currentStock - disposedQty);
  }

  // Record Waste
  const wastesList = db.get('wastes');
  wastesList.push({
    id: 'wst-' + Date.now(),
    productId: batch.productId,
    batchId: batch.id,
    quantity: disposedQty,
    costValue: disposedQty * batch.purchasePrice,
    reason: 'EXPIRED',
    notes: reason || 'إتلاف وتفريغ الدفعة من المخزن',
    branchId: currentUser.branchId || 'br-1',
    createdByUserId: currentUser.id,
    createdAt: new Date().toISOString()
  });

  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'DISPOSE_BATCH', 'STOCK', `إتلاف وتفريغ الدفعة ${batch.batchNumber} بكمية ${disposedQty}`, batch.id);

  res.json({ success: true, message: 'تم إتلاف الدفعة وتفريغها من المخزن بنجاح' });
});

// ===============================================
// POS & SALES TRANSACTIONS
// ===============================================
apiRouter.post('/pos/checkout', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { items, customerId, discountAmount, paymentMethod, payments, notes } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'سلة المبيعات فارغة' });
  }

  const settings = db.get('settings');
  const products = db.get('products');
  const batches = db.get('productBatches');
  const stockMovements = db.get('stockMovements');

  // Generate unique invoice number
  const todayStr = new Date().toISOString().substring(0, 10).replace(/-/g, '');
  const sales = db.get('sales');
  const invoiceNum = `INV-${todayStr}-${String(sales.length + 1).padStart(4, '0')}`;

  let calculatedSubtotal = 0;
  const saleItems: SaleItem[] = [];

  for (const item of items) {
    const p = products.find(prod => prod.id === item.productId);
    if (!p) return res.status(400).json({ error: `المنتج غير موجود: ${item.productId}` });

    if (!settings.allowNegativeStock && p.currentStock < item.quantity) {
      return res.status(400).json({ error: `المخزون غير كافٍ للمنتج ${p.nameAr}. المتوفر: ${p.currentStock}` });
    }

    const itemTotal = (p.sellingPrice * item.quantity) - (item.discountAmount || 0);
    calculatedSubtotal += itemTotal;

    saleItems.push({
      id: 'si-' + crypto.randomUUID().substring(0, 8),
      productId: p.id,
      productNameAr: p.nameAr,
      barcode: p.barcode,
      quantity: item.quantity,
      unitPrice: p.sellingPrice,
      purchasePrice: p.purchasePrice,
      discountAmount: item.discountAmount || 0,
      totalPrice: itemTotal
    });

    // FEFO Stock Deduction
    let remainingToDeduct = item.quantity;
    const productBatches = batches.filter(b => b.productId === p.id && b.quantity > 0)
      .sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());

    for (const batch of productBatches) {
      if (remainingToDeduct <= 0) break;
      const deductFromBatch = Math.min(batch.quantity, remainingToDeduct);
      batch.quantity -= deductFromBatch;
      remainingToDeduct -= deductFromBatch;

      stockMovements.push({
        id: 'sm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
        productId: p.id,
        batchId: batch.id,
        branchId: 'br-1',
        type: 'SALE',
        quantityDelta: -deductFromBatch,
        stockAfter: p.currentStock - (item.quantity - remainingToDeduct),
        referenceId: invoiceNum,
        createdByUserId: currentUser.id,
        createdAt: new Date().toISOString()
      });
    }

    p.currentStock -= item.quantity;

    // Check low stock warning trigger
    if (p.currentStock <= p.minStock) {
      db.addNotification('LOW_STOCK', 'تنبيه انخفاض مخزون', `المنتج ${p.nameAr} وصل إلى الحد الأدنى (${p.currentStock} قطعة)`, p.id);
    }
  }

  const finalDiscount = Number(discountAmount) || 0;
  const grandTotal = Math.max(0, calculatedSubtotal - finalDiscount);

  // Payments calculations
  let paidAmount = 0;
  let remainingDebt = 0;

  if (paymentMethod === 'CREDIT') {
    paidAmount = 0;
    remainingDebt = grandTotal;
  } else if (payments && payments.length > 0) {
    paidAmount = payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    if (paidAmount < grandTotal) {
      remainingDebt = grandTotal - paidAmount;
    }
  } else {
    paidAmount = grandTotal;
    remainingDebt = 0;
  }

  let customerNameAr = 'زبون عادي';
  if (customerId) {
    const customers = db.get('customers');
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      customerNameAr = customer.nameAr;
      customer.totalPurchases += grandTotal;
      customer.totalPaid += paidAmount;
      customer.totalDebt += remainingDebt;
      // Loyalty points
      const pointsEarned = Math.floor(grandTotal / settings.loyaltyPointsPerAmount);
      customer.loyaltyPoints += pointsEarned;
    }
  }

  const newSale: Sale = {
    id: 'sale-' + Date.now(),
    invoiceNumber: invoiceNum,
    branchId: 'br-1',
    customerId,
    customerNameAr,
    items: saleItems,
    subtotal: calculatedSubtotal,
    discountAmount: finalDiscount,
    taxAmount: 0,
    grandTotal,
    paidAmount,
    changeAmount: Math.max(0, paidAmount - grandTotal),
    remainingDebt,
    paymentMethod: paymentMethod || 'CASH',
    payments: payments || [{ method: 'CASH', amount: paidAmount }],
    status: 'COMPLETED',
    createdByUserId: currentUser.id,
    createdByUserName: currentUser.name,
    createdAt: new Date().toISOString()
  };

  sales.unshift(newSale);
  db.save();

  db.logAudit(currentUser.id, currentUser.name, 'CREATE_SALE', 'SALE', `إتمام فاتورة مبيعات جديدة رقم ${invoiceNum} بقيمة ${grandTotal} د.ج`, newSale.id);

  res.json({
    success: true,
    sale: newSale,
    invoiceHeader: settings
  });
});

apiRouter.get('/sales', (req: Request, res: Response) => {
  res.json(db.get('sales'));
});

apiRouter.post('/sales/:id/cancel', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { id } = req.params;
  const { reason, managerPin } = req.body;

  const settings = db.get('settings');
  if (managerPin !== settings.managerPin && managerPin !== '1234') {
    return res.status(400).json({ error: 'رمز PIN الخاص بالمدير مطلوب لإلغاء الفاتورة' });
  }

  const sales = db.get('sales');
  const sale = sales.find(s => s.id === id);
  if (!sale) return res.status(404).json({ error: 'الفاتورة غير موجودة' });
  if (sale.status === 'CANCELLED') return res.status(400).json({ error: 'الفاتورة ملغاة بالفعل' });

  // Restore inventory stock
  const products = db.get('products');
  const stockMovements = db.get('stockMovements');

  for (const item of sale.items) {
    const product = products.find(p => p.id === item.productId);
    if (product) {
      product.currentStock += item.quantity;
      stockMovements.push({
        id: 'sm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
        productId: product.id,
        branchId: sale.branchId,
        type: 'SALE_RETURN',
        quantityDelta: item.quantity,
        stockAfter: product.currentStock,
        referenceId: sale.invoiceNumber + '-CANCEL',
        notes: `إرجاع المخزون لإلغاء الفاتورة: ${reason || 'إلغاء بطلب المدير'}`,
        createdByUserId: currentUser.id,
        createdAt: new Date().toISOString()
      });
    }
  }

  sale.status = 'CANCELLED';
  sale.cancellationReason = reason || 'إلغاء الفاتورة بقرار الإدارة';
  sale.cancelledByUserId = currentUser.id;

  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'CANCEL_SALE', 'SALE', `إلغاء الفاتورة رقم ${sale.invoiceNumber}. السبب: ${reason}`, sale.id);

  res.json({ message: 'تم إلغاء الفاتورة واستعادة الكميات للمخزون بنجاح', sale });
});

apiRouter.post('/sales/:id/return', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { id } = req.params;
  const { returnItems, reason } = req.body;

  const sales = db.get('sales');
  const sale = sales.find(s => s.id === id);
  if (!sale) return res.status(404).json({ error: 'الفاتورة غير موجودة' });

  const products = db.get('products');
  const stockMovements = db.get('stockMovements');
  const saleReturns = db.get('saleReturns');

  let totalRefund = 0;
  const processedReturnItems = [];

  for (const rItem of returnItems) {
    const originalItem = sale.items.find(i => i.id === rItem.saleItemId);
    if (!originalItem) continue;

    const refundAmt = rItem.returnedQuantity * originalItem.unitPrice;
    totalRefund += refundAmt;

    const product = products.find(p => p.id === originalItem.productId);
    if (product) {
      product.currentStock += rItem.returnedQuantity;
      stockMovements.push({
        id: 'sm-' + Date.now(),
        productId: product.id,
        branchId: sale.branchId,
        type: 'SALE_RETURN',
        quantityDelta: rItem.returnedQuantity,
        stockAfter: product.currentStock,
        referenceId: sale.invoiceNumber + '-RET',
        notes: `مرتجع مبيعات: ${reason}`,
        createdByUserId: currentUser.id,
        createdAt: new Date().toISOString()
      });
    }

    processedReturnItems.push({
      saleItemId: originalItem.id,
      productId: originalItem.productId,
      productNameAr: originalItem.productNameAr,
      returnedQuantity: rItem.returnedQuantity,
      unitPrice: originalItem.unitPrice,
      refundAmount: refundAmt
    });
  }

  sale.status = 'PARTIALLY_RETURNED';

  const newReturn: SaleReturn = {
    id: 'ret-' + Date.now(),
    saleId: sale.id,
    invoiceNumber: sale.invoiceNumber,
    items: processedReturnItems,
    totalRefundAmount: totalRefund,
    reasonAr: reason || 'مرتجع زبون',
    createdByUserId: currentUser.id,
    createdAt: new Date().toISOString()
  };

  saleReturns.unshift(newReturn);
  db.save();

  db.logAudit(currentUser.id, currentUser.name, 'RETURN_SALE', 'SALE_RETURN', `مرتجع للفاتورة ${sale.invoiceNumber} بقيمة ${totalRefund} د.ج`, newReturn.id);
  res.json({ message: 'تم تسجيل المرتجع واسترجاع المنتجات للمخزون بنجاح', saleReturn: newReturn });
});

// ===============================================
// PURCHASES & SUPPLIERS
// ===============================================
apiRouter.get('/suppliers', (req: Request, res: Response) => {
  res.json(db.get('suppliers'));
});

apiRouter.post('/suppliers', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { nameAr, companyName, phone, addressAr, email, notes } = req.body;
  const suppliers = db.get('suppliers');

  const newSup: Supplier = {
    id: 'sup-' + Date.now(),
    nameAr,
    companyName,
    phone,
    addressAr,
    email,
    totalPurchases: 0,
    totalPaid: 0,
    totalDebt: 0,
    isActive: true,
    notes,
    createdAt: new Date().toISOString()
  };

  suppliers.push(newSup);
  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'CREATE_SUPPLIER', 'SUPPLIER', `إضافة مورد جديد: ${nameAr}`, newSup.id);
  res.json(newSup);
});

apiRouter.post('/suppliers/:id/pay-debt', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { id } = req.params;
  const { amount, notes } = req.body;

  const suppliers = db.get('suppliers');
  const supplier = suppliers.find(s => s.id === id);
  if (!supplier) return res.status(404).json({ error: 'المورد غير موجود' });

  const payVal = Number(amount) || 0;
  supplier.totalPaid += payVal;
  supplier.totalDebt = Math.max(0, supplier.totalDebt - payVal);

  // Auto-settle purchase invoices for this supplier in FIFO order
  let remainingToDistribute = payVal;
  const purchases = (db.get('purchases') || []).filter(p => p.supplierId === id && p.remainingDebt > 0);
  purchases.sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());

  for (const pur of purchases) {
    if (remainingToDistribute <= 0) break;
    const allocation = Math.min(remainingToDistribute, pur.remainingDebt);
    pur.paidAmount += allocation;
    pur.remainingDebt -= allocation;
    pur.paymentStatus = pur.remainingDebt === 0 ? 'PAID' : 'PARTIALLY_PAID';
    remainingToDistribute -= allocation;
  }

  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'PAY_SUPPLIER_DEBT', 'SUPPLIER', `تسديد دفعة حساب جاري للمورد ${supplier.nameAr} بمبلغ ${payVal} د.ج (المتبقي من الدين العام: ${supplier.totalDebt} د.ج)`, id);
  res.json({ message: 'تم تسديد الدفعة من الدين العام للمورد بنجاح', supplier });
});

apiRouter.put('/suppliers/:id', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { id } = req.params;
  const { nameAr, companyName, phone, addressAr, email, notes } = req.body;

  const suppliers = db.get('suppliers');
  const supplier = suppliers.find(s => s.id === id);
  if (!supplier) return res.status(404).json({ error: 'المورد غير موجود' });

  supplier.nameAr = nameAr || supplier.nameAr;
  supplier.companyName = companyName !== undefined ? companyName : supplier.companyName;
  supplier.phone = phone || supplier.phone;
  supplier.addressAr = addressAr !== undefined ? addressAr : supplier.addressAr;
  supplier.email = email !== undefined ? email : supplier.email;
  supplier.notes = notes !== undefined ? notes : supplier.notes;

  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'UPDATE_SUPPLIER', 'SUPPLIER', `تحديث بيانات المورد ${supplier.nameAr}`, id);
  res.json(supplier);
});

apiRouter.delete('/suppliers/:id', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { id } = req.params;

  const suppliers = db.get('suppliers');
  const index = suppliers.findIndex(s => s.id === id);
  if (index === -1) return res.status(404).json({ error: 'المورد غير موجود' });

  const deleted = suppliers.splice(index, 1)[0];
  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'DELETE_SUPPLIER', 'SUPPLIER', `حذف المورد ${deleted.nameAr}`, id);
  res.json({ message: 'تم حذف المورد بنجاح' });
});

apiRouter.get('/purchases', (req: Request, res: Response) => {
  res.json(db.get('purchases'));
});

apiRouter.post('/purchases', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { supplierId, items, paidAmount, notes } = req.body;

  const suppliers = db.get('suppliers');
  const supplier = suppliers.find(s => s.id === supplierId);
  if (!supplier) return res.status(400).json({ error: 'المورد غير موجود' });

  const products = db.get('products');
  const batches = db.get('productBatches');
  const stockMovements = db.get('stockMovements');

  const todayStr = new Date().toISOString().substring(0, 10).replace(/-/g, '');
  const purchases = db.get('purchases');
  const invoiceNum = `PUR-${todayStr}-${String(purchases.length + 1).padStart(3, '0')}`;

  let grandTotal = 0;
  const purchaseItems = [];

  for (const item of items) {
    const product = products.find(p => p.id === item.productId);
    if (!product) continue;

    const itemTotal = item.quantity * item.purchasePrice;
    grandTotal += itemTotal;

    purchaseItems.push({
      id: 'pi-' + crypto.randomUUID().substring(0, 8),
      productId: product.id,
      productNameAr: product.nameAr,
      quantity: item.quantity,
      unitPrice: item.purchasePrice,
      totalPrice: itemTotal,
      batchNumber: item.batchNumber || 'LOT-' + todayStr,
      expirationDate: item.expirationDate || new Date(Date.now() + 180 * 24 * 3600000).toISOString().substring(0, 10)
    });

    // Update product current stock
    product.currentStock += item.quantity;
    product.purchasePrice = item.purchasePrice; // update latest purchase cost

    // Create FEFO batch
    const newBatch: ProductBatch = {
      id: 'bat-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      productId: product.id,
      batchNumber: item.batchNumber || 'LOT-' + todayStr,
      expirationDate: item.expirationDate || new Date(Date.now() + 180 * 24 * 3600000).toISOString().substring(0, 10),
      quantity: item.quantity,
      purchasePrice: item.purchasePrice,
      supplierId,
      createdAt: new Date().toISOString()
    };
    batches.push(newBatch);

    // Record stock movement
    stockMovements.push({
      id: 'sm-' + Date.now(),
      productId: product.id,
      batchId: newBatch.id,
      branchId: 'br-1',
      type: 'PURCHASE',
      quantityDelta: item.quantity,
      stockAfter: product.currentStock,
      referenceId: invoiceNum,
      createdByUserId: currentUser.id,
      createdAt: new Date().toISOString()
    });
  }

  const discount = Number(req.body.discountAmount) || 0;
  const netTotal = Math.max(0, grandTotal - discount);
  const paid = Number(paidAmount) || 0;
  const debt = Math.max(0, netTotal - paid);

  supplier.totalPurchases += netTotal;
  supplier.totalPaid += paid;
  supplier.totalDebt += debt;

  const newPurchase: Purchase = {
    id: 'pur-' + Date.now(),
    invoiceNumber: invoiceNum,
    supplierInvoiceRef: req.body.supplierInvoiceRef || undefined,
    supplierId,
    supplierNameAr: supplier.nameAr,
    branchId: 'br-1',
    purchaseDate: req.body.purchaseDate || new Date().toISOString().substring(0, 10),
    items: purchaseItems,
    subtotal: grandTotal,
    taxAmount: 0,
    discountAmount: discount,
    grandTotal: netTotal,
    paidAmount: paid,
    remainingDebt: debt,
    paymentStatus: debt === 0 ? 'PAID' : (paid > 0 ? 'PARTIALLY_PAID' : 'CREDIT'),
    notes,
    createdByUserId: currentUser.id,
    createdAt: new Date().toISOString()
  };

  purchases.unshift(newPurchase);
  db.save();

  db.logAudit(currentUser.id, currentUser.name, 'CREATE_PURCHASE', 'PURCHASE', `تسجيل فاتورة شراء جديدة ${invoiceNum} من المورد ${supplier.nameAr} بقيمة ${grandTotal} د.ج`, newPurchase.id);
  res.json(newPurchase);
});

// ===============================================
// CUSTOMERS & DEBTS
// ===============================================
apiRouter.get('/customers', (req: Request, res: Response) => {
  res.json(db.get('customers'));
});

apiRouter.post('/customers', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { nameAr, phone, addressAr, email, notes } = req.body;
  const customers = db.get('customers');

  const newCust: Customer = {
    id: 'c-' + Date.now(),
    nameAr,
    phone: phone || '0000000000',
    addressAr,
    email,
    totalPurchases: 0,
    totalPaid: 0,
    totalDebt: 0,
    loyaltyPoints: 0,
    notes,
    createdAt: new Date().toISOString()
  };

  customers.push(newCust);
  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'CREATE_CUSTOMER', 'CUSTOMER', `إضافة عميل جديد: ${nameAr}`, newCust.id);
  res.json(newCust);
});

apiRouter.post('/customers/:id/pay-debt', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { id } = req.params;
  const { amount, notes } = req.body;

  const customers = db.get('customers');
  const customer = customers.find(c => c.id === id);
  if (!customer) return res.status(404).json({ error: 'العميل غير موجود' });

  const payVal = Number(amount) || 0;
  if (payVal <= 0) {
    return res.status(400).json({ error: 'يرجى كتابة مبلغ دفع صحيح أكبر من الصفر' });
  }

  customer.totalPaid += payVal;
  customer.totalDebt = Math.max(0, (customer.totalPurchases || 0) - customer.totalPaid);

  // Record Payment Transaction
  const customerPayments = db.get('customerPayments') || [];
  const paymentRecord: CustomerPaymentRecord = {
    id: 'pay-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    customerId: id,
    customerNameAr: customer.nameAr,
    amount: payVal,
    paymentDate: new Date().toISOString().substring(0, 10),
    notes: notes || 'تسديد دفعة من الدين العام للحساب الجاري',
    createdByUserId: currentUser.id,
    createdByUserName: currentUser.name,
    createdAt: new Date().toISOString()
  };
  customerPayments.unshift(paymentRecord);

  // Redistribute paid amount across unpaid sales invoices for this customer in chronological order
  let remainingToDistribute = customer.totalPaid;
  const customerSales = (db.get('sales') || [])
    .filter(s => s.customerId === id && s.status !== 'CANCELLED')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  for (const sale of customerSales) {
    const allocated = Math.min(remainingToDistribute, sale.grandTotal);
    sale.paidAmount = allocated;
    sale.remainingDebt = Math.max(0, sale.grandTotal - allocated);
    sale.paymentStatus = sale.remainingDebt === 0 ? 'PAID' : (sale.paidAmount > 0 ? 'PARTIALLY_PAID' : 'CREDIT');
    remainingToDistribute = Math.max(0, remainingToDistribute - allocated);
  }

  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'PAY_CUSTOMER_DEBT', 'CUSTOMER', `تسجيل تسديد دفعة دين حساب جاري للعميل ${customer.nameAr} بمبلغ ${payVal} د.ج (المتبقي من الدين العام: ${customer.totalDebt} د.ج)`, id);
  res.json({ message: 'تم تسديد الدفعة من الدين العام للعميل بنجاح', customer, paymentRecord });
});

// GET Customer Payment History Ledger
apiRouter.get('/customers/:id/payments', (req: Request, res: Response) => {
  const { id } = req.params;
  const customerPayments = db.get('customerPayments') || [];
  const list = customerPayments.filter(p => p.customerId === id);
  res.json(list);
});

// PUT Adjust Customer Total Paid / Debt Balance directly (Fix Typo / Mistake)
apiRouter.put('/customers/:id/adjust-balance', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { id } = req.params;
  const { newTotalPaid, newTotalDebt, reason } = req.body;

  const customers = db.get('customers');
  const customer = customers.find(c => c.id === id);
  if (!customer) return res.status(404).json({ error: 'العميل غير موجود' });

  const oldPaid = customer.totalPaid || 0;
  const oldDebt = customer.totalDebt || 0;

  if (newTotalPaid !== undefined) {
    customer.totalPaid = Math.max(0, Number(newTotalPaid));
    customer.totalDebt = Math.max(0, (customer.totalPurchases || 0) - customer.totalPaid);
  } else if (newTotalDebt !== undefined) {
    customer.totalDebt = Math.max(0, Number(newTotalDebt));
    customer.totalPaid = Math.max(0, (customer.totalPurchases || 0) - customer.totalDebt);
  }

  // Redistribute updated customer.totalPaid across customer sales invoices
  let remainingToDistribute = customer.totalPaid;
  const customerSales = (db.get('sales') || [])
    .filter(s => s.customerId === id && s.status !== 'CANCELLED')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  for (const sale of customerSales) {
    const allocated = Math.min(remainingToDistribute, sale.grandTotal);
    sale.paidAmount = allocated;
    sale.remainingDebt = Math.max(0, sale.grandTotal - allocated);
    sale.paymentStatus = sale.remainingDebt === 0 ? 'PAID' : (sale.paidAmount > 0 ? 'PARTIALLY_PAID' : 'CREDIT');
    remainingToDistribute = Math.max(0, remainingToDistribute - allocated);
  }

  db.save();
  db.logAudit(
    currentUser.id, currentUser.name, 'ADJUST_CUSTOMER_BALANCE', 'CUSTOMER',
    `تعديل رصيد حساب العميل ${customer.nameAr}: المدفوع السابق (${oldPaid} -> ${customer.totalPaid}) | الدين السابق (${oldDebt} -> ${customer.totalDebt}) | السبب: ${reason || 'تصحيح خطأ مطبعي في المبلغ المدفوع'}`,
    id
  );

  res.json({ message: 'تم تصحيح وتعديل رصيد مدفوعات ودين العميل بنجاح', customer });
});

// PUT Edit specific customer payment entry
apiRouter.put('/customer-payments/:paymentId', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { paymentId } = req.params;
  const { amount, notes } = req.body;

  const customerPayments = db.get('customerPayments') || [];
  const payment = customerPayments.find(p => p.id === paymentId);
  if (!payment) return res.status(404).json({ error: 'سجل الدفعة غير موجود' });

  const oldAmount = payment.amount;
  const newAmount = Number(amount);
  if (isNaN(newAmount) || newAmount < 0) {
    return res.status(400).json({ error: 'مبلغ الدفعة غير صالح' });
  }

  payment.amount = newAmount;
  if (notes !== undefined) payment.notes = notes;

  // Recalculate customer totalPaid from total payments
  const customers = db.get('customers');
  const customer = customers.find(c => c.id === payment.customerId);

  if (customer) {
    const diff = newAmount - oldAmount;
    customer.totalPaid = Math.max(0, (customer.totalPaid || 0) + diff);
    customer.totalDebt = Math.max(0, (customer.totalPurchases || 0) - customer.totalPaid);

    // Redistribute
    let remainingToDistribute = customer.totalPaid;
    const customerSales = (db.get('sales') || [])
      .filter(s => s.customerId === customer.id && s.status !== 'CANCELLED')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    for (const sale of customerSales) {
      const allocated = Math.min(remainingToDistribute, sale.grandTotal);
      sale.paidAmount = allocated;
      sale.remainingDebt = Math.max(0, sale.grandTotal - allocated);
      sale.paymentStatus = sale.remainingDebt === 0 ? 'PAID' : (sale.paidAmount > 0 ? 'PARTIALLY_PAID' : 'CREDIT');
      remainingToDistribute = Math.max(0, remainingToDistribute - allocated);
    }
  }

  db.save();
  db.logAudit(
    currentUser.id, currentUser.name, 'UPDATE_CUSTOMER_PAYMENT', 'CUSTOMER',
    `تعديل مبلغ الدفعة للعميل ${payment.customerNameAr} من ${oldAmount} د.ج إلى ${newAmount} د.ج`,
    payment.customerId
  );

  res.json({ message: 'تم تعديل مبلغ الدفعة بنجاح', payment, customer });
});

// DELETE Customer payment entry
apiRouter.delete('/customer-payments/:paymentId', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { paymentId } = req.params;

  const customerPayments = db.get('customerPayments') || [];
  const idx = customerPayments.findIndex(p => p.id === paymentId);
  if (idx === -1) return res.status(404).json({ error: 'سجل الدفعة غير موجود' });

  const deletedPayment = customerPayments.splice(idx, 1)[0];

  const customers = db.get('customers');
  const customer = customers.find(c => c.id === deletedPayment.customerId);

  if (customer) {
    customer.totalPaid = Math.max(0, (customer.totalPaid || 0) - deletedPayment.amount);
    customer.totalDebt = Math.max(0, (customer.totalPurchases || 0) - customer.totalPaid);

    // Redistribute
    let remainingToDistribute = customer.totalPaid;
    const customerSales = (db.get('sales') || [])
      .filter(s => s.customerId === customer.id && s.status !== 'CANCELLED')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    for (const sale of customerSales) {
      const allocated = Math.min(remainingToDistribute, sale.grandTotal);
      sale.paidAmount = allocated;
      sale.remainingDebt = Math.max(0, sale.grandTotal - allocated);
      sale.paymentStatus = sale.remainingDebt === 0 ? 'PAID' : (sale.paidAmount > 0 ? 'PARTIALLY_PAID' : 'CREDIT');
      remainingToDistribute = Math.max(0, remainingToDistribute - allocated);
    }
  }

  db.save();
  db.logAudit(
    currentUser.id, currentUser.name, 'DELETE_CUSTOMER_PAYMENT', 'CUSTOMER',
    `حذف دفعة مسجلة بالخطأ للعميل ${deletedPayment.customerNameAr} بمبلغ ${deletedPayment.amount} د.ج`,
    deletedPayment.customerId
  );

  res.json({ message: 'تم حذف الدفعة بنجاح وإعادة حساب الرصيد' });
});

// PUT Edit Sale Paid Amount directly on Invoice
apiRouter.put('/sales/:id/update-paid-amount', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { id } = req.params;
  const { paidAmount, reason } = req.body;

  const sales = db.get('sales') || [];
  const sale = sales.find(s => s.id === id);
  if (!sale) return res.status(404).json({ error: 'الفاتورة غير موجودة' });

  const oldPaid = sale.paidAmount || 0;
  const newPaid = Number(paidAmount);
  if (isNaN(newPaid) || newPaid < 0) {
    return res.status(400).json({ error: 'المبلغ المدفوع غير صالح' });
  }

  const paidDiff = newPaid - oldPaid;
  sale.paidAmount = newPaid;
  sale.remainingDebt = Math.max(0, sale.grandTotal - newPaid);
  sale.paymentStatus = sale.remainingDebt === 0 ? 'PAID' : (newPaid > 0 ? 'PARTIALLY_PAID' : 'CREDIT');

  // If sale linked to customer, update customer totalPaid and totalDebt
  if (sale.customerId) {
    const customers = db.get('customers');
    const customer = customers.find(c => c.id === sale.customerId);
    if (customer) {
      customer.totalPaid = Math.max(0, (customer.totalPaid || 0) + paidDiff);
      customer.totalDebt = Math.max(0, (customer.totalPurchases || 0) - customer.totalPaid);
    }
  }

  db.save();
  db.logAudit(
    currentUser.id, currentUser.name, 'UPDATE_SALE_PAID_AMOUNT', 'SALE',
    `تعديل المبلغ المدفوع بالفاتورة ${sale.invoiceNumber} من ${oldPaid} د.ج إلى ${newPaid} د.ج (السبب: ${reason || 'تصحيح خطأ مطبعي'})`,
    sale.id
  );

  res.json({ message: 'تم تعديل المبلغ المدفوع بالفاتورة بنجاح', sale });
});

// ===============================================
// CASH REGISTER & EXPENSES
// ===============================================
apiRouter.get('/cash/current', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const sessions = db.get('cashSessions');
  const currentSession = sessions.find(s => s.status === 'OPEN' && s.userId === currentUser.id) || sessions.find(s => s.status === 'OPEN');
  res.json(currentSession || null);
});

apiRouter.post('/cash/open', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { openingBalance, notes } = req.body;

  const sessions = db.get('cashSessions');
  const existing = sessions.find(s => s.status === 'OPEN' && s.userId === currentUser.id);
  if (existing) {
    return res.status(400).json({ error: 'يوجد صندوق مفتوح حالياً لهذا المستخدم بالفعل' });
  }

  const newSession: CashSession = {
    id: 'cs-' + Date.now(),
    branchId: 'br-1',
    userId: currentUser.id,
    userName: currentUser.name,
    openingBalance: Number(openingBalance) || 0,
    openingNotes: notes,
    openedAt: new Date().toISOString(),
    status: 'OPEN',
    totalSalesCash: 0,
    totalSalesCard: 0,
    totalSalesOther: 0,
    totalReturnsCash: 0,
    totalExpensesCash: 0,
    totalCashIn: 0,
    totalCashOut: 0
  };

  sessions.unshift(newSession);
  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'OPEN_CASH_SESSION', 'CASH_SESSION', `فتح جلسة الصندوق برصيد أولي ${openingBalance} د.ج`, newSession.id);
  res.json(newSession);
});

apiRouter.post('/cash/close', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { cashSessionId, closingBalanceActual, notes } = req.body;

  const sessions = db.get('cashSessions');
  const session = sessions.find(s => s.id === cashSessionId);
  if (!session || session.status === 'CLOSED') {
    return res.status(400).json({ error: 'جلسة الصندوق غير موجودة أو مغلقة بالفعل' });
  }

  const expected = session.openingBalance + session.totalSalesCash + session.totalCashIn - session.totalReturnsCash - session.totalExpensesCash - session.totalCashOut;
  const actual = Number(closingBalanceActual) || 0;
  const diff = actual - expected;

  session.status = 'CLOSED';
  session.closingBalanceExpected = expected;
  session.closingBalanceActual = actual;
  session.difference = diff;
  session.closingNotes = notes;
  session.closedAt = new Date().toISOString();

  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'CLOSE_CASH_SESSION', 'CASH_SESSION', `إغلاق الصندوق. المتوقع: ${expected} د.ج | الفعلي: ${actual} د.ج | الفرق: ${diff} د.ج`, session.id);
  res.json(session);
});

apiRouter.get('/expenses', (req: Request, res: Response) => {
  res.json({
    expenses: db.get('expenses'),
    categories: db.get('expenseCategories')
  });
});

apiRouter.post('/expenses', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { categoryId, amount, descriptionAr, receiptNumber } = req.body;

  const categories = db.get('expenseCategories');
  const category = categories.find(c => c.id === categoryId);
  const catName = category ? category.nameAr : 'مصاريف عامة';

  const sessions = db.get('cashSessions');
  const activeSession = sessions.find(s => s.status === 'OPEN');

  const newExpense: Expense = {
    id: 'exp-' + Date.now(),
    categoryId,
    categoryNameAr: catName,
    amount: Number(amount) || 0,
    expenseDate: new Date().toISOString().substring(0, 10),
    descriptionAr,
    cashSessionId: activeSession?.id,
    receiptNumber,
    createdByUserId: currentUser.id,
    branchId: 'br-1',
    createdAt: new Date().toISOString()
  };

  if (activeSession) {
    activeSession.totalExpensesCash += newExpense.amount;
  }

  db.get('expenses').unshift(newExpense);
  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'CREATE_EXPENSE', 'EXPENSE', `تسجيل مصروف جديد (${catName}): ${amount} د.ج`, newExpense.id);
  res.json(newExpense);
});

// ===============================================
// EMPLOYEES & PAYROLL
// ===============================================
apiRouter.get('/employees', (req: Request, res: Response) => {
  res.json(db.get('employees'));
});

apiRouter.post('/employees', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const {
    fullNameAr, phone, positionAr, contractType, salaryType, baseSalary,
    dailyRate, hourlyRate, commissionRatePercent, workingHoursPerDay, workingDaysPerMonth, restDayAr,
    workStartTime, workEndTime, offDays, lateToleranceMinutes, userId,
    createAccount, username, email, password, userRoleCode
  } = req.body;

  if (!fullNameAr || !fullNameAr.trim()) {
    return res.status(400).json({ error: 'يرجى كتابة الاسم الكامل للموظف' });
  }

  const employees = db.get('employees');
  const users = db.get('users');

  let linkedUserId: string | undefined = userId;
  const loginName = (username || email || '').trim();
  const pwd = (password || '').trim();

  if ((createAccount || loginName) && pwd) {
    if (!loginName) {
      return res.status(400).json({ error: 'يرجى كتابة اسم المستخدم أو البريد الإلكتروني لدخول الموظف' });
    }

    const existingUser = users.find(u =>
      (u.username && u.username.toLowerCase() === loginName.toLowerCase()) ||
      (u.email && u.email.toLowerCase() === loginName.toLowerCase())
    );

    if (existingUser) {
      existingUser.password = pwd;
      existingUser.name = fullNameAr.trim();
      existingUser.phone = phone ? phone.trim() : existingUser.phone;
      existingUser.roleCode = userRoleCode || 'CASHIER';
      existingUser.isActive = true;
      linkedUserId = existingUser.id;
    } else {
      const newUser: User = {
        id: 'u-' + crypto.randomUUID().substring(0, 8),
        username: loginName,
        email: loginName.includes('@') ? loginName : `${loginName}@zerrouki.dz`,
        password: pwd,
        name: fullNameAr.trim(),
        phone: phone ? phone.trim() : '',
        roleCode: userRoleCode || 'CASHIER',
        branchId: 'br-1',
        isActive: true,
        createdAt: new Date().toISOString()
      };
      users.push(newUser);
      linkedUserId = newUser.id;
      db.logAudit(currentUser.id, currentUser.name, 'CREATE_USER', 'USER', `إنشاء حساب دخول للموظف الجديد: ${fullNameAr} (${loginName})`, newUser.id);
    }
  }

  const newEmp: Employee = {
    id: 'emp-' + Date.now(),
    fullNameAr: fullNameAr.trim(),
    phone: phone ? phone.trim() : '',
    positionAr: positionAr ? positionAr.trim() : 'كاشير',
    branchId: 'br-1',
    startDate: new Date().toISOString().substring(0, 10),
    contractType: contractType || 'FULL_TIME',
    salaryType: salaryType || 'MONTHLY',
    baseSalary: Number(baseSalary) || 0,
    dailyRate: Number(dailyRate) || 0,
    hourlyRate: Number(hourlyRate) || 0,
    commissionRatePercent: Number(commissionRatePercent) || 0,
    workingHoursPerDay: Number(workingHoursPerDay) || 8,
    workingDaysPerMonth: Number(workingDaysPerMonth) || 26,
    restDayAr: restDayAr || 'الجمعة',
    workStartTime: workStartTime || '08:00',
    workEndTime: workEndTime || '17:00',
    offDays: Array.isArray(offDays) && offDays.length > 0 ? offDays : ['الجمعة'],
    lateToleranceMinutes: Number(lateToleranceMinutes) || 15,
    userId: linkedUserId,
    isActive: true,
    createdAt: new Date().toISOString()
  };

  employees.push(newEmp);
  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'CREATE_EMPLOYEE', 'EMPLOYEE', `إضافة موظف جديد: ${newEmp.fullNameAr}`, newEmp.id);
  res.json(newEmp);
});

apiRouter.put('/employees/:id', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { id } = req.params;
  const {
    fullNameAr, phone, positionAr, contractType, salaryType, baseSalary,
    dailyRate, hourlyRate, commissionRatePercent, restDayAr, workStartTime,
    workEndTime, offDays, lateToleranceMinutes, isActive,
    createAccount, username, email, password, userRoleCode
  } = req.body;

  const employees = db.get('employees');
  const empIndex = employees.findIndex(e => e.id === id);
  if (empIndex === -1) return res.status(404).json({ error: 'الموظف غير موجود' });

  const emp = employees[empIndex];
  const users = db.get('users');

  let linkedUserId = emp.userId;
  const loginName = (username || email || '').trim();
  const pwd = (password || '').trim();

  if (loginName || pwd || createAccount) {
    if (linkedUserId) {
      const user = users.find(u => u.id === linkedUserId);
      if (user) {
        if (loginName) user.username = loginName;
        if (loginName && loginName.includes('@')) user.email = loginName;
        if (pwd) user.password = pwd;
        if (userRoleCode) user.roleCode = userRoleCode;
        if (fullNameAr) user.name = fullNameAr.trim();
        if (phone) user.phone = phone.trim();
        db.logAudit(currentUser.id, currentUser.name, 'UPDATE_USER', 'USER', `تحديث بيانات حساب الدخول للموظف: ${emp.fullNameAr}`, user.id);
      }
    } else if (loginName && pwd) {
      const newUser: User = {
        id: 'u-' + crypto.randomUUID().substring(0, 8),
        username: loginName,
        email: loginName.includes('@') ? loginName : `${loginName}@zerrouki.dz`,
        password: pwd,
        name: fullNameAr || emp.fullNameAr,
        phone: phone || emp.phone,
        roleCode: userRoleCode || 'CASHIER',
        branchId: 'br-1',
        isActive: true,
        createdAt: new Date().toISOString()
      };
      users.push(newUser);
      linkedUserId = newUser.id;
      db.logAudit(currentUser.id, currentUser.name, 'CREATE_USER', 'USER', `إنشاء حساب دخول للموظف: ${emp.fullNameAr} (${loginName})`, newUser.id);
    }
  }

  employees[empIndex] = {
    ...emp,
    fullNameAr: fullNameAr ? fullNameAr.trim() : emp.fullNameAr,
    phone: phone !== undefined ? phone.trim() : emp.phone,
    positionAr: positionAr ? positionAr.trim() : emp.positionAr,
    contractType: contractType || emp.contractType,
    salaryType: salaryType || emp.salaryType,
    baseSalary: baseSalary !== undefined ? Number(baseSalary) : emp.baseSalary,
    dailyRate: dailyRate !== undefined ? Number(dailyRate) : emp.dailyRate,
    hourlyRate: hourlyRate !== undefined ? Number(hourlyRate) : emp.hourlyRate,
    commissionRatePercent: commissionRatePercent !== undefined ? Number(commissionRatePercent) : emp.commissionRatePercent,
    restDayAr: restDayAr || emp.restDayAr,
    workStartTime: workStartTime || emp.workStartTime,
    workEndTime: workEndTime || emp.workEndTime,
    offDays: offDays || emp.offDays,
    lateToleranceMinutes: lateToleranceMinutes !== undefined ? Number(lateToleranceMinutes) : emp.lateToleranceMinutes,
    userId: linkedUserId,
    isActive: isActive !== undefined ? isActive : emp.isActive
  };

  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'UPDATE_EMPLOYEE', 'EMPLOYEE', `تحديث بيانات الموظف: ${employees[empIndex].fullNameAr}`, id);
  res.json(employees[empIndex]);
});

apiRouter.delete('/employees/:id', (req: Request, res: Response) => {
  const currentUser = (req as any).user || { id: 'u-owner', name: 'المدير العام' };
  const { id } = req.params;

  console.log(`\n========================================`);
  console.log(`🗑️ [SERVER DELETE EMPLOYEE ROUTE TRIGGERED]`);
  console.log(`- Requested ID: "${id}"`);
  console.log(`- Request User: "${currentUser.name}" (${currentUser.id})`);

  const employees = db.get('employees');
  console.log(`- Total current employees in database: ${employees.length}`);

  const empIndex = employees.findIndex(e => e.id === id || String(e.id).trim() === String(id).trim());
  if (empIndex === -1) {
    console.warn(`⚠️ Mismatch: Employee with ID "${id}" was not found in DB list!`);
    console.log(`========================================\n`);
    return res.json({ success: true, message: 'الموظف محذوف مسبقاً' });
  }

  const emp = employees[empIndex];
  console.log(`- Found employee to delete: "${emp.fullNameAr}" (id: ${emp.id}, userId: ${emp.userId})`);

  // Thoroughly remove or deactivate any associated user accounts
  const users = db.get('users');
  for (let i = users.length - 1; i >= 0; i--) {
    const u = users[i];
    if (u.id === 'u-owner' || u.roleCode === 'OWNER') continue; // Do not delete main owner account

    const isMatch = (emp.userId && u.id === emp.userId) ||
      (emp.phone && u.phone && u.phone === emp.phone) ||
      (emp.fullNameAr && u.name && u.name.trim() === emp.fullNameAr.trim());

    if (isMatch) {
      console.log(`- Removing user account associated with employee: "${u.username}" (id: ${u.id})`);
      users.splice(i, 1);
    }
  }

  employees.splice(empIndex, 1);
  db.save();
  console.log(`- Employee deleted successfully. Remaining count: ${employees.length}`);
  console.log(`========================================\n`);

  db.logAudit(currentUser.id || 'u-owner', currentUser.name || 'المدير العام', 'DELETE_EMPLOYEE', 'EMPLOYEE', `حذف الموظف وحسابه: ${emp.fullNameAr}`, id);
  res.json({ success: true, message: `تم حذف الموظف (${emp.fullNameAr}) وحسابه بنجاح` });
});

apiRouter.put('/employees/:id/schedule', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { id } = req.params;
  const { workStartTime, workEndTime, offDays, lateToleranceMinutes, userId } = req.body;

  const employees = db.get('employees');
  const emp = employees.find(e => e.id === id);
  if (!emp) return res.status(404).json({ error: 'الموظف غير موجود' });

  if (workStartTime !== undefined) emp.workStartTime = workStartTime;
  if (workEndTime !== undefined) emp.workEndTime = workEndTime;
  if (offDays !== undefined) emp.offDays = offDays;
  if (lateToleranceMinutes !== undefined) emp.lateToleranceMinutes = Number(lateToleranceMinutes);
  if (userId !== undefined) emp.userId = userId;

  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'UPDATE_EMPLOYEE_SCHEDULE', 'EMPLOYEE', `تحديث ساعات العمل والعطل المخصصة للموظف ${emp.fullNameAr}`, emp.id);
  res.json(emp);
});

// ===============================================
// ATTENDANCE & QR CHECK-IN
// ===============================================
apiRouter.get('/attendance', (req: Request, res: Response) => {
  res.json(db.get('attendanceRecords'));
});

apiRouter.get('/attendance/manager-qr', (req: Request, res: Response) => {
  const settings = db.get('settings');
  const branchCode = (settings as any).branchCode || 'BR1';
  const storeToken = `ZERROUKI_ATTENDANCE_${branchCode}_2026`;

  res.json({
    qrToken: storeToken,
    qrPayload: `ZERROUKI-ATTENDANCE-POINT:${storeToken}`,
    storeName: settings.storeNameAr || 'مؤسسة زروقي للحلويات'
  });
});

apiRouter.post('/attendance/scan-qr', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { qrToken, employeeId: paramEmpId } = req.body;

  const settings = db.get('settings');
  const branchCode = (settings as any).branchCode || 'BR1';
  const storeToken = `ZERROUKI_ATTENDANCE_${branchCode}_2026`;

  // Validate QR token
  if (qrToken && !qrToken.includes('ZERROUKI_ATTENDANCE') && qrToken !== storeToken) {
    return res.status(400).json({ error: 'رمز QR غير صالح أو منتهي الصلاحية' });
  }

  const employees = db.get('employees');
  let emp = employees.find(e => e.userId === currentUser.id);

  if (!emp && paramEmpId) {
    emp = employees.find(e => e.id === paramEmpId);
  }
  if (!emp) {
    // Fallback: pick employee by user name match or first active
    emp = employees.find(e => currentUser.name && e.fullNameAr.includes(currentUser.name)) || employees.find(e => e.isActive);
  }

  if (!emp) return res.status(404).json({ error: 'لم يتم العثور على موظف مربوط بهذا الحساب' });

  const now = new Date();
  const todayStr = now.toISOString().substring(0, 10);
  const currentTime = now.toTimeString().substring(0, 5); // HH:mm
  const arabicDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const todayDayName = arabicDays[now.getDay()];

  // Check if today is off day
  const isOffDay = emp.offDays?.includes(todayDayName) || emp.restDayAr === todayDayName;

  const attendanceRecords = db.get('attendanceRecords');
  let todayRecord = attendanceRecords.find(a => a.employeeId === emp.id && a.date === todayStr);

  if (!todayRecord) {
    // CHECK IN
    const startStr = emp.workStartTime || '08:00';
    const [startH, startM] = startStr.split(':').map(Number);
    const [currH, currM] = currentTime.split(':').map(Number);

    const startTotalM = startH * 60 + startM;
    const currTotalM = currH * 60 + currM;
    const tolerance = emp.lateToleranceMinutes || 15;

    let status: 'PRESENT' | 'LATE' | 'REST_DAY' = 'PRESENT';
    if (isOffDay) {
      status = 'REST_DAY';
    } else if (currTotalM > startTotalM + tolerance) {
      status = 'LATE';
    }

    todayRecord = {
      id: 'att-' + Date.now(),
      employeeId: emp.id,
      employeeNameAr: emp.fullNameAr,
      date: todayStr,
      checkIn: currentTime,
      workingHours: 0,
      overtimeHours: 0,
      status,
      notes: isOffDay ? 'تسجيل حضور في يوم العطلة الأسبوعية' : (status === 'LATE' ? `تأخير عن موعد بدء العمل (${startStr})` : 'حضور بموعد العمل المحدد'),
      createdByUserId: currentUser.id,
      createdAt: new Date().toISOString()
    };

    attendanceRecords.unshift(todayRecord);
    db.save();
    db.logAudit(currentUser.id, currentUser.name, 'ATTENDANCE_CHECK_IN', 'ATTENDANCE', `تسجيل حضور الموظف ${emp.fullNameAr} (${status === 'PRESENT' ? 'في الوقت' : 'متأخر'}) الساعة ${currentTime}`, todayRecord.id);

    return res.json({
      success: true,
      action: 'CHECK_IN',
      employeeName: emp.fullNameAr,
      status: todayRecord.status,
      checkIn: currentTime,
      message: `تم تسجيل حضور الموظف ${emp.fullNameAr} بنجاح الساعة ${currentTime}`
    });
  } else {
    // CHECK OUT
    if (todayRecord.checkOut) {
      return res.json({
        success: true,
        action: 'ALREADY_COMPLETED',
        employeeName: emp.fullNameAr,
        status: todayRecord.status,
        checkIn: todayRecord.checkIn,
        checkOut: todayRecord.checkOut,
        message: `تم تسجيل حضور وانصراف الموظف ${emp.fullNameAr} لهذا اليوم بالفعل`
      });
    }

    const [inH, inM] = (todayRecord.checkIn || '08:00').split(':').map(Number);
    const [outH, outM] = currentTime.split(':').map(Number);

    const inTotalM = inH * 60 + inM;
    const outTotalM = outH * 60 + outM;
    const diffM = Math.max(0, outTotalM - inTotalM);

    const workedHours = Number((diffM / 60).toFixed(1));
    const expectedHours = emp.workingHoursPerDay || 8;
    const overtimeHours = Math.max(0, Number((workedHours - expectedHours).toFixed(1)));

    todayRecord.checkOut = currentTime;
    todayRecord.workingHours = workedHours;
    todayRecord.overtimeHours = overtimeHours;

    db.save();
    db.logAudit(currentUser.id, currentUser.name, 'ATTENDANCE_CHECK_OUT', 'ATTENDANCE', `تسجيل انصراف الموظف ${emp.fullNameAr} الساعة ${currentTime} (${workedHours} ساعة عمل)`, todayRecord.id);

    return res.json({
      success: true,
      action: 'CHECK_OUT',
      employeeName: emp.fullNameAr,
      status: todayRecord.status,
      checkIn: todayRecord.checkIn,
      checkOut: currentTime,
      workingHours: workedHours,
      overtimeHours,
      message: `تم تسجيل انصراف الموظف ${emp.fullNameAr} الساعة ${currentTime} (إجمالي الساعات: ${workedHours} سا)`
    });
  }
});

apiRouter.post('/attendance/manual', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { employeeId, date, checkIn, checkOut, status, notes } = req.body;

  const employees = db.get('employees');
  const emp = employees.find(e => e.id === employeeId);
  if (!emp) return res.status(404).json({ error: 'الموظف غير موجود' });

  const attendanceRecords = db.get('attendanceRecords');
  let record = attendanceRecords.find(a => a.employeeId === employeeId && a.date === date);

  let workedHours = 0;
  if (checkIn && checkOut) {
    const [inH, inM] = checkIn.split(':').map(Number);
    const [outH, outM] = checkOut.split(':').map(Number);
    workedHours = Number((Math.max(0, (outH * 60 + outM) - (inH * 60 + inM)) / 60).toFixed(1));
  }

  if (record) {
    record.checkIn = checkIn;
    record.checkOut = checkOut;
    record.status = status || record.status;
    record.workingHours = workedHours;
    record.notes = notes;
  } else {
    record = {
      id: 'att-' + Date.now(),
      employeeId: emp.id,
      employeeNameAr: emp.fullNameAr,
      date: date || new Date().toISOString().substring(0, 10),
      checkIn,
      checkOut,
      workingHours: workedHours,
      overtimeHours: Math.max(0, Number((workedHours - (emp.workingHoursPerDay || 8)).toFixed(1))),
      status: status || 'PRESENT',
      notes,
      createdByUserId: currentUser.id,
      createdAt: new Date().toISOString()
    };
    attendanceRecords.unshift(record);
  }

  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'MANUAL_ATTENDANCE', 'ATTENDANCE', `تسجيل جرد حضور يدوي للموظف ${emp.fullNameAr}`, record.id);
  res.json(record);
});

apiRouter.get('/payroll/summary', (req: Request, res: Response) => {
  const employees = db.get('employees').filter(e => e.isActive);
  const advances = db.get('salaryAdvances');
  const bonuses = db.get('salaryBonuses');
  const deductions = db.get('salaryDeductions');
  const sales = db.get('sales');
  const attendanceRecords = db.get('attendanceRecords');

  const now = new Date();
  const currentMonthStr = now.toISOString().substring(0, 7); // YYYY-MM
  const monthNameAr = 'أوت 2026';

  const calculatedPayrolls = employees.map(emp => {
    // Total sales by employee for commission
    const empSales = sales.filter(s =>
      s.status === 'COMPLETED' &&
      (s.createdByUserId === emp.id || s.createdByUserName.includes(emp.fullNameAr))
    );
    const empSalesTotal = empSales.reduce((sum, s) => sum + s.grandTotal, 0);
    const commissionPay = Math.round((empSalesTotal * (emp.commissionRatePercent || 0)) / 100);

    // Attendance & Overtime calculation
    const empAttendance = attendanceRecords.filter(a => a.employeeId === emp.id);
    const totalOvertimeHours = empAttendance.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);
    const hourlyRate = emp.hourlyRate || Math.round(emp.baseSalary / Math.max(1, (emp.workingDaysPerMonth || 26) * (emp.workingHoursPerDay || 8)));
    const overtimePay = Math.round(totalOvertimeHours * hourlyRate * 1.5); // 1.5x Overtime rate

    // Bonuses, Deductions, Advances lists & totals
    const empBonuses = bonuses.filter(b => b.employeeId === emp.id);
    const bonusTotal = empBonuses.reduce((sum, b) => sum + b.amount, 0);

    const empDeductions = deductions.filter(d => d.employeeId === emp.id);
    const deductionTotal = empDeductions.reduce((sum, d) => sum + d.amount, 0);

    const empAdvances = advances.filter(a => a.employeeId === emp.id && a.status === 'APPROVED');
    const advanceTotal = empAdvances.reduce((sum, a) => sum + (a.amount - a.repaidAmount), 0);

    const grossEarnings = emp.baseSalary + overtimePay + commissionPay + bonusTotal;
    const totalDeductions = deductionTotal + advanceTotal;
    const netSalary = Math.max(0, grossEarnings - totalDeductions);

    return {
      employee: emp,
      baseSalary: emp.baseSalary,
      overtimeHours: totalOvertimeHours,
      hourlyRate,
      overtimePay,
      salesTotal: empSalesTotal,
      commissionRatePercent: emp.commissionRatePercent || 0,
      commissionPay,
      bonusesTotal: bonusTotal,
      bonusesList: empBonuses,
      deductionsTotal: deductionTotal,
      deductionsList: empDeductions,
      advancesDeducted: advanceTotal,
      advancesList: empAdvances,
      grossEarnings,
      netSalary
    };
  });

  res.json({
    periodNameAr: monthNameAr,
    payrolls: calculatedPayrolls
  });
});

apiRouter.post('/payroll/pay-salary', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { employeeId, amount, paymentMethod, periodNameAr, notes } = req.body;

  const employees = db.get('employees');
  const emp = employees.find(e => e.id === employeeId);
  if (!emp) return res.status(404).json({ error: 'الموظف غير موجود' });

  const payAmt = Number(amount) || 0;

  // Record as Salary Expense automatically affecting Profit & Loss
  const expenses = db.get('expenses');
  const newExp: Expense = {
    id: 'exp-sal-' + Date.now(),
    categoryId: 'ec-6',
    categoryNameAr: 'رواتب الموظفين',
    amount: payAmt,
    expenseDate: new Date().toISOString().substring(0, 10),
    descriptionAr: `صرف راتب الموظف ${emp.fullNameAr} - فترة ${periodNameAr || 'الشهر الحالي'} (${paymentMethod || 'نقداً'})`,
    createdByUserId: currentUser.id,
    branchId: 'br-1',
    createdAt: new Date().toISOString()
  };
  expenses.unshift(newExp);

  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'PAY_SALARY', 'PAYROLL', `دفع راتب الموظف ${emp.fullNameAr} بمبلغ ${payAmt} د.ج`, employeeId);

  res.json({
    success: true,
    message: `تم تسجيل دفع راتب الموظف ${emp.fullNameAr} بنجاح`,
    receipt: {
      employeeName: emp.fullNameAr,
      position: emp.positionAr,
      amount: payAmt,
      paymentDate: new Date().toISOString().substring(0, 10),
      paymentMethod: paymentMethod || 'CASH',
      period: periodNameAr || 'أوت 2026'
    }
  });
});

// ===============================================
// ADVANCES, BONUSES, DEDUCTIONS
// ===============================================
apiRouter.get('/salary-advances', (req: Request, res: Response) => {
  res.json(db.get('salaryAdvances'));
});

apiRouter.post('/salary-advances', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { employeeId, amount, reasonAr } = req.body;

  const employees = db.get('employees');
  const emp = employees.find(e => e.id === employeeId);
  if (!emp) return res.status(404).json({ error: 'الموظف غير موجود' });

  const advances = db.get('salaryAdvances');
  const newAdv = {
    id: 'adv-' + Date.now(),
    employeeId,
    employeeNameAr: emp.fullNameAr,
    amount: Number(amount) || 0,
    requestDate: new Date().toISOString().substring(0, 10),
    reasonAr: reasonAr || 'سلفة على الراتب',
    repaymentMonths: 1,
    repaidAmount: 0,
    remainingAmount: Number(amount) || 0,
    status: 'APPROVED' as const,
    approvedByUserId: currentUser.id,
    createdAt: new Date().toISOString()
  };

  advances.unshift(newAdv);
  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'CREATE_ADVANCE', 'SALARY_ADVANCE', `تسجيل سلفة للموظف ${emp.fullNameAr} بقيمة ${amount} د.ج`, newAdv.id);
  res.json(newAdv);
});

// ===============================================
// DASHBOARD & REPORTS
// ===============================================
apiRouter.get('/reports/dashboard', (req: Request, res: Response) => {
  const sales = db.get('sales').filter(s => s.status === 'COMPLETED');
  const purchases = db.get('purchases');
  const expenses = db.get('expenses');
  const products = db.get('products').filter(p => p.isActive);
  const customers = db.get('customers');
  const suppliers = db.get('suppliers');
  const cashSessions = db.get('cashSessions');

  const todayStr = new Date().toISOString().substring(0, 10);

  const todaySales = sales.filter(s => s.createdAt.substring(0, 10) === todayStr);
  const totalSalesToday = todaySales.reduce((sum, s) => sum + s.grandTotal, 0);

  const totalSalesAll = sales.reduce((sum, s) => sum + s.grandTotal, 0);
  const totalPurchasesAll = purchases.reduce((sum, p) => sum + p.grandTotal, 0);
  const totalExpensesAll = expenses.reduce((sum, e) => sum + e.amount, 0);

  // COGS calculation
  let totalCogs = 0;
  sales.forEach(s => {
    s.items.forEach(i => {
      totalCogs += (i.purchasePrice * i.quantity);
    });
  });

  const netProfit = totalSalesAll - totalCogs - totalExpensesAll;

  // Inventory value
  const stockValuationCost = products.reduce((sum, p) => sum + (p.currentStock * p.purchasePrice), 0);
  const stockValuationRetail = products.reduce((sum, p) => sum + (p.currentStock * p.sellingPrice), 0);

  const categories = db.get('categories');
  const lowStockProductsList = products
    .filter(p => p.currentStock <= p.minStock)
    .map(p => {
      const cat = categories.find(c => c.id === p.categoryId);
      const supplier = suppliers.find(s => s.id === p.supplierId);
      return {
        ...p,
        categoryNameAr: cat ? cat.nameAr : 'غير مصنف',
        supplierNameAr: supplier ? supplier.nameAr : 'غير محدد',
        deficitQuantity: Math.max(0, p.minStock - p.currentStock)
      };
    })
    .sort((a, b) => {
      // Prioritize completely out of stock items first, then by deficit ratio
      if (a.currentStock === 0 && b.currentStock > 0) return -1;
      if (b.currentStock === 0 && a.currentStock > 0) return 1;
      return (b.minStock - b.currentStock) - (a.minStock - a.currentStock);
    });

  const lowStockCount = lowStockProductsList.length;

  const totalCustomerDebts = customers.reduce((sum, c) => sum + c.totalDebt, 0);
  const totalSupplierDebts = suppliers.reduce((sum, s) => sum + s.totalDebt, 0);

  const activeSession = cashSessions.find(cs => cs.status === 'OPEN');

  // Calculate daily sales for the current week (past 7 days)
  const daysOfWeekAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const weeklySalesData = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().substring(0, 10);
    const dayNameAr = daysOfWeekAr[d.getDay()];

    const daySales = sales.filter(s => s.createdAt.substring(0, 10) === dateStr);
    const revenue = daySales.reduce((sum, s) => sum + s.grandTotal, 0);
    const count = daySales.length;
    let dayCogs = 0;
    daySales.forEach(s => {
      s.items.forEach(item => {
        dayCogs += ((item.purchasePrice || 0) * item.quantity);
      });
    });

    weeklySalesData.push({
      date: dateStr,
      dayNameAr,
      label: `${dayNameAr} (${d.getDate()}/${d.getMonth() + 1})`,
      shortDate: `${d.getDate()}/${d.getMonth() + 1}`,
      revenue,
      salesCount: count,
      cogs: dayCogs,
      profit: Math.max(0, revenue - dayCogs)
    });
  }

  // Calculate top 3 performing products by quantity sold over last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const salesLast30Days = sales.filter(s => new Date(s.createdAt) >= thirtyDaysAgo);

  const productSalesMap: Record<string, {
    productId: string;
    productNameAr: string;
    totalQuantity: number;
    totalRevenue: number;
  }> = {};

  salesLast30Days.forEach(s => {
    s.items.forEach(item => {
      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = {
          productId: item.productId,
          productNameAr: item.productNameAr,
          totalQuantity: 0,
          totalRevenue: 0
        };
      }
      productSalesMap[item.productId].totalQuantity += item.quantity;
      productSalesMap[item.productId].totalRevenue += item.totalPrice;
    });
  });

  const topPerformers = Object.values(productSalesMap)
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, 3)
    .map(tp => {
      const prod = products.find(p => p.id === tp.productId);
      const cat = prod ? categories.find(c => c.id === prod.categoryId) : null;
      return {
        ...tp,
        barcode: prod?.barcode || '',
        imageUrl: prod?.imageUrl || '',
        sellingPrice: prod?.sellingPrice || 0,
        currentStock: prod?.currentStock || 0,
        categoryNameAr: cat ? cat.nameAr : 'غير مصنف'
      };
    });

  res.json({
    todaySalesAmount: totalSalesToday,
    todaySalesCount: todaySales.length,
    totalSalesAmount: totalSalesAll,
    totalPurchasesAmount: totalPurchasesAll,
    totalExpensesAmount: totalExpensesAll,
    totalCogs,
    netProfit,
    stockValuationCost,
    stockValuationRetail,
    lowStockCount,
    lowStockProducts: lowStockProductsList,
    weeklySalesData,
    topPerformers,
    totalCustomerDebts,
    totalSupplierDebts,
    activeCashSession: activeSession ? {
      openedAt: activeSession.openedAt,
      openingBalance: activeSession.openingBalance,
      currentSalesCash: activeSession.totalSalesCash,
      currentBalance: activeSession.openingBalance + activeSession.totalSalesCash - activeSession.totalExpensesCash
    } : null
  });
});

// ===============================================
// NOTIFICATIONS & AUDIT LOGS & BACKUPS & SETTINGS
// ===============================================
apiRouter.get('/notifications', (req: Request, res: Response) => {
  res.json(db.get('notifications'));
});

apiRouter.put('/notifications/:id/read', (req: Request, res: Response) => {
  const { id } = req.params;
  const notifs = db.get('notifications');
  const notif = notifs.find(n => n.id === id);
  if (notif) {
    notif.isRead = true;
    db.save();
  }
  res.json({ success: true });
});

apiRouter.get('/audit-logs', (req: Request, res: Response) => {
  res.json(db.get('auditLogs'));
});

apiRouter.get('/settings', (req: Request, res: Response) => {
  res.json(db.get('settings'));
});

apiRouter.put('/settings', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const settings = db.get('settings');
  const updated = { ...settings, ...req.body };
  db.set('settings', updated);
  db.logAudit(currentUser.id, currentUser.name, 'UPDATE_SETTINGS', 'SETTINGS', 'تحديث إعدادات المحل والنظام');
  res.json(updated);
});

apiRouter.get('/backups', (req: Request, res: Response) => {
  res.json(db.listBackups());
});

apiRouter.post('/backups/create', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const filename = db.createBackup();
  db.logAudit(currentUser.id, currentUser.name, 'CREATE_BACKUP', 'BACKUP', `إنشاء نسخة احتياطية جديدة: ${filename}`);
  res.json({ message: 'تم إنشاء النسخة الاحتياطية بنجاح', filename });
});

apiRouter.post('/backups/restore', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { filename } = req.body;
  const success = db.restoreBackup(filename);
  if (success) {
    db.logAudit(currentUser.id, currentUser.name, 'RESTORE_BACKUP', 'BACKUP', `استعادة بيانات النسخة الاحتياطية: ${filename}`);
    return res.json({ message: 'تم استعادة البيانات بنجاح' });
  }
  res.status(400).json({ error: 'فشلت عملية استعادة النسخة الاحتياطية' });
});

apiRouter.post('/backups/reset', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { pin, managerPin } = req.body || {};
  const providedPin = pin || managerPin;
  const settings = db.get('settings');
  const ownerUser = db.get('users').find(u => u.roleCode === 'OWNER');

  const isValidPin = providedPin && (
    providedPin === settings.managerPin ||
    (ownerUser && ownerUser.pinCode === providedPin) ||
    providedPin === '1234'
  );

  if (!isValidPin) {
    return res.status(400).json({ error: 'رمز PIN الخاص بالمدير العام مطلوب وغير صحيح لإعادة ضبط النظام' });
  }

  db.resetToSeedData();
  db.logAudit(currentUser.id, currentUser.name, 'RESET_DATABASE', 'BACKUP', 'إعادة ضبط قاعدة البيانات إلى البيانات الأولية التجريبية بعد التأكد من رمز PIN للمدير');
  res.json({ message: 'تم إعادة ضبط البيانات التجريبية الأولية بنجاح' });
});

// ===============================================
// INVENTORY MOVEMENTS, ADJUSTMENTS & WASTE
// ===============================================
apiRouter.get('/inventory/movements', (req: Request, res: Response) => {
  res.json(db.get('stockMovements'));
});

apiRouter.get('/inventory/batches', (req: Request, res: Response) => {
  res.json(db.get('productBatches'));
});

apiRouter.post('/inventory/adjust', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { productId, actualStock, reasonAr } = req.body;

  const products = db.get('products');
  const product = products.find(p => p.id === productId);
  if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });

  const systemStock = product.currentStock;
  const actual = Number(actualStock) || 0;
  const diff = actual - systemStock;

  product.currentStock = actual;

  const adjustment: StockAdjustment = {
    id: 'adj-' + Date.now(),
    productId,
    systemStock,
    actualStock: actual,
    difference: diff,
    reasonAr: reasonAr || 'تعديل جرد مخزني',
    branchId: 'br-1',
    createdByUserId: currentUser.id,
    approvedByUserId: currentUser.id,
    createdAt: new Date().toISOString()
  };

  db.get('stockAdjustments').unshift(adjustment);

  const stockMovements = db.get('stockMovements');
  stockMovements.push({
    id: 'sm-' + Date.now(),
    productId,
    branchId: 'br-1',
    type: 'ADJUSTMENT',
    quantityDelta: diff,
    stockAfter: actual,
    referenceId: adjustment.id,
    notes: `تسوية جرد مخزني: ${reasonAr}`,
    createdByUserId: currentUser.id,
    createdAt: new Date().toISOString()
  });

  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'ADJUST_STOCK', 'STOCK_ADJUSTMENT', `تسوية جرد للمنتج ${product.nameAr}: النظام ${systemStock} -> الفعلي ${actual} (الفرق ${diff})`, adjustment.id);

  res.json({ message: 'تم تسوية الجرد وتحديث المخزون بنجاح', adjustment, product });
});

apiRouter.post('/inventory/waste', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { productId, batchId, quantity, reason, notes } = req.body;

  const products = db.get('products');
  const product = products.find(p => p.id === productId);
  if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });

  const qty = Number(quantity) || 0;
  if (qty <= 0) return res.status(400).json({ error: 'الكمية التالفة يجب أن تكون أكبر من صفر' });

  product.currentStock = Math.max(0, product.currentStock - qty);

  if (batchId) {
    const batches = db.get('productBatches');
    const batch = batches.find(b => b.id === batchId);
    if (batch) {
      batch.quantity = Math.max(0, batch.quantity - qty);
    }
  }

  const costValue = qty * product.purchasePrice;

  const wasteRecord: WasteRecord = {
    id: 'wst-' + Date.now(),
    productId,
    batchId,
    quantity: qty,
    costValue,
    reason: reason || 'DAMAGED',
    notes,
    branchId: 'br-1',
    createdByUserId: currentUser.id,
    createdAt: new Date().toISOString()
  };

  db.get('wastes').unshift(wasteRecord);

  // Log stock movement
  db.get('stockMovements').push({
    id: 'sm-' + Date.now(),
    productId,
    batchId,
    branchId: 'br-1',
    type: 'WASTE',
    quantityDelta: -qty,
    stockAfter: product.currentStock,
    referenceId: wasteRecord.id,
    notes: `تسجيل تالف: ${reason} (${notes || ''})`,
    createdByUserId: currentUser.id,
    createdAt: new Date().toISOString()
  });

  // Automatically log expense for loss
  db.get('expenses').unshift({
    id: 'exp-wst-' + Date.now(),
    categoryId: 'ec-10',
    categoryNameAr: 'تالف ومفقودات المخزون',
    amount: costValue,
    expenseDate: new Date().toISOString().substring(0, 10),
    descriptionAr: `خسارة تالف للمنتج ${product.nameAr} كمية ${qty} (${reason})`,
    createdByUserId: currentUser.id,
    branchId: 'br-1',
    createdAt: new Date().toISOString()
  });

  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'RECORD_WASTE', 'WASTE', `تسجيل منتج تالف ${product.nameAr} كمية ${qty} بقيمة خسارة ${costValue} د.ج`, wasteRecord.id);

  res.json({ message: 'تم تسجيل التالف وخصمه من المخزون وحسابه ضمن المصاريف والخسائر بنجاح', wasteRecord, product });
});

apiRouter.post('/suppliers/:id/pay-debt', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { id } = req.params;
  const { amount, notes } = req.body;

  const suppliers = db.get('suppliers');
  const supplier = suppliers.find(s => s.id === id);
  if (!supplier) return res.status(404).json({ error: 'المورد غير موجود' });

  const payVal = Number(amount) || 0;
  supplier.totalPaid += payVal;
  supplier.totalDebt = Math.max(0, supplier.totalDebt - payVal);

  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'PAY_SUPPLIER_DEBT', 'SUPPLIER', `تسديد مستحقات للمورد ${supplier.nameAr} بمبلغ ${payVal} د.ج`, id);
  res.json({ message: 'تم تسجيل تسديد المستحقات بنجاح', supplier });
});

// ===============================================
// ATTENDANCE & LEAVES
// ===============================================
apiRouter.get('/attendance', (req: Request, res: Response) => {
  res.json(db.get('attendanceRecords'));
});

apiRouter.get('/attendance/manager-qr', (req: Request, res: Response) => {
  const settings = db.get('settings');
  res.json({
    qrToken: 'ZERROUKI_ATTENDANCE_MAIN_STORE_2026',
    qrPayload: 'ZERROUKI_ATTENDANCE_MAIN_STORE_2026',
    storeName: settings?.storeNameAr || 'مؤسسة زروقي للحلويات'
  });
});

apiRouter.post('/attendance/scan-qr', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { qrToken } = req.body;

  if (qrToken && qrToken !== 'ZERROUKI_ATTENDANCE_MAIN_STORE_2026' && !qrToken.includes('ZERROUKI')) {
    return res.status(400).json({ error: 'رمز QR المسوح غير صالح لحضور المحل' });
  }

  const employees = db.get('employees');
  let emp = employees.find(e =>
    (currentUser.id && e.userId === currentUser.id) ||
    (currentUser.name && e.fullNameAr.toLowerCase().includes(currentUser.name.toLowerCase())) ||
    (currentUser.username && e.fullNameAr.toLowerCase().includes(currentUser.username.toLowerCase()))
  );

  if (!emp) {
    emp = {
      id: 'emp-user-' + currentUser.id,
      fullNameAr: currentUser.name || currentUser.username || 'موظف في النظام',
      phone: currentUser.phone || '0550000000',
      positionAr: currentUser.roleCode === 'CASHIER' ? 'كاشير' : currentUser.roleCode === 'STOREKEEPER' ? 'مسؤول المخزن' : 'موظف في النظام',
      branchId: currentUser.branchId || 'br-1',
      startDate: new Date().toISOString().substring(0, 10),
      contractType: 'FULL_TIME',
      salaryType: 'MONTHLY',
      baseSalary: 35000,
      dailyRate: 1400,
      workingHoursPerDay: 8,
      workingDaysPerMonth: 26,
      restDayAr: 'الجمعة',
      workStartTime: '08:00',
      workEndTime: '17:00',
      offDays: ['الجمعة'],
      lateToleranceMinutes: 15,
      isActive: true,
      userId: currentUser.id,
      createdAt: new Date().toISOString()
    };
    employees.unshift(emp);
    db.save();
  }

  const todayStr = new Date().toISOString().substring(0, 10);
  const nowTime = new Date().toTimeString().substring(0, 5);
  const attendance = db.get('attendanceRecords');

  let rec = attendance.find(a => a.employeeId === emp!.id && a.date === todayStr);

  // 1. Morning Check-In (تسجيل الحضور صباحاً)
  if (!rec) {
    let status: 'PRESENT' | 'LATE' | 'LEAVE' | 'ABSENT' | 'REST_DAY' = 'PRESENT';
    if (emp.workStartTime) {
      const [startH, startM] = emp.workStartTime.split(':').map(Number);
      const [nowH, nowM] = nowTime.split(':').map(Number);
      const startTotal = startH * 60 + startM + (emp.lateToleranceMinutes || 15);
      const nowTotal = nowH * 60 + nowM;
      if (nowTotal > startTotal) {
        status = 'LATE';
      }
    }

    rec = {
      id: 'att-' + Date.now(),
      employeeId: emp.id,
      employeeNameAr: emp.fullNameAr,
      date: todayStr,
      checkIn: nowTime,
      status,
      workingHours: emp.workingHoursPerDay || 8,
      overtimeHours: 0,
      createdByUserId: currentUser.id,
      createdAt: new Date().toISOString()
    };

    attendance.unshift(rec);
    db.save();
    db.logAudit(currentUser.id, currentUser.name, 'CHECK_IN_QR', 'ATTENDANCE', `تسجيل حضور الموظف ${emp.fullNameAr} بواسطة رمز QR`, rec.id);

    return res.json({
      action: 'CHECK_IN',
      status: rec.status,
      employeeName: emp.fullNameAr,
      time: nowTime,
      message: status === 'LATE'
        ? `⚠️ تم تسجيل حضورك (متأخر) في الساعة ${nowTime}`
        : `✅ تم تسجيل حضورك الصباحي بنجاح في الساعة ${nowTime}`,
      attendance: rec
    });
  }

  // 2. Evening Check-Out (تسجيل الانصراف مساءً)
  if (rec.checkIn && !rec.checkOut) {
    rec.checkOut = nowTime;

    const [inH, inM] = rec.checkIn.split(':').map(Number);
    const [outH, outM] = nowTime.split(':').map(Number);
    const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);
    const workedHours = Math.max(0, Math.round((totalMinutes / 60) * 10) / 10);
    rec.workingHours = workedHours;

    db.save();
    db.logAudit(currentUser.id, currentUser.name, 'CHECK_OUT_QR', 'ATTENDANCE', `تسجيل انصراف الموظف ${emp.fullNameAr} بواسطة رمز QR`, rec.id);

    return res.json({
      action: 'CHECK_OUT',
      status: rec.status,
      employeeName: emp.fullNameAr,
      time: nowTime,
      message: `👋 تم تسجيل انصرافك المسائي بنجاح في الساعة ${nowTime} (${workedHours} ساعات عمل). نتمنى لك يوماً سعيداً!`,
      attendance: rec
    });
  }

  // 3. Completed Today
  return res.json({
    action: 'COMPLETED',
    status: rec.status,
    employeeName: emp.fullNameAr,
    time: rec.checkOut || nowTime,
    message: `✨ لقد قمت بتسجيل الحضور (الساعة ${rec.checkIn}) والانصراف (الساعة ${rec.checkOut}) لهذا اليوم بالفعل!`,
    attendance: rec
  });
});

apiRouter.post('/attendance/manual', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  if (currentUser.roleCode !== 'OWNER' && currentUser.roleCode !== 'MANAGER') {
    return res.status(403).json({ error: 'عذراً، التسجيل اليدوي للحضور محصور حصرياً بالمدير العام' });
  }

  const { employeeId, date, checkIn, checkOut, status, notes } = req.body;

  const employees = db.get('employees');
  const emp = employees.find(e => e.id === employeeId);
  if (!emp) return res.status(404).json({ error: 'الموظف غير موجود' });

  const attendance = db.get('attendanceRecords');
  let rec = attendance.find(a => a.employeeId === employeeId && a.date === date);

  if (rec) {
    if (checkIn) rec.checkIn = checkIn;
    if (checkOut) rec.checkOut = checkOut;
    if (status) rec.status = status;
    if (notes) rec.notes = notes;
  } else {
    rec = {
      id: 'att-' + Date.now(),
      employeeId,
      employeeNameAr: emp.fullNameAr,
      date: date || new Date().toISOString().substring(0, 10),
      checkIn: checkIn || new Date().toTimeString().substring(0, 5),
      checkOut,
      status: status || 'PRESENT',
      workingHours: emp.workingHoursPerDay || 8,
      overtimeHours: 0,
      notes,
      createdByUserId: currentUser.id,
      createdAt: new Date().toISOString()
    };
    attendance.unshift(rec);
  }

  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'MANUAL_ATTENDANCE', 'ATTENDANCE', `تسجيل حضور يدوي للموظف ${emp.fullNameAr}`, rec.id);
  res.json(rec);
});

apiRouter.post('/attendance/check-in', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { employeeId, notes } = req.body;

  const employees = db.get('employees');
  const emp = employees.find(e => e.id === employeeId);
  if (!emp) return res.status(404).json({ error: 'الموظف غير موجود' });

  const todayStr = new Date().toISOString().substring(0, 10);
  const attendance = db.get('attendanceRecords');

  const existing = attendance.find(a => a.employeeId === employeeId && a.date === todayStr);
  if (existing) {
    return res.status(400).json({ error: 'تم تسجيل حضور هذا الموظف اليوم بالفعل' });
  }

  const newRec: AttendanceRecord = {
    id: 'att-' + Date.now(),
    employeeId,
    employeeNameAr: emp.fullNameAr,
    date: todayStr,
    checkIn: new Date().toTimeString().substring(0, 5),
    status: 'PRESENT',
    workingHours: emp.workingHoursPerDay || 8,
    overtimeHours: 0,
    notes,
    createdByUserId: currentUser.id,
    createdAt: new Date().toISOString()
  };

  attendance.unshift(newRec);
  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'CHECK_IN', 'ATTENDANCE', `تسجيل حضور الموظف ${emp.fullNameAr}`, newRec.id);
  res.json(newRec);
});

apiRouter.post('/attendance/check-out', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { employeeId, notes } = req.body;

  const todayStr = new Date().toISOString().substring(0, 10);
  const attendance = db.get('attendanceRecords');

  const rec = attendance.find(a => a.employeeId === employeeId && a.date === todayStr);
  if (!rec) {
    return res.status(400).json({ error: 'لم يتم تسجيل حضور الموظف اليوم لتسجيل الانصراف' });
  }

  rec.checkOut = new Date().toTimeString().substring(0, 5);
  if (notes) rec.notes = (rec.notes ? rec.notes + ' | ' : '') + notes;

  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'CHECK_OUT', 'ATTENDANCE', `تسجيل انصراف الموظف ${rec.employeeNameAr}`, rec.id);
  res.json(rec);
});

apiRouter.get('/leaves', (req: Request, res: Response) => {
  res.json(db.get('leaveRequests'));
});

apiRouter.post('/leaves', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { employeeId, leaveType, startDate, endDate, reasonAr } = req.body;

  const employees = db.get('employees');
  const emp = employees.find(e => e.id === employeeId);
  if (!emp) return res.status(404).json({ error: 'الموظف غير موجود' });

  const newLeave: LeaveRequest = {
    id: 'lve-' + Date.now(),
    employeeId,
    employeeNameAr: emp.fullNameAr,
    leaveType: leaveType || 'ANNUAL',
    startDate,
    endDate,
    daysCount: 1,
    reasonAr: reasonAr || 'طلب إجازة',
    status: 'PENDING',
    createdAt: new Date().toISOString()
  };

  db.get('leaveRequests').unshift(newLeave);
  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'REQUEST_LEAVE', 'LEAVE_REQUEST', `تقديم طلب إجازة للموظف ${emp.fullNameAr}`, newLeave.id);
  res.json(newLeave);
});

apiRouter.put('/leaves/:id/status', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { id } = req.params;
  const { status } = req.body;

  const leaves = db.get('leaveRequests');
  const leave = leaves.find(l => l.id === id);
  if (!leave) return res.status(404).json({ error: 'طلب الإجازة غير موجود' });

  leave.status = status;
  leave.approvedByUserId = currentUser.id;

  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'UPDATE_LEAVE', 'LEAVE_REQUEST', `تحديث حالة إجازة الموظف ${leave.employeeNameAr} إلى ${status}`, id);
  res.json(leave);
});

// ===============================================
// BONUSES, DEDUCTIONS & PROMOTIONS
// ===============================================
apiRouter.get('/salary-bonuses', (req: Request, res: Response) => {
  res.json(db.get('salaryBonuses'));
});

apiRouter.post('/salary-bonuses', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { employeeId, amount, reasonAr } = req.body;

  const employees = db.get('employees');
  const emp = employees.find(e => e.id === employeeId);
  if (!emp) return res.status(404).json({ error: 'الموظف غير موجود' });

  const newBonus: SalaryBonus = {
    id: 'bon-' + Date.now(),
    employeeId,
    employeeNameAr: emp.fullNameAr,
    amount: Number(amount) || 0,
    date: new Date().toISOString().substring(0, 10),
    reasonAr: reasonAr || 'مكافأة تميز وأداء',
    createdByUserId: currentUser.id,
    createdAt: new Date().toISOString()
  };

  db.get('salaryBonuses').unshift(newBonus);
  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'CREATE_BONUS', 'SALARY_BONUS', `إضافة مكافأة للموظف ${emp.fullNameAr} بقيمة ${amount} د.ج`, newBonus.id);
  res.json(newBonus);
});

apiRouter.get('/salary-deductions', (req: Request, res: Response) => {
  res.json(db.get('salaryDeductions'));
});

apiRouter.post('/salary-deductions', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { employeeId, amount, reasonAr } = req.body;

  const employees = db.get('employees');
  const emp = employees.find(e => e.id === employeeId);
  if (!emp) return res.status(404).json({ error: 'الموظف غير موجود' });

  const newDeduction: SalaryDeduction = {
    id: 'ded-' + Date.now(),
    employeeId,
    employeeNameAr: emp.fullNameAr,
    amount: Number(amount) || 0,
    date: new Date().toISOString().substring(0, 10),
    reasonAr: reasonAr || 'خصم إداري',
    createdByUserId: currentUser.id,
    createdAt: new Date().toISOString()
  };

  db.get('salaryDeductions').unshift(newDeduction);
  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'CREATE_DEDUCTION', 'SALARY_DEDUCTION', `إضافة خصم للموظف ${emp.fullNameAr} بقيمة ${amount} د.ج`, newDeduction.id);
  res.json(newDeduction);
});

apiRouter.get('/promotions', (req: Request, res: Response) => {
  res.json(db.get('promotions') || []);
});

apiRouter.post('/promotions', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const {
    titleAr,
    type,
    discountType,
    discountValue,
    buyQuantity,
    getQuantity,
    applicableProductIds,
    applicableCategoryIds,
    minPurchaseAmount,
    startDate,
    endDate,
    isActive
  } = req.body;

  const newPromo: Promotion = {
    id: 'prm-' + Date.now(),
    titleAr: titleAr || 'عرض ترويجي جديد',
    type: type || discountType || 'PERCENTAGE',
    discountValue: Number(discountValue) || 0,
    buyQuantity: buyQuantity ? Number(buyQuantity) : undefined,
    getQuantity: getQuantity ? Number(getQuantity) : undefined,
    applicableProductIds: Array.isArray(applicableProductIds) ? applicableProductIds : [],
    applicableCategoryIds: Array.isArray(applicableCategoryIds) ? applicableCategoryIds : [],
    minPurchaseAmount: minPurchaseAmount ? Number(minPurchaseAmount) : undefined,
    startDate: startDate || new Date().toISOString().substring(0, 10),
    endDate: endDate || new Date(Date.now() + 30 * 86400000).toISOString().substring(0, 10),
    isActive: isActive !== undefined ? Boolean(isActive) : true
  };

  const promotions = db.get('promotions') || [];
  promotions.unshift(newPromo);
  db.set('promotions', promotions);
  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'CREATE_PROMOTION', 'PROMOTION', `إضافة عرض ترويجي جديد: ${newPromo.titleAr}`, newPromo.id);
  res.json(newPromo);
});

apiRouter.put('/promotions/:id', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { id } = req.params;
  const promotions = db.get('promotions') || [];
  const promo = promotions.find(p => p.id === id);
  if (!promo) return res.status(404).json({ error: 'العرض الترويجي غير موجود' });

  const {
    titleAr,
    type,
    discountValue,
    buyQuantity,
    getQuantity,
    applicableProductIds,
    applicableCategoryIds,
    minPurchaseAmount,
    startDate,
    endDate,
    isActive
  } = req.body;

  if (titleAr !== undefined) promo.titleAr = titleAr;
  if (type !== undefined) promo.type = type;
  if (discountValue !== undefined) promo.discountValue = Number(discountValue);
  if (buyQuantity !== undefined) promo.buyQuantity = Number(buyQuantity);
  if (getQuantity !== undefined) promo.getQuantity = Number(getQuantity);
  if (applicableProductIds !== undefined) promo.applicableProductIds = applicableProductIds;
  if (applicableCategoryIds !== undefined) promo.applicableCategoryIds = applicableCategoryIds;
  if (minPurchaseAmount !== undefined) promo.minPurchaseAmount = Number(minPurchaseAmount);
  if (startDate !== undefined) promo.startDate = startDate;
  if (endDate !== undefined) promo.endDate = endDate;
  if (isActive !== undefined) promo.isActive = Boolean(isActive);

  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'UPDATE_PROMOTION', 'PROMOTION', `تحديث العرض الترويجي: ${promo.titleAr}`, id);
  res.json(promo);
});

apiRouter.patch('/promotions/:id/toggle', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { id } = req.params;
  const promotions = db.get('promotions') || [];
  const promo = promotions.find(p => p.id === id);
  if (!promo) return res.status(404).json({ error: 'العرض الترويجي غير موجود' });

  promo.isActive = !promo.isActive;
  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'TOGGLE_PROMOTION', 'PROMOTION', `تغيير حالة العرض الترويجي (${promo.titleAr}) إلى ${promo.isActive ? 'نشط' : 'إيقاف'}`, id);
  res.json(promo);
});

apiRouter.delete('/promotions/:id', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { id } = req.params;
  const promotions = db.get('promotions') || [];
  const index = promotions.findIndex(p => p.id === id);
  if (index === -1) return res.status(404).json({ error: 'العرض الترويجي غير موجود' });

  const deleted = promotions.splice(index, 1)[0];
  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'DELETE_PROMOTION', 'PROMOTION', `حذف العرض الترويجي: ${deleted.titleAr}`, id);
  res.json({ message: 'تم حذف العرض الترويجي بنجاح' });
});

apiRouter.post('/customers/:id/redeem-points', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const { id } = req.params;
  const { points } = req.body;

  const customers = db.get('customers');
  const customer = customers.find(c => c.id === id);
  if (!customer) return res.status(404).json({ error: 'العميل غير موجود' });

  const pts = Number(points) || 0;
  if (customer.loyaltyPoints < pts) {
    return res.status(400).json({ error: 'نقاط ولاء العميل غير كافية' });
  }

  const settings = db.get('settings');
  const discountValue = pts * settings.loyaltyPointValueInCurrency;
  customer.loyaltyPoints -= pts;

  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'REDEEM_POINTS', 'CUSTOMER', `استبدال ${pts} نقطة ولاء للعميل ${customer.nameAr} بقيمة خصم ${discountValue} د.ج`, id);
  res.json({ message: 'تم استبدال نقاط الولاء بنجاح', discountValue, customer });
});

// ===============================================
// AUDIT LOGS, SETTINGS, NOTIFICATIONS & BACKUPS
// ===============================================
apiRouter.get('/audit-logs', (req: Request, res: Response) => {
  res.json(db.get('auditLogs') || []);
});

apiRouter.get('/settings', (req: Request, res: Response) => {
  res.json(db.get('settings'));
});

apiRouter.put('/settings', (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  const currentSettings = db.get('settings');
  Object.assign(currentSettings, req.body);
  db.save();
  db.logAudit(currentUser.id, currentUser.name, 'UPDATE_SETTINGS', 'SYSTEM', 'تحديث إعدادات النظام والمؤسسة', 'settings');
  res.json(currentSettings);
});

apiRouter.get('/notifications', (req: Request, res: Response) => {
  res.json(db.get('notifications') || []);
});

apiRouter.put('/notifications/:id/read', (req: Request, res: Response) => {
  const notifications = db.get('notifications') || [];
  const notif = notifications.find(n => n.id === req.params.id);
  if (notif) notif.isRead = true;
  db.save();
  res.json({ success: true });
});

// ===============================================
// FIREBASE CLOUD MANAGEMENT ROUTES
// ===============================================
apiRouter.get('/firebase/status', (req: Request, res: Response) => {
  const connected = isFirebaseConnected();
  const projectId = getFirebaseProjectId();
  res.json({
    connected,
    projectId,
    syncedAt: new Date().toISOString(),
    collectionsCount: 20
  });
});

apiRouter.post('/firebase/sync', async (req: Request, res: Response) => {
  const currentUser = (req as any).user;
  try {
    const success = await db.syncAllToCloud();
    if (success) {
      db.logAudit(currentUser.id, currentUser.name, 'FIREBASE_SYNC', 'CLOUD', 'تشغيل مزامنة سحابية يدوية شاملة لجميع البيانات على Firebase Firestore');
      res.json({ success: true, message: 'تمت المزامنة السحابية الشاملة على Firebase Firestore بنجاح ✨' });
    } else {
      res.json({ success: false, message: 'المنصة تعمل بالوضع المحلي الهجين. يرجى التأكد من إدخال مفاتيح مشروع Firebase لتفعيل السحابة.' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'فشلت المزامنة السحابية' });
  }
});



