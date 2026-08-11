export type UserRole = 'OWNER' | 'MANAGER' | 'CASHIER' | 'STOREKEEPER' | 'ACCOUNTANT' | 'DELIVERY' | string;

export interface Permission {
  id: string;
  code: string;
  nameAr: string;
  categoryAr: string;
}

export interface Role {
  id: string;
  code: string;
  nameAr: string;
  nameFr?: string;
  descriptionAr: string;
  permissions: string[]; // Permission codes
  isSystem?: boolean;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  password?: string;
  name: string;
  phone: string;
  roleCode: string;
  branchId: string;
  isActive: boolean;
  pinCode?: string; // For manager approval PIN
  avatarUrl?: string;
  permissions?: string[];
  createdAt: string;
  lastLoginAt?: string;
}

export interface Branch {
  id: string;
  nameAr: string;
  addressAr: string;
  phone: string;
  managerId?: string;
  isActive: boolean;
}

export interface Category {
  id: string;
  nameAr: string;
  nameFr: string;
  icon?: string;
  descriptionAr?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Brand {
  id: string;
  nameAr: string;
  nameFr?: string;
}

export interface Unit {
  id: string;
  nameAr: string; // قطعة، علبة، كرتونة، كغ
  code: string;
}

export interface ProductBatch {
  id: string;
  productId: string;
  batchNumber: string;
  productionDate?: string;
  expirationDate: string; // YYYY-MM-DD
  quantity: number;
  purchasePrice: number;
  supplierId?: string;
  createdAt: string;
}

export interface ProductVariant {
  id: string;
  nameAr: string; // e.g. "علبة 250غ", "علبة 500غ", "علبة 1 كغ" or "شكل دائري"
  nameFr?: string;
  price: number; // سعر البيع الخاص بهذا المتغير (Selling price)
  purchasePrice?: number; // سعر الشراء الخاص بهذا المتغير (Purchase cost for different size/shape)
  stockQuantity?: number; // الكمية الموجودة بالمخزن لهذا المتغير (Stock quantity)
  barcode?: string; // الباركود المخصص لهذا المتغير
}

export interface Product {
  id: string;
  nameAr: string;
  nameFr?: string;
  barcode: string;
  internalCode: string;
  sku: string;
  categoryId: string;
  brandId?: string;
  unitId: string;
  purchasePrice: number;
  sellingPrice: number;
  wholesalePrice?: number;
  minSellingPrice?: number;
  currentStock: number;
  minStock: number;
  maxStock: number;
  supplierId?: string;
  storageLocation?: string;
  imageUrl?: string;
  isActive: boolean;
  hasBatchTracking: boolean;
  batches?: ProductBatch[];
  variants?: ProductVariant[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type StockMovementType = 
  | 'PURCHASE'
  | 'SALE'
  | 'SALE_RETURN'
  | 'PURCHASE_RETURN'
  | 'ADJUSTMENT'
  | 'TRANSFER'
  | 'WASTE'
  | 'EXPIRED'
  | 'MANUAL';

export interface StockMovement {
  id: string;
  productId: string;
  batchId?: string;
  branchId: string;
  type: StockMovementType;
  quantityDelta: number; // positive or negative
  stockAfter: number;
  referenceId?: string; // Sale ID, Purchase ID, etc.
  notes?: string;
  createdByUserId: string;
  createdAt: string;
}

export interface WasteRecord {
  id: string;
  productId: string;
  batchId?: string;
  quantity: number;
  costValue: number;
  reason: 'DAMAGED' | 'EXPIRED' | 'THEFT' | 'LOST' | 'OTHER';
  notes?: string;
  branchId: string;
  createdByUserId: string;
  createdAt: string;
}

export interface StockAdjustment {
  id: string;
  productId: string;
  systemStock: number;
  actualStock: number;
  difference: number;
  reasonAr: string;
  branchId: string;
  approvedByUserId?: string;
  createdByUserId: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  nameAr: string;
  companyName?: string;
  phone: string;
  addressAr?: string;
  email?: string;
  totalPurchases: number;
  totalPaid: number;
  totalDebt: number; // Purchases - Paid
  isActive: boolean;
  notes?: string;
  createdAt: string;
}

export interface PurchaseItem {
  id: string;
  productId: string;
  productNameAr: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  batchNumber?: string;
  expirationDate?: string;
}

export interface Purchase {
  id: string;
  invoiceNumber: string;
  supplierInvoiceRef?: string;
  supplierId: string;
  supplierNameAr: string;
  branchId: string;
  purchaseDate: string;
  items: PurchaseItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  paidAmount: number;
  remainingDebt: number;
  paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'CREDIT';
  notes?: string;
  createdByUserId: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  nameAr: string;
  phone: string;
  addressAr?: string;
  email?: string;
  totalPurchases: number;
  totalPaid: number;
  totalDebt: number;
  loyaltyPoints: number;
  notes?: string;
  createdAt: string;
}

export interface CustomerPaymentRecord {
  id: string;
  customerId: string;
  customerNameAr: string;
  amount: number;
  paymentDate: string;
  notes?: string;
  createdByUserId: string;
  createdByUserName?: string;
  createdAt: string;
}

export type PaymentMethod = 'CASH' | 'CARD' | 'DEBT' | 'CHECK' | 'OTHER' | 'MIXED' | 'CREDIT';

export interface SalePayment {
  method: Exclude<PaymentMethod, 'MIXED' | 'CREDIT'>;
  amount: number;
  reference?: string;
}

export interface SaleItem {
  id: string;
  productId: string;
  productNameAr: string;
  selectedVariantNameAr?: string;
  barcode: string;
  quantity: number;
  unitPrice: number;
  purchasePrice: number; // for COGS calculation
  discountAmount: number;
  totalPrice: number;
  batchId?: string;
  expirationDate?: string;
}

export type SaleStatus = 'COMPLETED' | 'CANCELLED' | 'PARTIALLY_RETURNED' | 'FULLY_RETURNED';

export interface Sale {
  id: string;
  invoiceNumber: string;
  branchId: string;
  cashSessionId?: string;
  customerId?: string;
  customerNameAr?: string;
  items: SaleItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  paidAmount: number;
  changeAmount: number;
  remainingDebt: number;
  paymentMethod: PaymentMethod;
  paymentStatus?: 'PAID' | 'PARTIALLY_PAID' | 'CREDIT';
  payments: SalePayment[];
  status: SaleStatus;
  cancellationReason?: string;
  cancelledByUserId?: string;
  createdByUserId: string;
  createdByUserName: string;
  createdAt: string;
}

export interface SaleReturnItem {
  saleItemId: string;
  productId: string;
  productNameAr: string;
  returnedQuantity: number;
  unitPrice: number;
  refundAmount: number;
}

export interface SaleReturn {
  id: string;
  saleId: string;
  invoiceNumber: string;
  items: SaleReturnItem[];
  totalRefundAmount: number;
  reasonAr: string;
  createdByUserId: string;
  createdAt: string;
}

export interface CashSession {
  id: string;
  branchId: string;
  userId: string;
  userName: string;
  openingBalance: number;
  openingNotes?: string;
  openedAt: string;
  closingBalanceExpected?: number;
  closingBalanceActual?: number;
  difference?: number; // actual - expected
  closingNotes?: string;
  closedAt?: string;
  status: 'OPEN' | 'CLOSED';
  totalSalesCash: number;
  totalSalesCard: number;
  totalSalesOther: number;
  totalReturnsCash: number;
  totalExpensesCash: number;
  totalCashIn: number;
  totalCashOut: number;
}

export interface CashMovement {
  id: string;
  cashSessionId: string;
  type: 'CASH_IN' | 'CASH_OUT';
  amount: number;
  category: string;
  reasonAr: string;
  createdByUserId: string;
  createdAt: string;
}

export interface ExpenseCategory {
  id: string;
  nameAr: string;
  code: string;
}

export interface Expense {
  id: string;
  categoryId: string;
  categoryNameAr: string;
  amount: number;
  expenseDate: string;
  descriptionAr: string;
  cashSessionId?: string;
  receiptNumber?: string;
  createdByUserId: string;
  branchId: string;
  createdAt: string;
}

export type SalaryType = 'MONTHLY' | 'DAILY' | 'HOURLY' | 'COMMISSION' | 'SALARY_PLUS_COMMISSION';

export interface Employee {
  id: string;
  fullNameAr: string;
  photoUrl?: string;
  phone: string;
  positionAr: string;
  branchId: string;
  startDate: string;
  contractType: 'FULL_TIME' | 'PART_TIME' | 'SEASONAL';
  salaryType: SalaryType;
  baseSalary: number;
  dailyRate?: number;
  hourlyRate?: number;
  commissionRatePercent?: number;
  workingHoursPerDay: number;
  workingDaysPerMonth: number;
  restDayAr: string;
  workStartTime?: string; // e.g. "08:00"
  workEndTime?: string; // e.g. "17:00"
  offDays?: string[]; // e.g. ["الجمعة", "السبت"]
  lateToleranceMinutes?: number; // e.g. 15
  userId?: string; // Linked system user account for QR checkin
  isActive: boolean;
  notes?: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeNameAr: string;
  date: string; // YYYY-MM-DD
  checkIn?: string; // HH:mm
  checkOut?: string; // HH:mm
  workingHours: number;
  overtimeHours: number;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE' | 'REST_DAY';
  notes?: string;
  createdByUserId: string;
  createdAt: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeNameAr: string;
  leaveType: 'ANNUAL' | 'SICK' | 'EMERGENCY' | 'UNPAID' | 'OTHER';
  startDate: string;
  endDate: string;
  daysCount: number;
  reasonAr: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedByUserId?: string;
  createdAt: string;
}

export interface SalaryAdvance {
  id: string;
  employeeId: string;
  employeeNameAr: string;
  amount: number;
  requestDate: string;
  reasonAr: string;
  repaymentMonths: number;
  repaidAmount: number;
  remainingAmount: number;
  status: 'PENDING' | 'APPROVED' | 'REPAID' | 'REJECTED';
  approvedByUserId?: string;
  createdAt: string;
}

export interface SalaryBonus {
  id: string;
  employeeId: string;
  employeeNameAr: string;
  amount: number;
  reasonAr: string;
  date: string;
  payrollPeriodId?: string;
  createdByUserId: string;
  createdAt: string;
}

export interface SalaryDeduction {
  id: string;
  employeeId: string;
  employeeNameAr: string;
  amount: number;
  reasonAr: string;
  date: string;
  payrollPeriodId?: string;
  createdByUserId: string;
  createdAt: string;
}

export interface PayrollPeriod {
  id: string;
  periodNameAr: string; // e.g. "أوت 2026"
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'APPROVED' | 'PAID';
  totalNetSalaries: number;
  totalPaidSalaries: number;
  createdAt: string;
}

export interface PayrollRecord {
  id: string;
  payrollPeriodId: string;
  employeeId: string;
  employeeNameAr: string;
  positionAr: string;
  baseSalary: number;
  workedDays: number;
  absentDays: number;
  lateHours: number;
  overtimeHours: number;
  overtimePay: number;
  commissionPay: number;
  bonusesTotal: number;
  deductionsTotal: number;
  advancesDeducted: number;
  netSalary: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID';
  paymentDate?: string;
  paymentMethod?: 'CASH' | 'OTHER';
  notes?: string;
  createdAt: string;
}

export interface Promotion {
  id: string;
  titleAr: string;
  type: 'PERCENTAGE' | 'FIXED' | 'BUY_X_GET_Y' | 'BUNDLE';
  discountValue: number; // percentage or fixed DA
  buyQuantity?: number;
  getQuantity?: number;
  applicableProductIds?: string[];
  applicableCategoryIds?: string[];
  minPurchaseAmount?: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string; // LOGIN, SALE_CANCEL, STOCK_ADJUST, SALARY_PAY, etc.
  entity: string;
  entityId?: string;
  oldValue?: string;
  newValue?: string;
  detailsAr: string;
  ipAddress?: string;
  createdAt: string;
}

export interface SystemNotification {
  id: string;
  type: 'LOW_STOCK' | 'EXPIRED' | 'NEAR_EXPIRATION' | 'DEBT_ALERT' | 'APPROVAL_REQUIRED' | 'SYSTEM';
  titleAr: string;
  messageAr: string;
  referenceId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface SystemSettings {
  storeNameAr: string;
  storeNameFr: string;
  taglineAr: string;
  phone: string;
  addressAr: string;
  currencySymbol: string; // د.ج / DZD
  taxPercentage: number;
  allowNegativeStock: boolean;
  loyaltyPointsPerAmount: number; // e.g., 1 point per 100 DA
  loyaltyPointValueInCurrency: number; // e.g. 1 point = 1 DA
  lowStockAlertThreshold: number;
  expirationWarningDays: number;
  defaultOvertimeMultiplier: number; // e.g. 1.25
  managerPin: string; // default manager PIN e.g., "1234"
  invoiceFooterAr: string;
}

export interface BackupFile {
  filename: string;
  createdAt: string;
  sizeKb: number;
}

export type ActiveView =
  | 'DASHBOARD'
  | 'POS'
  | 'SALES'
  | 'PRODUCTS'
  | 'INVENTORY'
  | 'PURCHASES'
  | 'SUPPLIERS'
  | 'CUSTOMERS'
  | 'CASH'
  | 'EMPLOYEES'
  | 'PAYROLL'
  | 'PROMOTIONS'
  | 'REPORTS'
  | 'NOTIFICATIONS'
  | 'AUDIT_LOGS'
  | 'SETTINGS';

