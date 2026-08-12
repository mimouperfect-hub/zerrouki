import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import {
  User, Role, Permission, Branch, Category, Brand, Unit, Product, ProductBatch,
  StockMovement, WasteRecord, StockAdjustment, Supplier, Purchase, Customer, CustomerPaymentRecord,
  Sale, SaleReturn, CashSession, CashMovement, ExpenseCategory, Expense,
  Employee, AttendanceRecord, LeaveRequest, SalaryAdvance, SalaryBonus,
  SalaryDeduction, PayrollPeriod, PayrollRecord, AuditLog, SystemNotification,
  SystemSettings, Promotion
} from '../src/types';
import {
  isFirebaseConnected,
  saveToFirestoreDoc,
  saveEntireCollectionToFirestore,
  fetchCollectionFromFirestore
} from './firebase';

const isVercel = !!process.env.VERCEL;
const DATA_DIR = isVercel ? '/tmp/data' : path.join(process.cwd(), 'data');
const DB_FILE = isVercel ? '/tmp/data/zerrouki_store.json' : path.join(DATA_DIR, 'zerrouki_store.json');
const BACKUPS_DIR = isVercel ? '/tmp/data/backups' : path.join(DATA_DIR, 'backups');

export interface DatabaseSchema {
  settings: SystemSettings;
  branches: Branch[];
  roles: Role[];
  permissions: Permission[];
  users: User[];
  categories: Category[];
  brands: Brand[];
  units: Unit[];
  products: Product[];
  productBatches: ProductBatch[];
  stockMovements: StockMovement[];
  wastes: WasteRecord[];
  stockAdjustments: StockAdjustment[];
  suppliers: Supplier[];
  purchases: Purchase[];
  customers: Customer[];
  customerPayments: CustomerPaymentRecord[];
  sales: Sale[];
  saleReturns: SaleReturn[];
  cashSessions: CashSession[];
  cashMovements: CashMovement[];
  expenseCategories: ExpenseCategory[];
  expenses: Expense[];
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  salaryAdvances: SalaryAdvance[];
  salaryBonuses: SalaryBonus[];
  salaryDeductions: SalaryDeduction[];
  payrollPeriods: PayrollPeriod[];
  payrollRecords: PayrollRecord[];
  promotions: Promotion[];
  auditLogs: AuditLog[];
  notifications: SystemNotification[];
}

// Initial permissions definition
export const ALL_PERMISSIONS: Permission[] = [
  { id: 'p1', code: 'view_dashboard', nameAr: 'عرض لوحة التحكم', categoryAr: 'الرئيسية' },
  { id: 'p2', code: 'view_products', nameAr: 'عرض المنتجات', categoryAr: 'المنتجات' },
  { id: 'p3', code: 'create_products', nameAr: 'إضافة منتجات', categoryAr: 'المنتجات' },
  { id: 'p4', code: 'edit_products', nameAr: 'تعديل المنتجات', categoryAr: 'المنتجات' },
  { id: 'p5', code: 'delete_products', nameAr: 'تعطيل/حذف المنتجات', categoryAr: 'المنتجات' },
  { id: 'p6', code: 'view_stock', nameAr: 'عرض المخزون', categoryAr: 'المخزون' },
  { id: 'p7', code: 'adjust_stock', nameAr: 'تعديل وحركات المخزون', categoryAr: 'المخزون' },
  { id: 'p8', code: 'create_sale', nameAr: 'إجراء مبيعات POS', categoryAr: 'المبيعات' },
  { id: 'p9', code: 'view_sales', nameAr: 'عرض الفواتير والمبيعات', categoryAr: 'المبيعات' },
  { id: 'p10', code: 'cancel_sale', nameAr: 'إلغاء الفواتير', categoryAr: 'المبيعات' },
  { id: 'p11', code: 'return_sale', nameAr: 'معالجة المرتجعات', categoryAr: 'المبيعات' },
  { id: 'p12', code: 'apply_discount', nameAr: 'إعطاء خصومات', categoryAr: 'المبيعات' },
  { id: 'p13', code: 'create_purchase', nameAr: 'إجراء مشتريات', categoryAr: 'المشتريات' },
  { id: 'p14', code: 'view_purchase', nameAr: 'عرض المشتريات والموردين', categoryAr: 'المشتريات' },
  { id: 'p15', code: 'manage_cash', nameAr: 'فتح وإغلاق الصندوق', categoryAr: 'الخزينة' },
  { id: 'p16', code: 'create_expense', nameAr: 'تسجيل مصاريف', categoryAr: 'المالية' },
  { id: 'p17', code: 'view_profit', nameAr: 'عرض الأرباح والتقارير المالية', categoryAr: 'المالية' },
  { id: 'p18', code: 'manage_customers', nameAr: 'إدارة العملاء والديون', categoryAr: 'العملاء' },
  { id: 'p19', code: 'manage_employees', nameAr: 'إدارة الموظفين والحضور', categoryAr: 'الموظفين' },
  { id: 'p20', code: 'view_salaries', nameAr: 'عرض الرواتب والأجور', categoryAr: 'الرواتب' },
  { id: 'p21', code: 'manage_payroll', nameAr: 'إعداد ودفع الرواتب', categoryAr: 'الرواتب' },
  { id: 'p22', code: 'manage_users', nameAr: 'إدارة المستخدمين والصلاحيات', categoryAr: 'الأمان' },
  { id: 'p23', code: 'view_audit_logs', nameAr: 'عرض سجل العمليات', categoryAr: 'الأمان' },
  { id: 'p24', code: 'manage_settings', nameAr: 'إعدادات النظام والنسخ الاحتياطي', categoryAr: 'النظام' },
];

export const ALL_ROLES: Role[] = [
  {
    id: 'r1',
    code: 'OWNER',
    nameAr: 'المدير العام (صاحب المحل)',
    descriptionAr: 'وصول كامل لكافة صلاحيات النظام والتقارير والنسخ الاحتياطي',
    permissions: ALL_PERMISSIONS.map(p => p.code),
    isSystem: true
  },
  {
    id: 'r2',
    code: 'MANAGER',
    nameAr: 'المسؤول التنفيذي',
    descriptionAr: 'إدارة العمليات اليومية المباشرة (مبيعات، مخزون، مشتريات)',
    permissions: ALL_PERMISSIONS.map(p => p.code).filter(c => !['manage_settings', 'view_dashboard', 'manage_users', 'view_audit_logs'].includes(c)),
    isSystem: true
  },
  {
    id: 'r3',
    code: 'CASHIER',
    nameAr: 'أمين الصندوق (الكاشير/البائع)',
    descriptionAr: 'واجهة نقطة البيع POS والبيع المباشر والعملاء فقط',
    permissions: ['create_sale', 'manage_customers'],
    isSystem: true
  },
  {
    id: 'r4',
    code: 'STOREKEEPER',
    nameAr: 'مسؤول المخزن',
    descriptionAr: 'إدارة المنتجات، الكميات، التالف، المشتريات واستلام الشحنات',
    permissions: ['view_products', 'create_products', 'edit_products', 'view_stock', 'adjust_stock', 'create_purchase', 'view_purchase'],
    isSystem: true
  },
  {
    id: 'r5',
    code: 'ACCOUNTANT',
    nameAr: 'المحاسب',
    descriptionAr: 'التقارير المالية، الأرباح، المصاريف، الرواتب، الديون والسيولة',
    permissions: ['manage_cash', 'create_expense', 'view_profit', 'manage_customers', 'view_salaries', 'manage_payroll'],
    isSystem: true
  }
];

function getInitialSeedData(): DatabaseSchema {
  const now = new Date().toISOString();
  
  return {
    settings: {
      storeNameAr: 'مؤسسة زروقي للحلويات',
      storeNameFr: 'Zerrouki Sweets',
      taglineAr: 'أرقى أنواع الشوكولاتة والحلويات والمستلزمات',
      phone: '0550 12 34 56',
      addressAr: 'شارع فلسطين، المركز التجاري، الجزائر العاصمة',
      currencySymbol: 'د.ج',
      taxPercentage: 0,
      allowNegativeStock: false,
      loyaltyPointsPerAmount: 100,
      loyaltyPointValueInCurrency: 1,
      lowStockAlertThreshold: 10,
      expirationWarningDays: 45,
      defaultOvertimeMultiplier: 1.25,
      managerPin: '1234',
      invoiceFooterAr: 'شكراً لزيارتكم مؤسسة زروقي للحلويات - بضاعتكم محل اهتمامنا!'
    },
    branches: [
      { id: 'br-1', nameAr: 'المحل الرئيسي', addressAr: 'الجزائر العاصمة', phone: '0550123456', isActive: true }
    ],
    roles: ALL_ROLES,
    permissions: ALL_PERMISSIONS,
    users: [
      {
        id: 'u-owner',
        username: 'BRAHIME',
        email: 'admin@zerrouki.dz',
        password: 'admin',
        name: 'المدير العام (صاحب المحل)',
        phone: '0550123456',
        roleCode: 'OWNER',
        branchId: 'br-1',
        isActive: true,
        pinCode: '1234',
        avatarUrl: '',
        createdAt: now,
        lastLoginAt: now
      },
      {
        id: 'u-cashier',
        username: 'cashier',
        email: 'cashier@zerrouki.dz',
        password: '123',
        name: 'البائع (الكاشير)',
        phone: '0661998877',
        roleCode: 'CASHIER',
        branchId: 'br-1',
        isActive: true,
        createdAt: now
      },
      {
        id: 'u-store',
        username: 'storekeeper',
        email: 'store@zerrouki.dz',
        password: '123',
        name: 'مسؤول المخزن',
        phone: '0770554433',
        roleCode: 'STOREKEEPER',
        branchId: 'br-1',
        isActive: true,
        createdAt: now
      },
      {
        id: 'u-accountant',
        username: 'accountant',
        email: 'accountant@zerrouki.dz',
        password: '123',
        name: 'المحاسب المالي',
        phone: '0552331122',
        roleCode: 'ACCOUNTANT',
        branchId: 'br-1',
        isActive: true,
        createdAt: now
      }
    ],
    categories: [],
    brands: [],
    units: [
      { id: 'u1', nameAr: 'قطعة (Unité)', code: 'PCS' },
      { id: 'u2', nameAr: 'علبة (Boîte)', code: 'BOX' },
      { id: 'u3', nameAr: 'كرتونة (Carton)', code: 'CTN' },
      { id: 'u4', nameAr: 'كيلوغرام (Kg)', code: 'KG' }
    ],
    products: [],
    productBatches: [],
    stockMovements: [],
    wastes: [],
    stockAdjustments: [],
    suppliers: [],
    purchases: [],
    customers: [],
    customerPayments: [],
    sales: [],
    saleReturns: [],
    cashSessions: [],
    cashMovements: [],
    expenseCategories: [
      { id: 'ec-1', nameAr: 'الكراء والإيجار', code: 'RENT' },
      { id: 'ec-2', nameAr: 'الكهرباء والغاز والماء', code: 'UTILITIES' },
      { id: 'ec-3', nameAr: 'الانترنت والهاتف', code: 'COMMUNICATION' },
      { id: 'ec-4', nameAr: 'الصيانة والإصلاحات', code: 'MAINTENANCE' },
      { id: 'ec-5', nameAr: 'المستلزمات والتغليف', code: 'PACKAGING' },
      { id: 'ec-6', nameAr: 'رواتب الموظفين', code: 'SALARIES' },
      { id: 'ec-7', nameAr: 'مصاريف نثرية وطارئة', code: 'MISC' }
    ],
    expenses: [],
    employees: [],
    attendanceRecords: [],
    leaveRequests: [],
    salaryAdvances: [],
    salaryBonuses: [],
    salaryDeductions: [],
    payrollPeriods: [],
    payrollRecords: [],
    promotions: [],
    auditLogs: [],
    notifications: []
  };
}

class StoreDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDirectory();
    this.data = this.loadData();
  }

  private ensureDirectory() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (!fs.existsSync(BACKUPS_DIR)) {
        fs.mkdirSync(BACKUPS_DIR, { recursive: true });
      }
    } catch (err) {
      console.warn('Directory creation warning (serverless environment):', err);
    }
  }

  private loadData(): DatabaseSchema {
    try {
      let fileToRead = DB_FILE;
      if (!fs.existsSync(fileToRead)) {
        const fallbackRootFile = path.join(process.cwd(), 'data', 'zerrouki_store.json');
        if (fs.existsSync(fallbackRootFile)) {
          fileToRead = fallbackRootFile;
        }
      }

      if (fs.existsSync(fileToRead)) {
        const fileContent = fs.readFileSync(fileToRead, 'utf-8');
        const parsed = JSON.parse(fileContent);
        // Guarantee structure safety
        return {
          ...getInitialSeedData(),
          ...parsed,
          roles: ALL_ROLES,
          permissions: ALL_PERMISSIONS
        };
      }
    } catch (err) {
      console.error('Error reading database file, loading initial seed data:', err);
    }
    const seed = getInitialSeedData();
    this.saveDataDirect(seed);
    return seed;
  }

  private saveDataDirect(dataToSave: DatabaseSchema) {
    try {
      this.ensureDirectory();
      fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Database save warning (serverless environment note):', err);
    }
  }

  public save() {
    this.saveDataDirect(this.data);
    if (isFirebaseConnected()) {
      this.syncAllToCloud().catch(err => {
        console.warn('[Firebase Cloud] Background cloud sync note:', err.message);
      });
    }
  }

  public async syncToCloudKey<K extends keyof DatabaseSchema>(key: K) {
    if (!isFirebaseConnected()) return false;
    const val = this.data[key];
    if (Array.isArray(val)) {
      return await saveEntireCollectionToFirestore(key as string, val);
    } else if (typeof val === 'object' && val !== null) {
      return await saveToFirestoreDoc('app_settings', key as string, val);
    }
    return false;
  }

  public async syncAllToCloud(): Promise<boolean> {
    if (!isFirebaseConnected()) return false;
    const keys = Object.keys(this.data) as (keyof DatabaseSchema)[];
    for (const key of keys) {
      await this.syncToCloudKey(key);
    }
    return true;
  }

  public get<K extends keyof DatabaseSchema>(key: K): DatabaseSchema[K] {
    if (!this.data) {
      this.data = this.loadData();
    }
    return this.data[key];
  }

  public reloadFromDisk(): DatabaseSchema {
    this.data = this.loadData();
    return this.data;
  }

  public set<K extends keyof DatabaseSchema>(key: K, value: DatabaseSchema[K]) {
    this.data[key] = value;
    this.save();
  }

  public getFullState(): DatabaseSchema {
    return this.data;
  }

  public logAudit(userId: string, userName: string, action: string, entity: string, detailsAr: string, entityId?: string, oldValue?: string, newValue?: string) {
    const log: AuditLog = {
      id: 'al-' + crypto.randomUUID().substring(0, 8),
      userId,
      userName,
      action,
      entity,
      entityId,
      oldValue,
      newValue,
      detailsAr,
      createdAt: new Date().toISOString()
    };
    this.data.auditLogs.unshift(log);
    // keep maximum 500 audit logs
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.save();
  }

  public addNotification(type: SystemNotification['type'], titleAr: string, messageAr: string, referenceId?: string) {
    const notif: SystemNotification = {
      id: 'notif-' + Date.now(),
      type,
      titleAr,
      messageAr,
      referenceId,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    this.data.notifications.unshift(notif);
    this.save();
  }

  public createBackup(): string {
    const filename = `backup_zerrouki_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(BACKUPS_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(this.data, null, 2), 'utf-8');
    return filename;
  }

  public listBackups(): { filename: string; createdAt: string; sizeKb: number }[] {
    if (!fs.existsSync(BACKUPS_DIR)) return [];
    const files = fs.readdirSync(BACKUPS_DIR);
    return files.filter(f => f.endsWith('.json')).map(f => {
      const stats = fs.statSync(path.join(BACKUPS_DIR, f));
      return {
        filename: f,
        createdAt: stats.mtime.toISOString(),
        sizeKb: Math.round(stats.size / 1024)
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public restoreBackup(filename: string): boolean {
    const filepath = path.join(BACKUPS_DIR, filename);
    if (!fs.existsSync(filepath)) return false;
    try {
      const content = fs.readFileSync(filepath, 'utf-8');
      const parsed = JSON.parse(content);
      this.data = parsed;
      this.save();
      return true;
    } catch (e) {
      console.error('Failed to restore backup:', e);
      return false;
    }
  }

  public resetToSeedData() {
    this.data = getInitialSeedData();
    this.save();
  }
}

export const db = new StoreDatabase();
