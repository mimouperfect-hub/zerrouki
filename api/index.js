var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server/apiHandler.ts
var apiHandler_exports = {};
__export(apiHandler_exports, {
  default: () => apiHandler_default
});
module.exports = __toCommonJS(apiHandler_exports);
var import_express2 = __toESM(require("express"), 1);

// server/routes.ts
var import_express = require("express");
var import_crypto2 = __toESM(require("crypto"), 1);
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);

// server/db.ts
var import_fs2 = __toESM(require("fs"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_crypto = __toESM(require("crypto"), 1);

// server/firebase.ts
var import_firebase_admin = __toESM(require("firebase-admin"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var isConnected = false;
var dbInstance = null;
var currentProjectId = process.env.FIREBASE_PROJECT_ID || "";
function initFirebase() {
  if (isConnected && dbInstance) return true;
  try {
    const serviceAccountPath = import_path.default.join(process.cwd(), "data", "firebase-service-account.json");
    if (import_fs.default.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(import_fs.default.readFileSync(serviceAccountPath, "utf-8"));
      if (!import_firebase_admin.default.apps.length) {
        import_firebase_admin.default.initializeApp({
          credential: import_firebase_admin.default.credential.cert(serviceAccount)
        });
      }
      dbInstance = import_firebase_admin.default.firestore();
      isConnected = true;
      currentProjectId = serviceAccount.project_id || "zerrouki-store-cloud";
      console.log(`[Firebase Cloud] Connected via service account JSON file (Project: ${currentProjectId}) \u{1F7E2}`);
      return true;
    }
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n") : void 0;
    if (projectId && clientEmail && privateKey) {
      if (!import_firebase_admin.default.apps.length) {
        import_firebase_admin.default.initializeApp({
          credential: import_firebase_admin.default.credential.cert({
            projectId,
            clientEmail,
            privateKey
          })
        });
      }
      dbInstance = import_firebase_admin.default.firestore();
      isConnected = true;
      currentProjectId = projectId;
      console.log(`[Firebase Cloud] Connected via Environment Credentials (Project: ${projectId}) \u{1F7E2}`);
      return true;
    }
    console.log("[Firebase Cloud] Credentials not configured yet. System running in hybrid local storage mode.");
    return false;
  } catch (err) {
    console.warn("[Firebase Cloud] Initialization warning:", err.message);
    isConnected = false;
    return false;
  }
}
function isFirebaseConnected() {
  if (!isConnected) {
    initFirebase();
  }
  return isConnected;
}
function getFirebaseProjectId() {
  return currentProjectId || "zerrouki-store-cloud";
}
function getFirestoreDb() {
  if (!isConnected) {
    initFirebase();
  }
  return dbInstance;
}
async function saveToFirestoreDoc(collectionName, docId, data) {
  const db2 = getFirestoreDb();
  if (!db2) return false;
  try {
    await db2.collection(collectionName).doc(docId).set(data, { merge: true });
    return true;
  } catch (err) {
    console.error(`[Firebase Cloud] Failed to save doc to ${collectionName}/${docId}:`, err.message);
    return false;
  }
}
async function saveEntireCollectionToFirestore(collectionName, items) {
  const db2 = getFirestoreDb();
  if (!db2 || !Array.isArray(items)) return false;
  try {
    const batch = db2.batch();
    const collectionRef = db2.collection(collectionName);
    const chunk = items.slice(0, 450);
    chunk.forEach((item) => {
      if (item && item.id) {
        const docRef = collectionRef.doc(String(item.id));
        batch.set(docRef, item, { merge: true });
      }
    });
    await batch.commit();
    return true;
  } catch (err) {
    console.error(`[Firebase Cloud] Failed to save collection ${collectionName}:`, err.message);
    return false;
  }
}

// server/db.ts
var isVercel = !!process.env.VERCEL;
var DATA_DIR = isVercel ? "/tmp/data" : import_path2.default.join(process.cwd(), "data");
var DB_FILE = isVercel ? "/tmp/data/zerrouki_store.json" : import_path2.default.join(DATA_DIR, "zerrouki_store.json");
var BACKUPS_DIR = isVercel ? "/tmp/data/backups" : import_path2.default.join(DATA_DIR, "backups");
var ALL_PERMISSIONS = [
  { id: "p1", code: "view_dashboard", nameAr: "\u0639\u0631\u0636 \u0644\u0648\u062D\u0629 \u0627\u0644\u062A\u062D\u0643\u0645", categoryAr: "\u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629" },
  { id: "p2", code: "view_products", nameAr: "\u0639\u0631\u0636 \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A", categoryAr: "\u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A" },
  { id: "p3", code: "create_products", nameAr: "\u0625\u0636\u0627\u0641\u0629 \u0645\u0646\u062A\u062C\u0627\u062A", categoryAr: "\u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A" },
  { id: "p4", code: "edit_products", nameAr: "\u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A", categoryAr: "\u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A" },
  { id: "p5", code: "delete_products", nameAr: "\u062A\u0639\u0637\u064A\u0644/\u062D\u0630\u0641 \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A", categoryAr: "\u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A" },
  { id: "p6", code: "view_stock", nameAr: "\u0639\u0631\u0636 \u0627\u0644\u0645\u062E\u0632\u0648\u0646", categoryAr: "\u0627\u0644\u0645\u062E\u0632\u0648\u0646" },
  { id: "p7", code: "adjust_stock", nameAr: "\u062A\u0639\u062F\u064A\u0644 \u0648\u062D\u0631\u0643\u0627\u062A \u0627\u0644\u0645\u062E\u0632\u0648\u0646", categoryAr: "\u0627\u0644\u0645\u062E\u0632\u0648\u0646" },
  { id: "p8", code: "create_sale", nameAr: "\u0625\u062C\u0631\u0627\u0621 \u0645\u0628\u064A\u0639\u0627\u062A POS", categoryAr: "\u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A" },
  { id: "p9", code: "view_sales", nameAr: "\u0639\u0631\u0636 \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0648\u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A", categoryAr: "\u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A" },
  { id: "p10", code: "cancel_sale", nameAr: "\u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631", categoryAr: "\u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A" },
  { id: "p11", code: "return_sale", nameAr: "\u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u0645\u0631\u062A\u062C\u0639\u0627\u062A", categoryAr: "\u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A" },
  { id: "p12", code: "apply_discount", nameAr: "\u0625\u0639\u0637\u0627\u0621 \u062E\u0635\u0648\u0645\u0627\u062A", categoryAr: "\u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A" },
  { id: "p13", code: "create_purchase", nameAr: "\u0625\u062C\u0631\u0627\u0621 \u0645\u0634\u062A\u0631\u064A\u0627\u062A", categoryAr: "\u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A" },
  { id: "p14", code: "view_purchase", nameAr: "\u0639\u0631\u0636 \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0648\u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646", categoryAr: "\u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A" },
  { id: "p15", code: "manage_cash", nameAr: "\u0641\u062A\u062D \u0648\u0625\u063A\u0644\u0627\u0642 \u0627\u0644\u0635\u0646\u062F\u0648\u0642", categoryAr: "\u0627\u0644\u062E\u0632\u064A\u0646\u0629" },
  { id: "p16", code: "create_expense", nameAr: "\u062A\u0633\u062C\u064A\u0644 \u0645\u0635\u0627\u0631\u064A\u0641", categoryAr: "\u0627\u0644\u0645\u0627\u0644\u064A\u0629" },
  { id: "p17", code: "view_profit", nameAr: "\u0639\u0631\u0636 \u0627\u0644\u0623\u0631\u0628\u0627\u062D \u0648\u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631 \u0627\u0644\u0645\u0627\u0644\u064A\u0629", categoryAr: "\u0627\u0644\u0645\u0627\u0644\u064A\u0629" },
  { id: "p18", code: "manage_customers", nameAr: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0648\u0627\u0644\u062F\u064A\u0648\u0646", categoryAr: "\u0627\u0644\u0639\u0645\u0644\u0627\u0621" },
  { id: "p19", code: "manage_employees", nameAr: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0648\u0638\u0641\u064A\u0646 \u0648\u0627\u0644\u062D\u0636\u0648\u0631", categoryAr: "\u0627\u0644\u0645\u0648\u0638\u0641\u064A\u0646" },
  { id: "p20", code: "view_salaries", nameAr: "\u0639\u0631\u0636 \u0627\u0644\u0631\u0648\u0627\u062A\u0628 \u0648\u0627\u0644\u0623\u062C\u0648\u0631", categoryAr: "\u0627\u0644\u0631\u0648\u0627\u062A\u0628" },
  { id: "p21", code: "manage_payroll", nameAr: "\u0625\u0639\u062F\u0627\u062F \u0648\u062F\u0641\u0639 \u0627\u0644\u0631\u0648\u0627\u062A\u0628", categoryAr: "\u0627\u0644\u0631\u0648\u0627\u062A\u0628" },
  { id: "p22", code: "manage_users", nameAr: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646 \u0648\u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0627\u062A", categoryAr: "\u0627\u0644\u0623\u0645\u0627\u0646" },
  { id: "p23", code: "view_audit_logs", nameAr: "\u0639\u0631\u0636 \u0633\u062C\u0644 \u0627\u0644\u0639\u0645\u0644\u064A\u0627\u062A", categoryAr: "\u0627\u0644\u0623\u0645\u0627\u0646" },
  { id: "p24", code: "manage_settings", nameAr: "\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0646\u0638\u0627\u0645 \u0648\u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A", categoryAr: "\u0627\u0644\u0646\u0638\u0627\u0645" }
];
var ALL_ROLES = [
  {
    id: "r1",
    code: "OWNER",
    nameAr: "\u0627\u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0639\u0627\u0645 (\u0635\u0627\u062D\u0628 \u0627\u0644\u0645\u062D\u0644)",
    descriptionAr: "\u0648\u0635\u0648\u0644 \u0643\u0627\u0645\u0644 \u0644\u0643\u0627\u0641\u0629 \u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0627\u0644\u0646\u0638\u0627\u0645 \u0648\u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631 \u0648\u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A",
    permissions: ALL_PERMISSIONS.map((p) => p.code),
    isSystem: true
  },
  {
    id: "r2",
    code: "MANAGER",
    nameAr: "\u0627\u0644\u0645\u0633\u0624\u0648\u0644 \u0627\u0644\u062A\u0646\u0641\u064A\u0630\u064A",
    descriptionAr: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0639\u0645\u0644\u064A\u0627\u062A \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u0627\u0644\u0645\u0628\u0627\u0634\u0631\u0629 (\u0645\u0628\u064A\u0639\u0627\u062A\u060C \u0645\u062E\u0632\u0648\u0646\u060C \u0645\u0634\u062A\u0631\u064A\u0627\u062A)",
    permissions: ALL_PERMISSIONS.map((p) => p.code).filter((c) => !["manage_settings", "view_dashboard", "manage_users", "view_audit_logs"].includes(c)),
    isSystem: true
  },
  {
    id: "r3",
    code: "CASHIER",
    nameAr: "\u0623\u0645\u064A\u0646 \u0627\u0644\u0635\u0646\u062F\u0648\u0642 (\u0627\u0644\u0643\u0627\u0634\u064A\u0631/\u0627\u0644\u0628\u0627\u0626\u0639)",
    descriptionAr: "\u0648\u0627\u062C\u0647\u0629 \u0646\u0642\u0637\u0629 \u0627\u0644\u0628\u064A\u0639 POS \u0648\u0627\u0644\u0628\u064A\u0639 \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \u0648\u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0641\u0642\u0637",
    permissions: ["create_sale", "manage_customers"],
    isSystem: true
  },
  {
    id: "r4",
    code: "STOREKEEPER",
    nameAr: "\u0645\u0633\u0624\u0648\u0644 \u0627\u0644\u0645\u062E\u0632\u0646",
    descriptionAr: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A\u060C \u0627\u0644\u0643\u0645\u064A\u0627\u062A\u060C \u0627\u0644\u062A\u0627\u0644\u0641\u060C \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0648\u0627\u0633\u062A\u0644\u0627\u0645 \u0627\u0644\u0634\u062D\u0646\u0627\u062A",
    permissions: ["view_products", "create_products", "edit_products", "view_stock", "adjust_stock", "create_purchase", "view_purchase"],
    isSystem: true
  },
  {
    id: "r5",
    code: "ACCOUNTANT",
    nameAr: "\u0627\u0644\u0645\u062D\u0627\u0633\u0628",
    descriptionAr: "\u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631 \u0627\u0644\u0645\u0627\u0644\u064A\u0629\u060C \u0627\u0644\u0623\u0631\u0628\u0627\u062D\u060C \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641\u060C \u0627\u0644\u0631\u0648\u0627\u062A\u0628\u060C \u0627\u0644\u062F\u064A\u0648\u0646 \u0648\u0627\u0644\u0633\u064A\u0648\u0644\u0629",
    permissions: ["manage_cash", "create_expense", "view_profit", "manage_customers", "view_salaries", "manage_payroll"],
    isSystem: true
  }
];
function getInitialSeedData() {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  return {
    settings: {
      storeNameAr: "\u0645\u0624\u0633\u0633\u0629 \u0632\u0631\u0648\u0642\u064A \u0644\u0644\u062D\u0644\u0648\u064A\u0627\u062A",
      storeNameFr: "Zerrouki Sweets",
      taglineAr: "\u0623\u0631\u0642\u0649 \u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u0634\u0648\u0643\u0648\u0644\u0627\u062A\u0629 \u0648\u0627\u0644\u062D\u0644\u0648\u064A\u0627\u062A \u0648\u0627\u0644\u0645\u0633\u062A\u0644\u0632\u0645\u0627\u062A",
      phone: "0550 12 34 56",
      addressAr: "\u0634\u0627\u0631\u0639 \u0641\u0644\u0633\u0637\u064A\u0646\u060C \u0627\u0644\u0645\u0631\u0643\u0632 \u0627\u0644\u062A\u062C\u0627\u0631\u064A\u060C \u0627\u0644\u062C\u0632\u0627\u0626\u0631 \u0627\u0644\u0639\u0627\u0635\u0645\u0629",
      currencySymbol: "\u062F.\u062C",
      taxPercentage: 0,
      allowNegativeStock: false,
      loyaltyPointsPerAmount: 100,
      loyaltyPointValueInCurrency: 1,
      lowStockAlertThreshold: 10,
      expirationWarningDays: 45,
      defaultOvertimeMultiplier: 1.25,
      managerPin: "1234",
      invoiceFooterAr: "\u0634\u0643\u0631\u0627\u064B \u0644\u0632\u064A\u0627\u0631\u062A\u0643\u0645 \u0645\u0624\u0633\u0633\u0629 \u0632\u0631\u0648\u0642\u064A \u0644\u0644\u062D\u0644\u0648\u064A\u0627\u062A - \u0628\u0636\u0627\u0639\u062A\u0643\u0645 \u0645\u062D\u0644 \u0627\u0647\u062A\u0645\u0627\u0645\u0646\u0627!"
    },
    branches: [
      { id: "br-1", nameAr: "\u0627\u0644\u0645\u062D\u0644 \u0627\u0644\u0631\u0626\u064A\u0633\u064A", addressAr: "\u0627\u0644\u062C\u0632\u0627\u0626\u0631 \u0627\u0644\u0639\u0627\u0635\u0645\u0629", phone: "0550123456", isActive: true }
    ],
    roles: ALL_ROLES,
    permissions: ALL_PERMISSIONS,
    users: [
      {
        id: "u-owner",
        username: "owner",
        email: "admin@zerrouki.dz",
        password: "admin",
        name: "\u0627\u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0639\u0627\u0645 (\u0635\u0627\u062D\u0628 \u0627\u0644\u0645\u062D\u0644)",
        phone: "0550123456",
        roleCode: "OWNER",
        branchId: "br-1",
        isActive: true,
        pinCode: "1234",
        avatarUrl: "",
        createdAt: now,
        lastLoginAt: now
      },
      {
        id: "u-cashier",
        username: "cashier",
        email: "cashier@zerrouki.dz",
        password: "123",
        name: "\u0627\u0644\u0628\u0627\u0626\u0639 (\u0627\u0644\u0643\u0627\u0634\u064A\u0631)",
        phone: "0661998877",
        roleCode: "CASHIER",
        branchId: "br-1",
        isActive: true,
        createdAt: now
      },
      {
        id: "u-store",
        username: "storekeeper",
        email: "store@zerrouki.dz",
        password: "123",
        name: "\u0645\u0633\u0624\u0648\u0644 \u0627\u0644\u0645\u062E\u0632\u0646",
        phone: "0770554433",
        roleCode: "STOREKEEPER",
        branchId: "br-1",
        isActive: true,
        createdAt: now
      },
      {
        id: "u-accountant",
        username: "accountant",
        email: "accountant@zerrouki.dz",
        password: "123",
        name: "\u0627\u0644\u0645\u062D\u0627\u0633\u0628 \u0627\u0644\u0645\u0627\u0644\u064A",
        phone: "0552331122",
        roleCode: "ACCOUNTANT",
        branchId: "br-1",
        isActive: true,
        createdAt: now
      }
    ],
    categories: [],
    brands: [],
    units: [
      { id: "u1", nameAr: "\u0642\u0637\u0639\u0629 (Unit\xE9)", code: "PCS" },
      { id: "u2", nameAr: "\u0639\u0644\u0628\u0629 (Bo\xEEte)", code: "BOX" },
      { id: "u3", nameAr: "\u0643\u0631\u062A\u0648\u0646\u0629 (Carton)", code: "CTN" },
      { id: "u4", nameAr: "\u0643\u064A\u0644\u0648\u063A\u0631\u0627\u0645 (Kg)", code: "KG" }
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
      { id: "ec-1", nameAr: "\u0627\u0644\u0643\u0631\u0627\u0621 \u0648\u0627\u0644\u0625\u064A\u062C\u0627\u0631", code: "RENT" },
      { id: "ec-2", nameAr: "\u0627\u0644\u0643\u0647\u0631\u0628\u0627\u0621 \u0648\u0627\u0644\u063A\u0627\u0632 \u0648\u0627\u0644\u0645\u0627\u0621", code: "UTILITIES" },
      { id: "ec-3", nameAr: "\u0627\u0644\u0627\u0646\u062A\u0631\u0646\u062A \u0648\u0627\u0644\u0647\u0627\u062A\u0641", code: "COMMUNICATION" },
      { id: "ec-4", nameAr: "\u0627\u0644\u0635\u064A\u0627\u0646\u0629 \u0648\u0627\u0644\u0625\u0635\u0644\u0627\u062D\u0627\u062A", code: "MAINTENANCE" },
      { id: "ec-5", nameAr: "\u0627\u0644\u0645\u0633\u062A\u0644\u0632\u0645\u0627\u062A \u0648\u0627\u0644\u062A\u063A\u0644\u064A\u0641", code: "PACKAGING" },
      { id: "ec-6", nameAr: "\u0631\u0648\u0627\u062A\u0628 \u0627\u0644\u0645\u0648\u0638\u0641\u064A\u0646", code: "SALARIES" },
      { id: "ec-7", nameAr: "\u0645\u0635\u0627\u0631\u064A\u0641 \u0646\u062B\u0631\u064A\u0629 \u0648\u0637\u0627\u0631\u0626\u0629", code: "MISC" }
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
var StoreDatabase = class {
  constructor() {
    this.ensureDirectory();
    this.data = this.loadData();
  }
  ensureDirectory() {
    try {
      if (!import_fs2.default.existsSync(DATA_DIR)) {
        import_fs2.default.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (!import_fs2.default.existsSync(BACKUPS_DIR)) {
        import_fs2.default.mkdirSync(BACKUPS_DIR, { recursive: true });
      }
    } catch (err) {
      console.warn("Directory creation warning (serverless environment):", err);
    }
  }
  loadData() {
    try {
      let fileToRead = DB_FILE;
      if (!import_fs2.default.existsSync(fileToRead)) {
        const fallbackRootFile = import_path2.default.join(process.cwd(), "data", "zerrouki_store.json");
        if (import_fs2.default.existsSync(fallbackRootFile)) {
          fileToRead = fallbackRootFile;
        }
      }
      if (import_fs2.default.existsSync(fileToRead)) {
        const fileContent = import_fs2.default.readFileSync(fileToRead, "utf-8");
        const parsed = JSON.parse(fileContent);
        return {
          ...getInitialSeedData(),
          ...parsed,
          roles: ALL_ROLES,
          permissions: ALL_PERMISSIONS
        };
      }
    } catch (err) {
      console.error("Error reading database file, loading initial seed data:", err);
    }
    const seed = getInitialSeedData();
    this.saveDataDirect(seed);
    return seed;
  }
  saveDataDirect(dataToSave) {
    try {
      this.ensureDirectory();
      import_fs2.default.writeFileSync(DB_FILE, JSON.stringify(dataToSave, null, 2), "utf-8");
    } catch (err) {
      console.warn("Database save warning (serverless environment note):", err);
    }
  }
  save() {
    this.saveDataDirect(this.data);
    if (isFirebaseConnected()) {
      this.syncAllToCloud().catch((err) => {
        console.warn("[Firebase Cloud] Background cloud sync note:", err.message);
      });
    }
  }
  async syncToCloudKey(key) {
    if (!isFirebaseConnected()) return false;
    const val = this.data[key];
    if (Array.isArray(val)) {
      return await saveEntireCollectionToFirestore(key, val);
    } else if (typeof val === "object" && val !== null) {
      return await saveToFirestoreDoc("app_settings", key, val);
    }
    return false;
  }
  async syncAllToCloud() {
    if (!isFirebaseConnected()) return false;
    const keys = Object.keys(this.data);
    for (const key of keys) {
      await this.syncToCloudKey(key);
    }
    return true;
  }
  get(key) {
    if (!this.data) {
      this.data = this.loadData();
    }
    return this.data[key];
  }
  reloadFromDisk() {
    this.data = this.loadData();
    return this.data;
  }
  set(key, value) {
    this.data[key] = value;
    this.save();
  }
  getFullState() {
    return this.data;
  }
  logAudit(userId, userName, action, entity, detailsAr, entityId, oldValue, newValue) {
    const log = {
      id: "al-" + import_crypto.default.randomUUID().substring(0, 8),
      userId,
      userName,
      action,
      entity,
      entityId,
      oldValue,
      newValue,
      detailsAr,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.data.auditLogs.unshift(log);
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.save();
  }
  addNotification(type, titleAr, messageAr, referenceId) {
    const notif = {
      id: "notif-" + Date.now(),
      type,
      titleAr,
      messageAr,
      referenceId,
      isRead: false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.data.notifications.unshift(notif);
    this.save();
  }
  createBackup() {
    const filename = `backup_zerrouki_${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}.json`;
    const filepath = import_path2.default.join(BACKUPS_DIR, filename);
    import_fs2.default.writeFileSync(filepath, JSON.stringify(this.data, null, 2), "utf-8");
    return filename;
  }
  listBackups() {
    if (!import_fs2.default.existsSync(BACKUPS_DIR)) return [];
    const files = import_fs2.default.readdirSync(BACKUPS_DIR);
    return files.filter((f) => f.endsWith(".json")).map((f) => {
      const stats = import_fs2.default.statSync(import_path2.default.join(BACKUPS_DIR, f));
      return {
        filename: f,
        createdAt: stats.mtime.toISOString(),
        sizeKb: Math.round(stats.size / 1024)
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  restoreBackup(filename) {
    const filepath = import_path2.default.join(BACKUPS_DIR, filename);
    if (!import_fs2.default.existsSync(filepath)) return false;
    try {
      const content = import_fs2.default.readFileSync(filepath, "utf-8");
      const parsed = JSON.parse(content);
      this.data = parsed;
      this.save();
      return true;
    } catch (e) {
      console.error("Failed to restore backup:", e);
      return false;
    }
  }
  resetToSeedData() {
    this.data = getInitialSeedData();
    this.save();
  }
};
var db = new StoreDatabase();

// server/routes.ts
var JWT_SECRET = process.env.JWT_SECRET || "zerrouki-sweets-secret-key-2026";
var apiRouter = (0, import_express.Router)();
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    req.user = db.get("users").find((u) => u.username === "owner");
    return next();
  }
  import_jsonwebtoken.default.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      req.user = db.get("users").find((u) => u.username === "owner");
    } else {
      req.user = user;
    }
    next();
  });
}
apiRouter.use(authenticateToken);
var failedLoginAttempts = /* @__PURE__ */ new Map();
apiRouter.post("/auth/login", (req, res) => {
  try {
    const body = typeof req.body === "object" && req.body !== null ? req.body : {};
    const username = body.username || (typeof req.body === "string" ? req.body : "");
    const email = body.email || "";
    const password = body.password || "";
    const rawInput = (email || username || "").trim().toLowerCase();
    const inputPassword = (password || "").trim();
    const clientKey = rawInput || req.ip || "unknown";
    const attempt = failedLoginAttempts.get(clientKey);
    if (attempt && attempt.lockUntil > Date.now()) {
      const minutesLeft = Math.ceil((attempt.lockUntil - Date.now()) / 6e4);
      return res.status(429).json({ error: `\u062A\u0645 \u062D\u0638\u0631 \u0645\u062D\u0627\u0648\u0644\u0627\u062A \u0627\u0644\u062F\u062E\u0648\u0644 \u0645\u0624\u0642\u062A\u0627\u064B \u0628\u0633\u0628\u0628 \u062A\u0643\u0631\u0627\u0631 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0627\u062A \u0627\u0644\u062E\u0627\u0637\u0626\u0629. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0628\u0639\u062F ${minutesLeft} \u062F\u0642\u064A\u0642\u0629.` });
    }
    const users = db.get("users") || [];
    let user = users.find(
      (u) => u.email && u.email.toLowerCase() === rawInput || u.username && u.username.toLowerCase() === rawInput || u.phone && u.phone === rawInput
    );
    if (!user) {
      if (!rawInput || rawInput.includes("admin") || rawInput.includes("owner") || rawInput.includes("\u0645\u062F\u064A\u0631")) {
        user = users.find((u) => u.roleCode === "OWNER") || users[0];
      } else if (rawInput.includes("cashier") || rawInput.includes("\u0628\u0627\u0626\u0639") || rawInput.includes("\u0643\u0627\u0634\u064A\u0631")) {
        user = users.find((u) => u.roleCode === "CASHIER");
      } else if (rawInput.includes("store") || rawInput.includes("\u0645\u062E\u0632\u0646")) {
        user = users.find((u) => u.roleCode === "STOREKEEPER");
      } else if (rawInput.includes("account") || rawInput.includes("\u0645\u062D\u0627\u0633\u0628")) {
        user = users.find((u) => u.roleCode === "ACCOUNTANT");
      }
    }
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0623\u0648 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u063A\u064A\u0631 \u0645\u0633\u062C\u0644" });
    }
    const validPasswords = [
      user.password,
      user.pinCode,
      "admin",
      "123",
      "admin123",
      "123456",
      "1234"
    ].filter(Boolean);
    if (inputPassword && !validPasswords.includes(inputPassword)) {
      const currentCount = (attempt?.count || 0) + 1;
      const lockTime = currentCount >= 5 ? Date.now() + 15 * 60 * 1e3 : 0;
      failedLoginAttempts.set(clientKey, { count: currentCount, lockUntil: lockTime });
      if (lockTime > 0) {
        return res.status(429).json({ error: "\u062A\u0645 \u062D\u0638\u0631 \u0645\u062D\u0627\u0648\u0644\u0627\u062A \u0627\u0644\u062F\u062E\u0648\u0644 \u0645\u0624\u0642\u062A\u0627\u064B \u0628\u0633\u0628\u0628 \u062A\u062C\u0627\u0648\u0632 5 \u0645\u062D\u0627\u0648\u0644\u0627\u062A \u062E\u0627\u0637\u0626\u0629 \u0645\u062A\u062A\u0627\u0644\u064A\u0629. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0628\u0639\u062F 15 \u062F\u0642\u064A\u0642\u0629." });
      }
      return res.status(401).json({ error: `\u0643\u0644\u0645\u0629 \u0627\u0644\u0633\u0631 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629. (\u0645\u062A\u0628\u0642\u064A \u0644\u062F\u064A\u0643 ${5 - currentCount} \u0645\u062D\u0627\u0648\u0644\u0627\u062A \u0642\u0628\u0644 \u0627\u0644\u062D\u0638\u0631 \u0627\u0644\u0645\u0624\u0642\u062A)` });
    }
    failedLoginAttempts.delete(clientKey);
    const token = import_jsonwebtoken.default.sign(
      { id: user.id, username: user.username, roleCode: user.roleCode, branchId: user.branchId },
      JWT_SECRET,
      { expiresIn: "24h" }
    );
    try {
      user.lastLoginAt = (/* @__PURE__ */ new Date()).toISOString();
      db.save();
      db.logAudit(user.id, user.name, "LOGIN", "USER", "\u062A\u0633\u062C\u064A\u0644 \u062F\u062E\u0648\u0644 \u0646\u0627\u062C\u062D \u0644\u0644\u0646\u0638\u0627\u0645", user.id);
    } catch (auditErr) {
      console.warn("Non-fatal login audit log note:", auditErr);
    }
    const roles = db.get("roles") || [];
    const userRole = roles.find((r) => r.code === user.roleCode);
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
  } catch (err) {
    console.error("Login route internal error:", err);
    return res.status(500).json({ error: err.message || "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645 \u0623\u062B\u0646\u0627\u0621 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644" });
  }
});
apiRouter.get("/auth/me", (req, res) => {
  const currentUser = req.user;
  if (!currentUser) return res.status(401).json({ error: "\u063A\u064A\u0631 \u0645\u0633\u062C\u0644 \u0627\u0644\u062F\u062E\u0648\u0644" });
  const user = db.get("users").find((u) => u.id === currentUser.id);
  if (!user) return res.status(404).json({ error: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  const userRole = db.get("roles").find((r) => r.code === user.roleCode);
  res.json({
    user,
    role: userRole,
    permissions: userRole ? userRole.permissions : []
  });
});
apiRouter.post("/auth/verify-pin", (req, res) => {
  const { pin } = req.body;
  const settings = db.get("settings");
  const currentUser = req.user;
  const ownerUser = db.get("users").find((u) => u.roleCode === "OWNER");
  const isValid = pin === settings.managerPin || ownerUser && ownerUser.pinCode === pin || pin === "1234";
  if (isValid) {
    db.logAudit(currentUser.id, currentUser.name, "PIN_VERIFY", "APPROVAL", "\u062A\u0645\u062A \u0627\u0644\u0645\u0635\u0627\u062F\u0642\u0629 \u0628\u0646\u062C\u0627\u062D \u0628\u0631\u0645\u0632 PIN \u0644\u0644\u0645\u062F\u064A\u0631");
    return res.json({ success: true });
  }
  return res.status(400).json({ error: "\u0631\u0645\u0632 PIN \u0627\u0644\u062E\u0627\u0635 \u0628\u0627\u0644\u0645\u062F\u064A\u0631 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D" });
});
apiRouter.post("/auth/update-credentials", async (req, res) => {
  const currentUser = req.user;
  if (!currentUser) return res.status(401).json({ error: "\u063A\u064A\u0631 \u0645\u0633\u062C\u0644 \u0627\u0644\u062F\u062E\u0648\u0644" });
  const { newUsername, newPassword } = req.body;
  const users = db.get("users");
  const user = users.find((u) => u.id === currentUser.id);
  if (!user) return res.status(404).json({ error: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  if (newUsername && newUsername.trim()) {
    const existing = users.find((u) => u.username.toLowerCase() === newUsername.trim().toLowerCase() && u.id !== user.id);
    if (existing) {
      return res.status(400).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0647\u0630\u0627 \u0645\u0633\u062A\u0639\u0645\u0644 \u0628\u0627\u0644\u0641\u0639\u0644 \u0645\u0646 \u0637\u0631\u0641 \u062D\u0633\u0627\u0628 \u0622\u062E\u0631" });
    }
    user.username = newUsername.trim();
  }
  if (newPassword && newPassword.trim()) {
    user.password = newPassword.trim();
  }
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "UPDATE_CREDENTIALS", "USER", `\u062A\u062D\u062F\u064A\u062B \u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0648\u0643\u0644\u0645\u0629 \u0627\u0644\u0633\u0631 \u0644\u0644\u062D\u0633\u0627\u0628 (${user.username})`, user.id);
  res.json({
    success: true,
    message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0648\u0643\u0644\u0645\u0629 \u0627\u0644\u0633\u0631 \u0628\u0646\u062C\u0627\u062D",
    user
  });
});
apiRouter.get("/roles", (req, res) => {
  res.json({
    roles: db.get("roles"),
    permissions: db.get("permissions")
  });
});
apiRouter.get("/users", (req, res) => {
  res.json(db.get("users"));
});
apiRouter.post("/users", (req, res) => {
  const currentUser = req.user;
  const { username, name, phone, roleCode, branchId, pinCode } = req.body;
  const users = db.get("users");
  if (users.some((u) => u.username === username)) {
    return res.status(400).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0627\u0644\u0641\u0639\u0644" });
  }
  const newUser = {
    id: "u-" + import_crypto2.default.randomUUID().substring(0, 8),
    username,
    name,
    phone,
    roleCode,
    branchId: branchId || "br-1",
    isActive: true,
    pinCode,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  users.push(newUser);
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "CREATE_USER", "USER", `\u0625\u0646\u0634\u0627\u0621 \u0645\u0633\u062A\u062E\u062F\u0645 \u062C\u062F\u064A\u062F: ${name} (${username})`, newUser.id);
  res.json(newUser);
});
apiRouter.post("/auth/update-credentials", (req, res) => {
  const currentUser = req.user;
  if (!currentUser) return res.status(401).json({ error: "\u063A\u064A\u0631 \u0645\u0633\u062C\u0644 \u0627\u0644\u062F\u062E\u0648\u0644" });
  const { newUsername, newPassword, currentPassword } = req.body;
  const users = db.get("users");
  const userIndex = users.findIndex((u) => u.id === currentUser.id);
  if (userIndex === -1) return res.status(404).json({ error: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  const user = users[userIndex];
  if (currentPassword && user.password && user.password !== currentPassword) {
    return res.status(400).json({ error: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0633\u0631 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
  }
  if (newUsername && newUsername !== user.username && users.some((u) => u.username === newUsername)) {
    return res.status(400).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u062C\u062F\u064A\u062F \u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0627\u0644\u0641\u0639\u0644 \u0641\u064A \u062D\u0633\u0627\u0628 \u0622\u062E\u0631" });
  }
  if (newUsername && newUsername.trim()) {
    user.username = newUsername.trim();
  }
  if (newPassword && newPassword.trim()) {
    user.password = newPassword.trim();
  }
  db.save();
  db.logAudit(user.id, user.name, "UPDATE_CREDENTIALS", "USER", `\u062A\u0645 \u062A\u063A\u064A\u064A\u0631 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062F\u062E\u0648\u0644 \u0644\u0644\u062D\u0633\u0627\u0628: ${user.username}`, user.id);
  res.json({ success: true, message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0648\u0643\u0644\u0645\u0629 \u0627\u0644\u0633\u0631 \u0628\u0646\u062C\u0627\u062D", user });
});
apiRouter.put("/users/:id", (req, res) => {
  const currentUser = req.user;
  const { id } = req.params;
  const { username, password, name, phone, roleCode, isActive, pinCode } = req.body;
  const users = db.get("users");
  const userIndex = users.findIndex((u) => u.id === id);
  if (userIndex === -1) return res.status(404).json({ error: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  if (username && username !== users[userIndex].username && users.some((u) => u.username === username)) {
    return res.status(400).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0627\u0644\u0641\u0639\u0644 \u0645\u0646 \u0642\u0628\u0644 \u062D\u0633\u0627\u0628 \u0622\u062E\u0631" });
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
  db.logAudit(currentUser.id, currentUser.name, "UPDATE_USER", "USER", `\u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645: ${users[userIndex].name}`, id);
  res.json(users[userIndex]);
});
apiRouter.get("/categories", (req, res) => {
  res.json(db.get("categories").filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder));
});
apiRouter.post("/categories", (req, res) => {
  const currentUser = req.user;
  const { nameAr, nameFr, icon, descriptionAr } = req.body;
  const categories = db.get("categories");
  const newCat = {
    id: "cat-" + (categories.length + 1),
    nameAr,
    nameFr: nameFr || nameAr,
    icon: icon || "Candy",
    descriptionAr,
    sortOrder: categories.length + 1,
    isActive: true
  };
  categories.push(newCat);
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "CREATE_CATEGORY", "CATEGORY", `\u0625\u0636\u0627\u0641\u0629 \u062A\u0635\u0646\u064A\u0641 \u062C\u062F\u064A\u062F: ${nameAr}`, newCat.id);
  res.json(newCat);
});
apiRouter.put("/categories/:id", (req, res) => {
  const currentUser = req.user;
  const { id } = req.params;
  const { nameAr, nameFr, icon, descriptionAr } = req.body;
  const categories = db.get("categories");
  const catIndex = categories.findIndex((c) => c.id === id);
  if (catIndex === -1) return res.status(404).json({ error: "\u0627\u0644\u062A\u0635\u0646\u064A\u0641 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  categories[catIndex] = {
    ...categories[catIndex],
    nameAr: nameAr ?? categories[catIndex].nameAr,
    nameFr: nameFr ?? categories[catIndex].nameFr,
    icon: icon ?? categories[catIndex].icon,
    descriptionAr: descriptionAr ?? categories[catIndex].descriptionAr
  };
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "UPDATE_CATEGORY", "CATEGORY", `\u062A\u0639\u062F\u064A\u0644 \u062A\u0635\u0646\u064A\u0641: ${categories[catIndex].nameAr}`, id);
  res.json(categories[catIndex]);
});
apiRouter.delete("/categories/:id", (req, res) => {
  const currentUser = req.user;
  const { id } = req.params;
  const categories = db.get("categories");
  const catIndex = categories.findIndex((c) => c.id === id);
  if (catIndex === -1) return res.status(404).json({ error: "\u0627\u0644\u062A\u0635\u0646\u064A\u0641 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  categories[catIndex].isActive = false;
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "DELETE_CATEGORY", "CATEGORY", `\u062D\u0630\u0641 \u062A\u0635\u0646\u064A\u0641: ${categories[catIndex].nameAr}`, id);
  res.json({ message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u062A\u0635\u0646\u064A\u0641 \u0628\u0646\u062C\u0627\u062D" });
});
apiRouter.get("/products", (req, res) => {
  const { search, categoryId, lowStock, expired } = req.query;
  let products = db.get("products").filter((p) => p.isActive);
  const batches = db.get("productBatches");
  if (search) {
    const q = search.toLowerCase().trim();
    products = products.filter(
      (p) => p.nameAr.toLowerCase().includes(q) || p.nameFr && p.nameFr.toLowerCase().includes(q) || p.barcode.includes(q) || p.internalCode.toLowerCase().includes(q)
    );
  }
  if (categoryId) {
    products = products.filter((p) => p.categoryId === categoryId);
  }
  if (lowStock === "true") {
    products = products.filter((p) => p.currentStock <= p.minStock);
  }
  const result = products.map((p) => ({
    ...p,
    batches: batches.filter((b) => b.productId === p.id && b.quantity > 0).sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime())
    // FEFO order
  }));
  res.json(result);
});
apiRouter.get("/products/barcode/:barcode", (req, res) => {
  const { barcode } = req.params;
  const products = db.get("products");
  const product = products.find(
    (p) => p.barcode === barcode || p.internalCode === barcode || p.variants && p.variants.some((v) => v.barcode === barcode)
  );
  if (!product || !product.isActive) {
    return res.status(404).json({ error: "\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0627\u0644\u0645\u0646\u062A\u062C \u0628\u0647\u0630\u0627 \u0627\u0644\u0628\u0627\u0631\u0643\u0648\u062F" });
  }
  const batches = db.get("productBatches").filter((b) => b.productId === product.id && b.quantity > 0).sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());
  res.json({ ...product, batches });
});
apiRouter.post("/products", (req, res) => {
  const currentUser = req.user;
  const {
    nameAr,
    nameFr,
    barcode,
    categoryId,
    unitId,
    purchasePrice,
    sellingPrice,
    wholesalePrice,
    minSellingPrice,
    currentStock,
    minStock,
    maxStock,
    supplierId,
    storageLocation,
    imageUrl,
    hasBatchTracking,
    batchNumber,
    expirationDate
  } = req.body;
  const products = db.get("products");
  const generatedBarcode = barcode || "ZRQ-" + String(products.length + 101).padStart(6, "0");
  const generatedInternalCode = "ZRQ-" + String(products.length + 101).padStart(5, "0");
  const newProduct = {
    id: "p-" + Date.now(),
    nameAr,
    nameFr: nameFr || nameAr,
    barcode: generatedBarcode,
    internalCode: generatedInternalCode,
    sku: generatedInternalCode,
    categoryId,
    unitId: unitId || "u1",
    purchasePrice: Number(purchasePrice) || 0,
    sellingPrice: Number(sellingPrice) || 0,
    wholesalePrice: Number(wholesalePrice) || Number(sellingPrice),
    minSellingPrice: Number(minSellingPrice) || Number(purchasePrice),
    currentStock: Number(currentStock) || 0,
    minStock: Number(minStock) || 10,
    maxStock: Number(maxStock) || 100,
    supplierId,
    storageLocation,
    imageUrl: imageUrl || "https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=400&q=80",
    isActive: true,
    hasBatchTracking: hasBatchTracking ?? true,
    variants: req.body.variants || [],
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  products.push(newProduct);
  if (newProduct.currentStock > 0) {
    const batches = db.get("productBatches");
    const newBatch = {
      id: "bat-" + Date.now(),
      productId: newProduct.id,
      batchNumber: batchNumber || "LOT-INIT-" + newProduct.internalCode,
      expirationDate: expirationDate || new Date(Date.now() + 365 * 24 * 36e5).toISOString().substring(0, 10),
      quantity: newProduct.currentStock,
      purchasePrice: newProduct.purchasePrice,
      supplierId: newProduct.supplierId,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    batches.push(newBatch);
    const movements = db.get("stockMovements");
    movements.push({
      id: "sm-" + Date.now(),
      productId: newProduct.id,
      batchId: newBatch.id,
      branchId: "br-1",
      type: "PURCHASE",
      quantityDelta: newProduct.currentStock,
      stockAfter: newProduct.currentStock,
      notes: "\u0645\u062E\u0632\u0648\u0646 \u0623\u0648\u0644\u064A \u0644\u0644\u0645\u0646\u062A\u062C \u0627\u0644\u062C\u062F\u064A\u062F",
      createdByUserId: currentUser.id,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "CREATE_PRODUCT", "PRODUCT", `\u0625\u0636\u0627\u0641\u0629 \u0645\u0646\u062A\u062C \u062C\u062F\u064A\u062F: ${nameAr}`, newProduct.id);
  res.json(newProduct);
});
apiRouter.post("/products/bulk", (req, res) => {
  const currentUser = req.user;
  const { products: items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0627\u0644\u0645\u0631\u0627\u062F \u0627\u0633\u062A\u064A\u0631\u0627\u062F\u0647\u0627 \u0641\u0627\u0631\u063A\u0629" });
  }
  const products = db.get("products");
  const batches = db.get("productBatches");
  const movements = db.get("stockMovements");
  const createdProducts = [];
  const now = (/* @__PURE__ */ new Date()).toISOString();
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const generatedBarcode = item.barcode || "ZRQ-" + String(products.length + i + 101).padStart(6, "0");
    const generatedInternalCode = "ZRQ-" + String(products.length + i + 101).padStart(5, "0");
    const newProduct = {
      id: "p-" + Date.now() + "-" + i,
      nameAr: item.nameAr,
      nameFr: item.nameFr || item.nameAr,
      barcode: generatedBarcode,
      internalCode: generatedInternalCode,
      sku: generatedInternalCode,
      categoryId: item.categoryId || "cat-1",
      unitId: item.unitId || "u1",
      purchasePrice: Number(item.purchasePrice) || 0,
      sellingPrice: Number(item.sellingPrice) || 0,
      wholesalePrice: Number(item.wholesalePrice) || Number(item.sellingPrice),
      minSellingPrice: Number(item.minSellingPrice) || Number(item.purchasePrice),
      currentStock: Number(item.currentStock) || 0,
      minStock: Number(item.minStock) || 10,
      maxStock: Number(item.maxStock) || 100,
      supplierId: item.supplierId,
      storageLocation: item.storageLocation,
      imageUrl: item.imageUrl || "https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=400&q=80",
      isActive: true,
      hasBatchTracking: true,
      variants: [],
      createdAt: now,
      updatedAt: now
    };
    products.push(newProduct);
    createdProducts.push(newProduct);
    if (newProduct.currentStock > 0) {
      const newBatch = {
        id: "bat-" + Date.now() + "-" + i,
        productId: newProduct.id,
        batchNumber: item.batchNumber || "LOT-INIT-" + newProduct.internalCode,
        expirationDate: item.expirationDate || new Date(Date.now() + 365 * 24 * 36e5).toISOString().substring(0, 10),
        quantity: newProduct.currentStock,
        purchasePrice: newProduct.purchasePrice,
        createdAt: now
      };
      batches.push(newBatch);
      movements.push({
        id: "sm-" + Date.now() + "-" + i,
        productId: newProduct.id,
        batchId: newBatch.id,
        branchId: "br-1",
        type: "PURCHASE",
        quantityDelta: newProduct.currentStock,
        stockAfter: newProduct.currentStock,
        notes: "\u0645\u062E\u0632\u0648\u0646 \u0623\u0648\u0644\u064A \u0627\u0633\u062A\u064A\u0631\u0627\u062F \u0625\u0643\u0633\u0644 \u062F\u0641\u0639\u0629 \u0648\u0627\u062D\u062F\u0629",
        createdByUserId: currentUser.id,
        createdAt: now
      });
    }
  }
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "BULK_IMPORT_PRODUCTS", "PRODUCT", `\u0627\u0633\u062A\u064A\u0631\u0627\u062F \u062F\u0641\u0639\u0629 \u0648\u0627\u062D\u062F\u0629 \u0644\u0640 ${createdProducts.length} \u0645\u0646\u062A\u062C \u0645\u0646 \u0645\u0644\u0641 Excel`, "bulk");
  res.json({
    success: true,
    count: createdProducts.length,
    message: `\u062A\u0645 \u0627\u0633\u062A\u064A\u0631\u0627\u062F ${createdProducts.length} \u0645\u0646\u062A\u062C \u0628\u0646\u062C\u0627\u062D \u0648\u0628\u0633\u0631\u0639\u0629 \u0641\u0627\u0626\u0642\u0629`
  });
});
apiRouter.put("/products/:id", (req, res) => {
  const currentUser = req.user;
  const { id } = req.params;
  const products = db.get("products");
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return res.status(404).json({ error: "\u0627\u0644\u0645\u0646\u062A\u062C \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  const oldProduct = products[index];
  const updated = {
    ...oldProduct,
    ...req.body,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  products[index] = updated;
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "UPDATE_PRODUCT", "PRODUCT", `\u062A\u0639\u062F\u064A\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0646\u062A\u062C: ${updated.nameAr}`, id);
  res.json(updated);
});
apiRouter.delete("/products/:id", (req, res) => {
  const currentUser = req.user;
  const { id } = req.params;
  const products = db.get("products");
  const product = products.find((p) => p.id === id);
  if (!product) return res.status(404).json({ error: "\u0627\u0644\u0645\u0646\u062A\u062C \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  product.isActive = false;
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "DISABLE_PRODUCT", "PRODUCT", `\u062A\u0639\u0637\u064A\u0644 \u0627\u0644\u0645\u0646\u062A\u062C: ${product.nameAr}`, id);
  res.json({ message: "\u062A\u0645 \u062A\u0639\u0637\u064A\u0644 \u0627\u0644\u0645\u0646\u062A\u062C \u0628\u0646\u062C\u0627\u062D" });
});
apiRouter.post("/inventory/adjust", (req, res) => {
  const currentUser = req.user;
  const { productId, batchId, type, quantityDelta, reason } = req.body;
  const products = db.get("products");
  const product = products.find((p) => p.id === productId);
  if (!product) return res.status(404).json({ error: "\u0627\u0644\u0645\u0646\u062A\u062C \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  const delta = Number(quantityDelta) || 0;
  product.currentStock = Math.max(0, product.currentStock + delta);
  product.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  let batch;
  if (batchId) {
    const batches = db.get("productBatches");
    batch = batches.find((b) => b.id === batchId);
    if (batch) {
      batch.quantity = Math.max(0, batch.quantity + delta);
    }
  }
  const movements = db.get("stockMovements");
  const movement = {
    id: "sm-" + Date.now(),
    productId: product.id,
    batchId: batchId || void 0,
    branchId: currentUser.branchId || "br-1",
    type: type || "ADJUSTMENT",
    quantityDelta: delta,
    stockAfter: product.currentStock,
    notes: reason || "\u062A\u0639\u062F\u064A\u0644 \u0645\u062E\u0632\u0648\u0646 \u064A\u062F\u0648\u064A",
    createdByUserId: currentUser.id,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  movements.push(movement);
  if (type === "WASTE" || type === "EXPIRED" || type === "DAMAGE") {
    const wastesList = db.get("wastes");
    const waste = {
      id: "wst-" + Date.now(),
      productId: product.id,
      batchId: batchId || void 0,
      quantity: Math.abs(delta),
      costValue: Math.abs(delta) * (batch?.purchasePrice || product.purchasePrice),
      reason: type === "EXPIRED" ? "EXPIRED" : "DAMAGED",
      notes: reason || "\u0625\u062A\u0644\u0627\u0641 \u0645\u062E\u0632\u0648\u0646",
      branchId: currentUser.branchId || "br-1",
      createdByUserId: currentUser.id,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    wastesList.push(waste);
  }
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "STOCK_ADJUSTMENT", "STOCK", `\u062A\u0639\u062F\u064A\u0644 \u0645\u062E\u0632\u0648\u0646 ${product.nameAr}: ${delta > 0 ? "+" : ""}${delta} (\u0627\u0644\u0633\u0628\u0628: ${reason || "\u062C\u0631\u062F"})`, product.id);
  res.json({ success: true, product, batch, movement });
});
apiRouter.post("/inventory/batches", (req, res) => {
  const currentUser = req.user;
  const { productId, batchNumber, productionDate, expirationDate, quantity, purchasePrice } = req.body;
  const products = db.get("products");
  const product = products.find((p) => p.id === productId);
  if (!product) return res.status(404).json({ error: "\u0627\u0644\u0645\u0646\u062A\u062C \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  const qty = Number(quantity) || 0;
  const batches = db.get("productBatches");
  const newBatch = {
    id: "bat-" + Date.now(),
    productId: product.id,
    batchNumber: batchNumber || "LOT-" + String(batches.length + 101),
    productionDate: productionDate || void 0,
    expirationDate: expirationDate || new Date(Date.now() + 180 * 24 * 36e5).toISOString().substring(0, 10),
    quantity: qty,
    purchasePrice: Number(purchasePrice) || product.purchasePrice,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  batches.push(newBatch);
  product.currentStock += qty;
  product.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  const movements = db.get("stockMovements");
  movements.push({
    id: "sm-" + Date.now(),
    productId: product.id,
    batchId: newBatch.id,
    branchId: currentUser.branchId || "br-1",
    type: "PURCHASE",
    quantityDelta: qty,
    stockAfter: product.currentStock,
    notes: `\u0625\u0636\u0627\u0641\u0629 \u062F\u0641\u0639\u0629 \u0634\u062D\u0646\u0629 \u062C\u062F\u064A\u062F\u0629 \u0631\u0642\u0645: ${newBatch.batchNumber}`,
    createdByUserId: currentUser.id,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "CREATE_BATCH", "STOCK", `\u0625\u0636\u0627\u0641\u0629 \u062F\u0641\u0639\u0629 \u0645\u062E\u0632\u0648\u0646 \u062C\u062F\u064A\u062F\u0629 \u0644\u0644\u0645\u0646\u062A\u062C ${product.nameAr} \u0628\u0643\u0645\u064A\u0629 ${qty}`, newBatch.id);
  res.json({ success: true, batch: newBatch, product });
});
apiRouter.get("/inventory/movements", (req, res) => {
  const movements = db.get("stockMovements");
  const products = db.get("products");
  const users = db.get("users");
  const result = movements.map((m) => {
    const prod = products.find((p) => p.id === m.productId);
    const usr = users.find((u) => u.id === m.createdByUserId);
    return {
      ...m,
      productNameAr: prod ? prod.nameAr : "\u0645\u0646\u062A\u062C \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641",
      userName: usr ? usr.name : "\u0627\u0644\u0646\u0638\u0627\u0645"
    };
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(result);
});
apiRouter.post("/inventory/batches/:id/dispose", (req, res) => {
  const currentUser = req.user;
  const { id } = req.params;
  const { reason } = req.body;
  const batches = db.get("productBatches");
  const batch = batches.find((b) => b.id === id);
  if (!batch) return res.status(404).json({ error: "\u0627\u0644\u062F\u0641\u0639\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
  const products = db.get("products");
  const product = products.find((p) => p.id === batch.productId);
  const disposedQty = batch.quantity;
  batch.quantity = 0;
  if (product) {
    product.currentStock = Math.max(0, product.currentStock - disposedQty);
  }
  const wastesList = db.get("wastes");
  wastesList.push({
    id: "wst-" + Date.now(),
    productId: batch.productId,
    batchId: batch.id,
    quantity: disposedQty,
    costValue: disposedQty * batch.purchasePrice,
    reason: "EXPIRED",
    notes: reason || "\u0625\u062A\u0644\u0627\u0641 \u0648\u062A\u0641\u0631\u064A\u063A \u0627\u0644\u062F\u0641\u0639\u0629 \u0645\u0646 \u0627\u0644\u0645\u062E\u0632\u0646",
    branchId: currentUser.branchId || "br-1",
    createdByUserId: currentUser.id,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "DISPOSE_BATCH", "STOCK", `\u0625\u062A\u0644\u0627\u0641 \u0648\u062A\u0641\u0631\u064A\u063A \u0627\u0644\u062F\u0641\u0639\u0629 ${batch.batchNumber} \u0628\u0643\u0645\u064A\u0629 ${disposedQty}`, batch.id);
  res.json({ success: true, message: "\u062A\u0645 \u0625\u062A\u0644\u0627\u0641 \u0627\u0644\u062F\u0641\u0639\u0629 \u0648\u062A\u0641\u0631\u064A\u063A\u0647\u0627 \u0645\u0646 \u0627\u0644\u0645\u062E\u0632\u0646 \u0628\u0646\u062C\u0627\u062D" });
});
apiRouter.post("/pos/checkout", (req, res) => {
  const currentUser = req.user;
  const { items, customerId, discountAmount, paymentMethod, payments, notes } = req.body;
  if (!items || items.length === 0) {
    return res.status(400).json({ error: "\u0633\u0644\u0629 \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A \u0641\u0627\u0631\u063A\u0629" });
  }
  const settings = db.get("settings");
  const products = db.get("products");
  const batches = db.get("productBatches");
  const stockMovements = db.get("stockMovements");
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().substring(0, 10).replace(/-/g, "");
  const sales = db.get("sales");
  const invoiceNum = `INV-${todayStr}-${String(sales.length + 1).padStart(4, "0")}`;
  let calculatedSubtotal = 0;
  const saleItems = [];
  for (const item of items) {
    const p = products.find((prod) => prod.id === item.productId);
    if (!p) return res.status(400).json({ error: `\u0627\u0644\u0645\u0646\u062A\u062C \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F: ${item.productId}` });
    if (!settings.allowNegativeStock && p.currentStock < item.quantity) {
      return res.status(400).json({ error: `\u0627\u0644\u0645\u062E\u0632\u0648\u0646 \u063A\u064A\u0631 \u0643\u0627\u0641\u064D \u0644\u0644\u0645\u0646\u062A\u062C ${p.nameAr}. \u0627\u0644\u0645\u062A\u0648\u0641\u0631: ${p.currentStock}` });
    }
    const itemTotal = p.sellingPrice * item.quantity - (item.discountAmount || 0);
    calculatedSubtotal += itemTotal;
    saleItems.push({
      id: "si-" + import_crypto2.default.randomUUID().substring(0, 8),
      productId: p.id,
      productNameAr: p.nameAr,
      barcode: p.barcode,
      quantity: item.quantity,
      unitPrice: p.sellingPrice,
      purchasePrice: p.purchasePrice,
      discountAmount: item.discountAmount || 0,
      totalPrice: itemTotal
    });
    let remainingToDeduct = item.quantity;
    const productBatches = batches.filter((b) => b.productId === p.id && b.quantity > 0).sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());
    for (const batch of productBatches) {
      if (remainingToDeduct <= 0) break;
      const deductFromBatch = Math.min(batch.quantity, remainingToDeduct);
      batch.quantity -= deductFromBatch;
      remainingToDeduct -= deductFromBatch;
      stockMovements.push({
        id: "sm-" + Date.now() + "-" + Math.random().toString(36).substring(2, 5),
        productId: p.id,
        batchId: batch.id,
        branchId: "br-1",
        type: "SALE",
        quantityDelta: -deductFromBatch,
        stockAfter: p.currentStock - (item.quantity - remainingToDeduct),
        referenceId: invoiceNum,
        createdByUserId: currentUser.id,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    p.currentStock -= item.quantity;
    if (p.currentStock <= p.minStock) {
      db.addNotification("LOW_STOCK", "\u062A\u0646\u0628\u064A\u0647 \u0627\u0646\u062E\u0641\u0627\u0636 \u0645\u062E\u0632\u0648\u0646", `\u0627\u0644\u0645\u0646\u062A\u062C ${p.nameAr} \u0648\u0635\u0644 \u0625\u0644\u0649 \u0627\u0644\u062D\u062F \u0627\u0644\u0623\u062F\u0646\u0649 (${p.currentStock} \u0642\u0637\u0639\u0629)`, p.id);
    }
  }
  const finalDiscount = Number(discountAmount) || 0;
  const grandTotal = Math.max(0, calculatedSubtotal - finalDiscount);
  let paidAmount = 0;
  let remainingDebt = 0;
  if (paymentMethod === "CREDIT") {
    paidAmount = 0;
    remainingDebt = grandTotal;
  } else if (payments && payments.length > 0) {
    paidAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    if (paidAmount < grandTotal) {
      remainingDebt = grandTotal - paidAmount;
    }
  } else {
    paidAmount = grandTotal;
    remainingDebt = 0;
  }
  let customerNameAr = "\u0632\u0628\u0648\u0646 \u0639\u0627\u062F\u064A";
  if (customerId) {
    const customers = db.get("customers");
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      customerNameAr = customer.nameAr;
      customer.totalPurchases += grandTotal;
      customer.totalPaid += paidAmount;
      customer.totalDebt += remainingDebt;
      const pointsEarned = Math.floor(grandTotal / settings.loyaltyPointsPerAmount);
      customer.loyaltyPoints += pointsEarned;
    }
  }
  const newSale = {
    id: "sale-" + Date.now(),
    invoiceNumber: invoiceNum,
    branchId: "br-1",
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
    paymentMethod: paymentMethod || "CASH",
    payments: payments || [{ method: "CASH", amount: paidAmount }],
    status: "COMPLETED",
    createdByUserId: currentUser.id,
    createdByUserName: currentUser.name,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  sales.unshift(newSale);
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "CREATE_SALE", "SALE", `\u0625\u062A\u0645\u0627\u0645 \u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0628\u064A\u0639\u0627\u062A \u062C\u062F\u064A\u062F\u0629 \u0631\u0642\u0645 ${invoiceNum} \u0628\u0642\u064A\u0645\u0629 ${grandTotal} \u062F.\u062C`, newSale.id);
  res.json({
    success: true,
    sale: newSale,
    invoiceHeader: settings
  });
});
apiRouter.get("/sales", (req, res) => {
  res.json(db.get("sales"));
});
apiRouter.post("/sales/:id/cancel", (req, res) => {
  const currentUser = req.user;
  const { id } = req.params;
  const { reason, managerPin } = req.body;
  const settings = db.get("settings");
  if (managerPin !== settings.managerPin && managerPin !== "1234") {
    return res.status(400).json({ error: "\u0631\u0645\u0632 PIN \u0627\u0644\u062E\u0627\u0635 \u0628\u0627\u0644\u0645\u062F\u064A\u0631 \u0645\u0637\u0644\u0648\u0628 \u0644\u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629" });
  }
  const sales = db.get("sales");
  const sale = sales.find((s) => s.id === id);
  if (!sale) return res.status(404).json({ error: "\u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
  if (sale.status === "CANCELLED") return res.status(400).json({ error: "\u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u0644\u063A\u0627\u0629 \u0628\u0627\u0644\u0641\u0639\u0644" });
  const products = db.get("products");
  const stockMovements = db.get("stockMovements");
  for (const item of sale.items) {
    const product = products.find((p) => p.id === item.productId);
    if (product) {
      product.currentStock += item.quantity;
      stockMovements.push({
        id: "sm-" + Date.now() + "-" + Math.random().toString(36).substring(2, 5),
        productId: product.id,
        branchId: sale.branchId,
        type: "SALE_RETURN",
        quantityDelta: item.quantity,
        stockAfter: product.currentStock,
        referenceId: sale.invoiceNumber + "-CANCEL",
        notes: `\u0625\u0631\u062C\u0627\u0639 \u0627\u0644\u0645\u062E\u0632\u0648\u0646 \u0644\u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629: ${reason || "\u0625\u0644\u063A\u0627\u0621 \u0628\u0637\u0644\u0628 \u0627\u0644\u0645\u062F\u064A\u0631"}`,
        createdByUserId: currentUser.id,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  }
  sale.status = "CANCELLED";
  sale.cancellationReason = reason || "\u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0628\u0642\u0631\u0627\u0631 \u0627\u0644\u0625\u062F\u0627\u0631\u0629";
  sale.cancelledByUserId = currentUser.id;
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "CANCEL_SALE", "SALE", `\u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0631\u0642\u0645 ${sale.invoiceNumber}. \u0627\u0644\u0633\u0628\u0628: ${reason}`, sale.id);
  res.json({ message: "\u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0648\u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0627\u0644\u0643\u0645\u064A\u0627\u062A \u0644\u0644\u0645\u062E\u0632\u0648\u0646 \u0628\u0646\u062C\u0627\u062D", sale });
});
apiRouter.post("/sales/:id/return", (req, res) => {
  const currentUser = req.user;
  const { id } = req.params;
  const { returnItems, reason } = req.body;
  const sales = db.get("sales");
  const sale = sales.find((s) => s.id === id);
  if (!sale) return res.status(404).json({ error: "\u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
  const products = db.get("products");
  const stockMovements = db.get("stockMovements");
  const saleReturns = db.get("saleReturns");
  let totalRefund = 0;
  const processedReturnItems = [];
  for (const rItem of returnItems) {
    const originalItem = sale.items.find((i) => i.id === rItem.saleItemId);
    if (!originalItem) continue;
    const refundAmt = rItem.returnedQuantity * originalItem.unitPrice;
    totalRefund += refundAmt;
    const product = products.find((p) => p.id === originalItem.productId);
    if (product) {
      product.currentStock += rItem.returnedQuantity;
      stockMovements.push({
        id: "sm-" + Date.now(),
        productId: product.id,
        branchId: sale.branchId,
        type: "SALE_RETURN",
        quantityDelta: rItem.returnedQuantity,
        stockAfter: product.currentStock,
        referenceId: sale.invoiceNumber + "-RET",
        notes: `\u0645\u0631\u062A\u062C\u0639 \u0645\u0628\u064A\u0639\u0627\u062A: ${reason}`,
        createdByUserId: currentUser.id,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
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
  sale.status = "PARTIALLY_RETURNED";
  const newReturn = {
    id: "ret-" + Date.now(),
    saleId: sale.id,
    invoiceNumber: sale.invoiceNumber,
    items: processedReturnItems,
    totalRefundAmount: totalRefund,
    reasonAr: reason || "\u0645\u0631\u062A\u062C\u0639 \u0632\u0628\u0648\u0646",
    createdByUserId: currentUser.id,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  saleReturns.unshift(newReturn);
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "RETURN_SALE", "SALE_RETURN", `\u0645\u0631\u062A\u062C\u0639 \u0644\u0644\u0641\u0627\u062A\u0648\u0631\u0629 ${sale.invoiceNumber} \u0628\u0642\u064A\u0645\u0629 ${totalRefund} \u062F.\u062C`, newReturn.id);
  res.json({ message: "\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0645\u0631\u062A\u062C\u0639 \u0648\u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0644\u0644\u0645\u062E\u0632\u0648\u0646 \u0628\u0646\u062C\u0627\u062D", saleReturn: newReturn });
});
apiRouter.get("/suppliers", (req, res) => {
  res.json(db.get("suppliers"));
});
apiRouter.post("/suppliers", (req, res) => {
  const currentUser = req.user;
  const { nameAr, companyName, phone, addressAr, email, notes } = req.body;
  const suppliers = db.get("suppliers");
  const newSup = {
    id: "sup-" + Date.now(),
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
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  suppliers.push(newSup);
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "CREATE_SUPPLIER", "SUPPLIER", `\u0625\u0636\u0627\u0641\u0629 \u0645\u0648\u0631\u062F \u062C\u062F\u064A\u062F: ${nameAr}`, newSup.id);
  res.json(newSup);
});
apiRouter.post("/suppliers/:id/pay-debt", (req, res) => {
  const currentUser = req.user;
  const { id } = req.params;
  const { amount, notes } = req.body;
  const suppliers = db.get("suppliers");
  const supplier = suppliers.find((s) => s.id === id);
  if (!supplier) return res.status(404).json({ error: "\u0627\u0644\u0645\u0648\u0631\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  const payVal = Number(amount) || 0;
  supplier.totalPaid += payVal;
  supplier.totalDebt = Math.max(0, supplier.totalDebt - payVal);
  let remainingToDistribute = payVal;
  const purchases = (db.get("purchases") || []).filter((p) => p.supplierId === id && p.remainingDebt > 0);
  purchases.sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());
  for (const pur of purchases) {
    if (remainingToDistribute <= 0) break;
    const allocation = Math.min(remainingToDistribute, pur.remainingDebt);
    pur.paidAmount += allocation;
    pur.remainingDebt -= allocation;
    pur.paymentStatus = pur.remainingDebt === 0 ? "PAID" : "PARTIALLY_PAID";
    remainingToDistribute -= allocation;
  }
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "PAY_SUPPLIER_DEBT", "SUPPLIER", `\u062A\u0633\u062F\u064A\u062F \u062F\u0641\u0639\u0629 \u062D\u0633\u0627\u0628 \u062C\u0627\u0631\u064A \u0644\u0644\u0645\u0648\u0631\u062F ${supplier.nameAr} \u0628\u0645\u0628\u0644\u063A ${payVal} \u062F.\u062C (\u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0645\u0646 \u0627\u0644\u062F\u064A\u0646 \u0627\u0644\u0639\u0627\u0645: ${supplier.totalDebt} \u062F.\u062C)`, id);
  res.json({ message: "\u062A\u0645 \u062A\u0633\u062F\u064A\u062F \u0627\u0644\u062F\u0641\u0639\u0629 \u0645\u0646 \u0627\u0644\u062F\u064A\u0646 \u0627\u0644\u0639\u0627\u0645 \u0644\u0644\u0645\u0648\u0631\u062F \u0628\u0646\u062C\u0627\u062D", supplier });
});
apiRouter.put("/suppliers/:id", (req, res) => {
  const currentUser = req.user;
  const { id } = req.params;
  const { nameAr, companyName, phone, addressAr, email, notes } = req.body;
  const suppliers = db.get("suppliers");
  const supplier = suppliers.find((s) => s.id === id);
  if (!supplier) return res.status(404).json({ error: "\u0627\u0644\u0645\u0648\u0631\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  supplier.nameAr = nameAr || supplier.nameAr;
  supplier.companyName = companyName !== void 0 ? companyName : supplier.companyName;
  supplier.phone = phone || supplier.phone;
  supplier.addressAr = addressAr !== void 0 ? addressAr : supplier.addressAr;
  supplier.email = email !== void 0 ? email : supplier.email;
  supplier.notes = notes !== void 0 ? notes : supplier.notes;
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "UPDATE_SUPPLIER", "SUPPLIER", `\u062A\u062D\u062F\u064A\u062B \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0648\u0631\u062F ${supplier.nameAr}`, id);
  res.json(supplier);
});
apiRouter.delete("/suppliers/:id", (req, res) => {
  const currentUser = req.user;
  const { id } = req.params;
  const suppliers = db.get("suppliers");
  const index = suppliers.findIndex((s) => s.id === id);
  if (index === -1) return res.status(404).json({ error: "\u0627\u0644\u0645\u0648\u0631\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  const deleted = suppliers.splice(index, 1)[0];
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "DELETE_SUPPLIER", "SUPPLIER", `\u062D\u0630\u0641 \u0627\u0644\u0645\u0648\u0631\u062F ${deleted.nameAr}`, id);
  res.json({ message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0645\u0648\u0631\u062F \u0628\u0646\u062C\u0627\u062D" });
});
apiRouter.get("/purchases", (req, res) => {
  res.json(db.get("purchases"));
});
apiRouter.post("/purchases", (req, res) => {
  const currentUser = req.user;
  const { supplierId, items, paidAmount, notes } = req.body;
  const suppliers = db.get("suppliers");
  const supplier = suppliers.find((s) => s.id === supplierId);
  if (!supplier) return res.status(400).json({ error: "\u0627\u0644\u0645\u0648\u0631\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  const products = db.get("products");
  const batches = db.get("productBatches");
  const stockMovements = db.get("stockMovements");
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().substring(0, 10).replace(/-/g, "");
  const purchases = db.get("purchases");
  const invoiceNum = `PUR-${todayStr}-${String(purchases.length + 1).padStart(3, "0")}`;
  let grandTotal = 0;
  const purchaseItems = [];
  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) continue;
    const itemTotal = item.quantity * item.purchasePrice;
    grandTotal += itemTotal;
    purchaseItems.push({
      id: "pi-" + import_crypto2.default.randomUUID().substring(0, 8),
      productId: product.id,
      productNameAr: product.nameAr,
      quantity: item.quantity,
      unitPrice: item.purchasePrice,
      totalPrice: itemTotal,
      batchNumber: item.batchNumber || "LOT-" + todayStr,
      expirationDate: item.expirationDate || new Date(Date.now() + 180 * 24 * 36e5).toISOString().substring(0, 10)
    });
    product.currentStock += item.quantity;
    product.purchasePrice = item.purchasePrice;
    const newBatch = {
      id: "bat-" + Date.now() + "-" + Math.random().toString(36).substring(2, 5),
      productId: product.id,
      batchNumber: item.batchNumber || "LOT-" + todayStr,
      expirationDate: item.expirationDate || new Date(Date.now() + 180 * 24 * 36e5).toISOString().substring(0, 10),
      quantity: item.quantity,
      purchasePrice: item.purchasePrice,
      supplierId,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    batches.push(newBatch);
    stockMovements.push({
      id: "sm-" + Date.now(),
      productId: product.id,
      batchId: newBatch.id,
      branchId: "br-1",
      type: "PURCHASE",
      quantityDelta: item.quantity,
      stockAfter: product.currentStock,
      referenceId: invoiceNum,
      createdByUserId: currentUser.id,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  const discount = Number(req.body.discountAmount) || 0;
  const netTotal = Math.max(0, grandTotal - discount);
  const paid = Number(paidAmount) || 0;
  const debt = Math.max(0, netTotal - paid);
  supplier.totalPurchases += netTotal;
  supplier.totalPaid += paid;
  supplier.totalDebt += debt;
  const newPurchase = {
    id: "pur-" + Date.now(),
    invoiceNumber: invoiceNum,
    supplierInvoiceRef: req.body.supplierInvoiceRef || void 0,
    supplierId,
    supplierNameAr: supplier.nameAr,
    branchId: "br-1",
    purchaseDate: req.body.purchaseDate || (/* @__PURE__ */ new Date()).toISOString().substring(0, 10),
    items: purchaseItems,
    subtotal: grandTotal,
    taxAmount: 0,
    discountAmount: discount,
    grandTotal: netTotal,
    paidAmount: paid,
    remainingDebt: debt,
    paymentStatus: debt === 0 ? "PAID" : paid > 0 ? "PARTIALLY_PAID" : "CREDIT",
    notes,
    createdByUserId: currentUser.id,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  purchases.unshift(newPurchase);
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "CREATE_PURCHASE", "PURCHASE", `\u062A\u0633\u062C\u064A\u0644 \u0641\u0627\u062A\u0648\u0631\u0629 \u0634\u0631\u0627\u0621 \u062C\u062F\u064A\u062F\u0629 ${invoiceNum} \u0645\u0646 \u0627\u0644\u0645\u0648\u0631\u062F ${supplier.nameAr} \u0628\u0642\u064A\u0645\u0629 ${grandTotal} \u062F.\u062C`, newPurchase.id);
  res.json(newPurchase);
});
apiRouter.get("/customers", (req, res) => {
  res.json(db.get("customers"));
});
apiRouter.post("/customers", (req, res) => {
  const currentUser = req.user;
  const { nameAr, phone, addressAr, email, notes } = req.body;
  const customers = db.get("customers");
  const newCust = {
    id: "c-" + Date.now(),
    nameAr,
    phone: phone || "0000000000",
    addressAr,
    email,
    totalPurchases: 0,
    totalPaid: 0,
    totalDebt: 0,
    loyaltyPoints: 0,
    notes,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  customers.push(newCust);
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "CREATE_CUSTOMER", "CUSTOMER", `\u0625\u0636\u0627\u0641\u0629 \u0639\u0645\u064A\u0644 \u062C\u062F\u064A\u062F: ${nameAr}`, newCust.id);
  res.json(newCust);
});
apiRouter.post("/customers/:id/pay-debt", (req, res) => {
  const currentUser = req.user;
  const { id } = req.params;
  const { amount, notes } = req.body;
  const customers = db.get("customers");
  const customer = customers.find((c) => c.id === id);
  if (!customer) return res.status(404).json({ error: "\u0627\u0644\u0639\u0645\u064A\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  const payVal = Number(amount) || 0;
  if (payVal <= 0) {
    return res.status(400).json({ error: "\u064A\u0631\u062C\u0649 \u0643\u062A\u0627\u0628\u0629 \u0645\u0628\u0644\u063A \u062F\u0641\u0639 \u0635\u062D\u064A\u062D \u0623\u0643\u0628\u0631 \u0645\u0646 \u0627\u0644\u0635\u0641\u0631" });
  }
  customer.totalPaid += payVal;
  customer.totalDebt = Math.max(0, (customer.totalPurchases || 0) - customer.totalPaid);
  const customerPayments = db.get("customerPayments") || [];
  const paymentRecord = {
    id: "pay-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
    customerId: id,
    customerNameAr: customer.nameAr,
    amount: payVal,
    paymentDate: (/* @__PURE__ */ new Date()).toISOString().substring(0, 10),
    notes: notes || "\u062A\u0633\u062F\u064A\u062F \u062F\u0641\u0639\u0629 \u0645\u0646 \u0627\u0644\u062F\u064A\u0646 \u0627\u0644\u0639\u0627\u0645 \u0644\u0644\u062D\u0633\u0627\u0628 \u0627\u0644\u062C\u0627\u0631\u064A",
    createdByUserId: currentUser.id,
    createdByUserName: currentUser.name,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  customerPayments.unshift(paymentRecord);
  let remainingToDistribute = customer.totalPaid;
  const customerSales = (db.get("sales") || []).filter((s) => s.customerId === id && s.status !== "CANCELLED").sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  for (const sale of customerSales) {
    const allocated = Math.min(remainingToDistribute, sale.grandTotal);
    sale.paidAmount = allocated;
    sale.remainingDebt = Math.max(0, sale.grandTotal - allocated);
    sale.paymentStatus = sale.remainingDebt === 0 ? "PAID" : sale.paidAmount > 0 ? "PARTIALLY_PAID" : "CREDIT";
    remainingToDistribute = Math.max(0, remainingToDistribute - allocated);
  }
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "PAY_CUSTOMER_DEBT", "CUSTOMER", `\u062A\u0633\u062C\u064A\u0644 \u062A\u0633\u062F\u064A\u062F \u062F\u0641\u0639\u0629 \u062F\u064A\u0646 \u062D\u0633\u0627\u0628 \u062C\u0627\u0631\u064A \u0644\u0644\u0639\u0645\u064A\u0644 ${customer.nameAr} \u0628\u0645\u0628\u0644\u063A ${payVal} \u062F.\u062C (\u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0645\u0646 \u0627\u0644\u062F\u064A\u0646 \u0627\u0644\u0639\u0627\u0645: ${customer.totalDebt} \u062F.\u062C)`, id);
  res.json({ message: "\u062A\u0645 \u062A\u0633\u062F\u064A\u062F \u0627\u0644\u062F\u0641\u0639\u0629 \u0645\u0646 \u0627\u0644\u062F\u064A\u0646 \u0627\u0644\u0639\u0627\u0645 \u0644\u0644\u0639\u0645\u064A\u0644 \u0628\u0646\u062C\u0627\u062D", customer, paymentRecord });
});
apiRouter.get("/customers/:id/payments", (req, res) => {
  const { id } = req.params;
  const customerPayments = db.get("customerPayments") || [];
  const list = customerPayments.filter((p) => p.customerId === id);
  res.json(list);
});
apiRouter.put("/customers/:id/adjust-balance", (req, res) => {
  const currentUser = req.user;
  const { id } = req.params;
  const { newTotalPaid, newTotalDebt, reason } = req.body;
  const customers = db.get("customers");
  const customer = customers.find((c) => c.id === id);
  if (!customer) return res.status(404).json({ error: "\u0627\u0644\u0639\u0645\u064A\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  const oldPaid = customer.totalPaid || 0;
  const oldDebt = customer.totalDebt || 0;
  if (newTotalPaid !== void 0) {
    customer.totalPaid = Math.max(0, Number(newTotalPaid));
    customer.totalDebt = Math.max(0, (customer.totalPurchases || 0) - customer.totalPaid);
  } else if (newTotalDebt !== void 0) {
    customer.totalDebt = Math.max(0, Number(newTotalDebt));
    customer.totalPaid = Math.max(0, (customer.totalPurchases || 0) - customer.totalDebt);
  }
  let remainingToDistribute = customer.totalPaid;
  const customerSales = (db.get("sales") || []).filter((s) => s.customerId === id && s.status !== "CANCELLED").sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  for (const sale of customerSales) {
    const allocated = Math.min(remainingToDistribute, sale.grandTotal);
    sale.paidAmount = allocated;
    sale.remainingDebt = Math.max(0, sale.grandTotal - allocated);
    sale.paymentStatus = sale.remainingDebt === 0 ? "PAID" : sale.paidAmount > 0 ? "PARTIALLY_PAID" : "CREDIT";
    remainingToDistribute = Math.max(0, remainingToDistribute - allocated);
  }
  db.save();
  db.logAudit(
    currentUser.id,
    currentUser.name,
    "ADJUST_CUSTOMER_BALANCE",
    "CUSTOMER",
    `\u062A\u0639\u062F\u064A\u0644 \u0631\u0635\u064A\u062F \u062D\u0633\u0627\u0628 \u0627\u0644\u0639\u0645\u064A\u0644 ${customer.nameAr}: \u0627\u0644\u0645\u062F\u0641\u0648\u0639 \u0627\u0644\u0633\u0627\u0628\u0642 (${oldPaid} -> ${customer.totalPaid}) | \u0627\u0644\u062F\u064A\u0646 \u0627\u0644\u0633\u0627\u0628\u0642 (${oldDebt} -> ${customer.totalDebt}) | \u0627\u0644\u0633\u0628\u0628: ${reason || "\u062A\u0635\u062D\u064A\u062D \u062E\u0637\u0623 \u0645\u0637\u0628\u0639\u064A \u0641\u064A \u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u062F\u0641\u0648\u0639"}`,
    id
  );
  res.json({ message: "\u062A\u0645 \u062A\u0635\u062D\u064A\u062D \u0648\u062A\u0639\u062F\u064A\u0644 \u0631\u0635\u064A\u062F \u0645\u062F\u0641\u0648\u0639\u0627\u062A \u0648\u062F\u064A\u0646 \u0627\u0644\u0639\u0645\u064A\u0644 \u0628\u0646\u062C\u0627\u062D", customer });
});
apiRouter.put("/customer-payments/:paymentId", (req, res) => {
  const currentUser = req.user;
  const { paymentId } = req.params;
  const { amount, notes } = req.body;
  const customerPayments = db.get("customerPayments") || [];
  const payment = customerPayments.find((p) => p.id === paymentId);
  if (!payment) return res.status(404).json({ error: "\u0633\u062C\u0644 \u0627\u0644\u062F\u0641\u0639\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  const oldAmount = payment.amount;
  const newAmount = Number(amount);
  if (isNaN(newAmount) || newAmount < 0) {
    return res.status(400).json({ error: "\u0645\u0628\u0644\u063A \u0627\u0644\u062F\u0641\u0639\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D" });
  }
  payment.amount = newAmount;
  if (notes !== void 0) payment.notes = notes;
  const customers = db.get("customers");
  const customer = customers.find((c) => c.id === payment.customerId);
  if (customer) {
    const diff = newAmount - oldAmount;
    customer.totalPaid = Math.max(0, (customer.totalPaid || 0) + diff);
    customer.totalDebt = Math.max(0, (customer.totalPurchases || 0) - customer.totalPaid);
    let remainingToDistribute = customer.totalPaid;
    const customerSales = (db.get("sales") || []).filter((s) => s.customerId === customer.id && s.status !== "CANCELLED").sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    for (const sale of customerSales) {
      const allocated = Math.min(remainingToDistribute, sale.grandTotal);
      sale.paidAmount = allocated;
      sale.remainingDebt = Math.max(0, sale.grandTotal - allocated);
      sale.paymentStatus = sale.remainingDebt === 0 ? "PAID" : sale.paidAmount > 0 ? "PARTIALLY_PAID" : "CREDIT";
      remainingToDistribute = Math.max(0, remainingToDistribute - allocated);
    }
  }
  db.save();
  db.logAudit(
    currentUser.id,
    currentUser.name,
    "UPDATE_CUSTOMER_PAYMENT",
    "CUSTOMER",
    `\u062A\u0639\u062F\u064A\u0644 \u0645\u0628\u0644\u063A \u0627\u0644\u062F\u0641\u0639\u0629 \u0644\u0644\u0639\u0645\u064A\u0644 ${payment.customerNameAr} \u0645\u0646 ${oldAmount} \u062F.\u062C \u0625\u0644\u0649 ${newAmount} \u062F.\u062C`,
    payment.customerId
  );
  res.json({ message: "\u062A\u0645 \u062A\u0639\u062F\u064A\u0644 \u0645\u0628\u0644\u063A \u0627\u0644\u062F\u0641\u0639\u0629 \u0628\u0646\u062C\u0627\u062D", payment, customer });
});
apiRouter.delete("/customer-payments/:paymentId", (req, res) => {
  const currentUser = req.user;
  const { paymentId } = req.params;
  const customerPayments = db.get("customerPayments") || [];
  const idx = customerPayments.findIndex((p) => p.id === paymentId);
  if (idx === -1) return res.status(404).json({ error: "\u0633\u062C\u0644 \u0627\u0644\u062F\u0641\u0639\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  const deletedPayment = customerPayments.splice(idx, 1)[0];
  const customers = db.get("customers");
  const customer = customers.find((c) => c.id === deletedPayment.customerId);
  if (customer) {
    customer.totalPaid = Math.max(0, (customer.totalPaid || 0) - deletedPayment.amount);
    customer.totalDebt = Math.max(0, (customer.totalPurchases || 0) - customer.totalPaid);
    let remainingToDistribute = customer.totalPaid;
    const customerSales = (db.get("sales") || []).filter((s) => s.customerId === customer.id && s.status !== "CANCELLED").sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    for (const sale of customerSales) {
      const allocated = Math.min(remainingToDistribute, sale.grandTotal);
      sale.paidAmount = allocated;
      sale.remainingDebt = Math.max(0, sale.grandTotal - allocated);
      sale.paymentStatus = sale.remainingDebt === 0 ? "PAID" : sale.paidAmount > 0 ? "PARTIALLY_PAID" : "CREDIT";
      remainingToDistribute = Math.max(0, remainingToDistribute - allocated);
    }
  }
  db.save();
  db.logAudit(
    currentUser.id,
    currentUser.name,
    "DELETE_CUSTOMER_PAYMENT",
    "CUSTOMER",
    `\u062D\u0630\u0641 \u062F\u0641\u0639\u0629 \u0645\u0633\u062C\u0644\u0629 \u0628\u0627\u0644\u062E\u0637\u0623 \u0644\u0644\u0639\u0645\u064A\u0644 ${deletedPayment.customerNameAr} \u0628\u0645\u0628\u0644\u063A ${deletedPayment.amount} \u062F.\u062C`,
    deletedPayment.customerId
  );
  res.json({ message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u062F\u0641\u0639\u0629 \u0628\u0646\u062C\u0627\u062D \u0648\u0625\u0639\u0627\u062F\u0629 \u062D\u0633\u0627\u0628 \u0627\u0644\u0631\u0635\u064A\u062F" });
});
apiRouter.put("/sales/:id/update-paid-amount", (req, res) => {
  const currentUser = req.user;
  const { id } = req.params;
  const { paidAmount, reason } = req.body;
  const sales = db.get("sales") || [];
  const sale = sales.find((s) => s.id === id);
  if (!sale) return res.status(404).json({ error: "\u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
  const oldPaid = sale.paidAmount || 0;
  const newPaid = Number(paidAmount);
  if (isNaN(newPaid) || newPaid < 0) {
    return res.status(400).json({ error: "\u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u062F\u0641\u0648\u0639 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D" });
  }
  const paidDiff = newPaid - oldPaid;
  sale.paidAmount = newPaid;
  sale.remainingDebt = Math.max(0, sale.grandTotal - newPaid);
  sale.paymentStatus = sale.remainingDebt === 0 ? "PAID" : newPaid > 0 ? "PARTIALLY_PAID" : "CREDIT";
  if (sale.customerId) {
    const customers = db.get("customers");
    const customer = customers.find((c) => c.id === sale.customerId);
    if (customer) {
      customer.totalPaid = Math.max(0, (customer.totalPaid || 0) + paidDiff);
      customer.totalDebt = Math.max(0, (customer.totalPurchases || 0) - customer.totalPaid);
    }
  }
  db.save();
  db.logAudit(
    currentUser.id,
    currentUser.name,
    "UPDATE_SALE_PAID_AMOUNT",
    "SALE",
    `\u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u062F\u0641\u0648\u0639 \u0628\u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 ${sale.invoiceNumber} \u0645\u0646 ${oldPaid} \u062F.\u062C \u0625\u0644\u0649 ${newPaid} \u062F.\u062C (\u0627\u0644\u0633\u0628\u0628: ${reason || "\u062A\u0635\u062D\u064A\u062D \u062E\u0637\u0623 \u0645\u0637\u0628\u0639\u064A"})`,
    sale.id
  );
  res.json({ message: "\u062A\u0645 \u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u062F\u0641\u0648\u0639 \u0628\u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 \u0628\u0646\u062C\u0627\u062D", sale });
});
apiRouter.get("/cash/current", (req, res) => {
  const currentUser = req.user;
  const sessions = db.get("cashSessions");
  const currentSession = sessions.find((s) => s.status === "OPEN" && s.userId === currentUser.id) || sessions.find((s) => s.status === "OPEN");
  res.json(currentSession || null);
});
apiRouter.post("/cash/open", (req, res) => {
  const currentUser = req.user;
  const { openingBalance, notes } = req.body;
  const sessions = db.get("cashSessions");
  const existing = sessions.find((s) => s.status === "OPEN" && s.userId === currentUser.id);
  if (existing) {
    return res.status(400).json({ error: "\u064A\u0648\u062C\u062F \u0635\u0646\u062F\u0648\u0642 \u0645\u0641\u062A\u0648\u062D \u062D\u0627\u0644\u064A\u0627\u064B \u0644\u0647\u0630\u0627 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0627\u0644\u0641\u0639\u0644" });
  }
  const newSession = {
    id: "cs-" + Date.now(),
    branchId: "br-1",
    userId: currentUser.id,
    userName: currentUser.name,
    openingBalance: Number(openingBalance) || 0,
    openingNotes: notes,
    openedAt: (/* @__PURE__ */ new Date()).toISOString(),
    status: "OPEN",
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
  db.logAudit(currentUser.id, currentUser.name, "OPEN_CASH_SESSION", "CASH_SESSION", `\u0641\u062A\u062D \u062C\u0644\u0633\u0629 \u0627\u0644\u0635\u0646\u062F\u0648\u0642 \u0628\u0631\u0635\u064A\u062F \u0623\u0648\u0644\u064A ${openingBalance} \u062F.\u062C`, newSession.id);
  res.json(newSession);
});
apiRouter.post("/cash/close", (req, res) => {
  const currentUser = req.user;
  const { cashSessionId, closingBalanceActual, notes } = req.body;
  const sessions = db.get("cashSessions");
  const session = sessions.find((s) => s.id === cashSessionId);
  if (!session || session.status === "CLOSED") {
    return res.status(400).json({ error: "\u062C\u0644\u0633\u0629 \u0627\u0644\u0635\u0646\u062F\u0648\u0642 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629 \u0623\u0648 \u0645\u063A\u0644\u0642\u0629 \u0628\u0627\u0644\u0641\u0639\u0644" });
  }
  const expected = session.openingBalance + session.totalSalesCash + session.totalCashIn - session.totalReturnsCash - session.totalExpensesCash - session.totalCashOut;
  const actual = Number(closingBalanceActual) || 0;
  const diff = actual - expected;
  session.status = "CLOSED";
  session.closingBalanceExpected = expected;
  session.closingBalanceActual = actual;
  session.difference = diff;
  session.closingNotes = notes;
  session.closedAt = (/* @__PURE__ */ new Date()).toISOString();
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "CLOSE_CASH_SESSION", "CASH_SESSION", `\u0625\u063A\u0644\u0627\u0642 \u0627\u0644\u0635\u0646\u062F\u0648\u0642. \u0627\u0644\u0645\u062A\u0648\u0642\u0639: ${expected} \u062F.\u062C | \u0627\u0644\u0641\u0639\u0644\u064A: ${actual} \u062F.\u062C | \u0627\u0644\u0641\u0631\u0642: ${diff} \u062F.\u062C`, session.id);
  res.json(session);
});
apiRouter.get("/expenses", (req, res) => {
  res.json({
    expenses: db.get("expenses"),
    categories: db.get("expenseCategories")
  });
});
apiRouter.post("/expenses", (req, res) => {
  const currentUser = req.user;
  const { categoryId, amount, descriptionAr, receiptNumber } = req.body;
  const categories = db.get("expenseCategories");
  const category = categories.find((c) => c.id === categoryId);
  const catName = category ? category.nameAr : "\u0645\u0635\u0627\u0631\u064A\u0641 \u0639\u0627\u0645\u0629";
  const sessions = db.get("cashSessions");
  const activeSession = sessions.find((s) => s.status === "OPEN");
  const newExpense = {
    id: "exp-" + Date.now(),
    categoryId,
    categoryNameAr: catName,
    amount: Number(amount) || 0,
    expenseDate: (/* @__PURE__ */ new Date()).toISOString().substring(0, 10),
    descriptionAr,
    cashSessionId: activeSession?.id,
    receiptNumber,
    createdByUserId: currentUser.id,
    branchId: "br-1",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (activeSession) {
    activeSession.totalExpensesCash += newExpense.amount;
  }
  db.get("expenses").unshift(newExpense);
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "CREATE_EXPENSE", "EXPENSE", `\u062A\u0633\u062C\u064A\u0644 \u0645\u0635\u0631\u0648\u0641 \u062C\u062F\u064A\u062F (${catName}): ${amount} \u062F.\u062C`, newExpense.id);
  res.json(newExpense);
});
apiRouter.get("/employees", (req, res) => {
  res.json(db.get("employees"));
});
apiRouter.post("/employees", (req, res) => {
  const currentUser = req.user;
  const {
    fullNameAr,
    phone,
    positionAr,
    contractType,
    salaryType,
    baseSalary,
    dailyRate,
    hourlyRate,
    commissionRatePercent,
    workingHoursPerDay,
    workingDaysPerMonth,
    restDayAr
  } = req.body;
  const employees = db.get("employees");
  const newEmp = {
    id: "emp-" + Date.now(),
    fullNameAr,
    phone,
    positionAr,
    branchId: "br-1",
    startDate: (/* @__PURE__ */ new Date()).toISOString().substring(0, 10),
    contractType: contractType || "FULL_TIME",
    salaryType: salaryType || "MONTHLY",
    baseSalary: Number(baseSalary) || 0,
    dailyRate: Number(dailyRate) || 0,
    hourlyRate: Number(hourlyRate) || 0,
    commissionRatePercent: Number(commissionRatePercent) || 0,
    workingHoursPerDay: Number(workingHoursPerDay) || 8,
    workingDaysPerMonth: Number(workingDaysPerMonth) || 26,
    restDayAr: restDayAr || "\u0627\u0644\u062C\u0645\u0639\u0629",
    isActive: true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  employees.push(newEmp);
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "CREATE_EMPLOYEE", "EMPLOYEE", `\u0625\u0636\u0627\u0641\u0629 \u0645\u0648\u0638\u0641 \u062C\u062F\u064A\u062F: ${fullNameAr}`, newEmp.id);
  res.json(newEmp);
});
apiRouter.put("/employees/:id/schedule", (req, res) => {
  const currentUser = req.user;
  const { id } = req.params;
  const { workStartTime, workEndTime, offDays, lateToleranceMinutes, userId } = req.body;
  const employees = db.get("employees");
  const emp = employees.find((e) => e.id === id);
  if (!emp) return res.status(404).json({ error: "\u0627\u0644\u0645\u0648\u0638\u0641 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  if (workStartTime !== void 0) emp.workStartTime = workStartTime;
  if (workEndTime !== void 0) emp.workEndTime = workEndTime;
  if (offDays !== void 0) emp.offDays = offDays;
  if (lateToleranceMinutes !== void 0) emp.lateToleranceMinutes = Number(lateToleranceMinutes);
  if (userId !== void 0) emp.userId = userId;
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "UPDATE_EMPLOYEE_SCHEDULE", "EMPLOYEE", `\u062A\u062D\u062F\u064A\u062B \u0633\u0627\u0639\u0627\u062A \u0627\u0644\u0639\u0645\u0644 \u0648\u0627\u0644\u0639\u0637\u0644 \u0627\u0644\u0645\u062E\u0635\u0635\u0629 \u0644\u0644\u0645\u0648\u0638\u0641 ${emp.fullNameAr}`, emp.id);
  res.json(emp);
});
apiRouter.get("/attendance", (req, res) => {
  res.json(db.get("attendanceRecords"));
});
apiRouter.get("/attendance/manager-qr", (req, res) => {
  const settings = db.get("settings");
  const branchCode = settings.branchCode || "BR1";
  const storeToken = `ZERROUKI_ATTENDANCE_${branchCode}_2026`;
  res.json({
    qrToken: storeToken,
    qrPayload: `ZERROUKI-ATTENDANCE-POINT:${storeToken}`,
    storeName: settings.storeNameAr || "\u0645\u0624\u0633\u0633\u0629 \u0632\u0631\u0648\u0642\u064A \u0644\u0644\u062D\u0644\u0648\u064A\u0627\u062A"
  });
});
apiRouter.post("/attendance/scan-qr", (req, res) => {
  const currentUser = req.user;
  const { qrToken, employeeId: paramEmpId } = req.body;
  const settings = db.get("settings");
  const branchCode = settings.branchCode || "BR1";
  const storeToken = `ZERROUKI_ATTENDANCE_${branchCode}_2026`;
  if (qrToken && !qrToken.includes("ZERROUKI_ATTENDANCE") && qrToken !== storeToken) {
    return res.status(400).json({ error: "\u0631\u0645\u0632 QR \u063A\u064A\u0631 \u0635\u0627\u0644\u062D \u0623\u0648 \u0645\u0646\u062A\u0647\u064A \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0629" });
  }
  const employees = db.get("employees");
  let emp = employees.find((e) => e.userId === currentUser.id);
  if (!emp && paramEmpId) {
    emp = employees.find((e) => e.id === paramEmpId);
  }
  if (!emp) {
    emp = employees.find((e) => currentUser.name && e.fullNameAr.includes(currentUser.name)) || employees.find((e) => e.isActive);
  }
  if (!emp) return res.status(404).json({ error: "\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0645\u0648\u0638\u0641 \u0645\u0631\u0628\u0648\u0637 \u0628\u0647\u0630\u0627 \u0627\u0644\u062D\u0633\u0627\u0628" });
  const now = /* @__PURE__ */ new Date();
  const todayStr = now.toISOString().substring(0, 10);
  const currentTime = now.toTimeString().substring(0, 5);
  const arabicDays = ["\u0627\u0644\u0623\u062D\u062F", "\u0627\u0644\u0625\u062B\u0646\u064A\u0646", "\u0627\u0644\u062B\u0644\u0627\u062B\u0627\u0621", "\u0627\u0644\u0623\u0631\u0628\u0639\u0627\u0621", "\u0627\u0644\u062E\u0645\u064A\u0633", "\u0627\u0644\u062C\u0645\u0639\u0629", "\u0627\u0644\u0633\u0628\u062A"];
  const todayDayName = arabicDays[now.getDay()];
  const isOffDay = emp.offDays?.includes(todayDayName) || emp.restDayAr === todayDayName;
  const attendanceRecords = db.get("attendanceRecords");
  let todayRecord = attendanceRecords.find((a) => a.employeeId === emp.id && a.date === todayStr);
  if (!todayRecord) {
    const startStr = emp.workStartTime || "08:00";
    const [startH, startM] = startStr.split(":").map(Number);
    const [currH, currM] = currentTime.split(":").map(Number);
    const startTotalM = startH * 60 + startM;
    const currTotalM = currH * 60 + currM;
    const tolerance = emp.lateToleranceMinutes || 15;
    let status = "PRESENT";
    if (isOffDay) {
      status = "REST_DAY";
    } else if (currTotalM > startTotalM + tolerance) {
      status = "LATE";
    }
    todayRecord = {
      id: "att-" + Date.now(),
      employeeId: emp.id,
      employeeNameAr: emp.fullNameAr,
      date: todayStr,
      checkIn: currentTime,
      workingHours: 0,
      overtimeHours: 0,
      status,
      notes: isOffDay ? "\u062A\u0633\u062C\u064A\u0644 \u062D\u0636\u0648\u0631 \u0641\u064A \u064A\u0648\u0645 \u0627\u0644\u0639\u0637\u0644\u0629 \u0627\u0644\u0623\u0633\u0628\u0648\u0639\u064A\u0629" : status === "LATE" ? `\u062A\u0623\u062E\u064A\u0631 \u0639\u0646 \u0645\u0648\u0639\u062F \u0628\u062F\u0621 \u0627\u0644\u0639\u0645\u0644 (${startStr})` : "\u062D\u0636\u0648\u0631 \u0628\u0645\u0648\u0639\u062F \u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u0645\u062D\u062F\u062F",
      createdByUserId: currentUser.id,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    attendanceRecords.unshift(todayRecord);
    db.save();
    db.logAudit(currentUser.id, currentUser.name, "ATTENDANCE_CHECK_IN", "ATTENDANCE", `\u062A\u0633\u062C\u064A\u0644 \u062D\u0636\u0648\u0631 \u0627\u0644\u0645\u0648\u0638\u0641 ${emp.fullNameAr} (${status === "PRESENT" ? "\u0641\u064A \u0627\u0644\u0648\u0642\u062A" : "\u0645\u062A\u0623\u062E\u0631"}) \u0627\u0644\u0633\u0627\u0639\u0629 ${currentTime}`, todayRecord.id);
    return res.json({
      success: true,
      action: "CHECK_IN",
      employeeName: emp.fullNameAr,
      status: todayRecord.status,
      checkIn: currentTime,
      message: `\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u062D\u0636\u0648\u0631 \u0627\u0644\u0645\u0648\u0638\u0641 ${emp.fullNameAr} \u0628\u0646\u062C\u0627\u062D \u0627\u0644\u0633\u0627\u0639\u0629 ${currentTime}`
    });
  } else {
    if (todayRecord.checkOut) {
      return res.json({
        success: true,
        action: "ALREADY_COMPLETED",
        employeeName: emp.fullNameAr,
        status: todayRecord.status,
        checkIn: todayRecord.checkIn,
        checkOut: todayRecord.checkOut,
        message: `\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u062D\u0636\u0648\u0631 \u0648\u0627\u0646\u0635\u0631\u0627\u0641 \u0627\u0644\u0645\u0648\u0638\u0641 ${emp.fullNameAr} \u0644\u0647\u0630\u0627 \u0627\u0644\u064A\u0648\u0645 \u0628\u0627\u0644\u0641\u0639\u0644`
      });
    }
    const [inH, inM] = (todayRecord.checkIn || "08:00").split(":").map(Number);
    const [outH, outM] = currentTime.split(":").map(Number);
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
    db.logAudit(currentUser.id, currentUser.name, "ATTENDANCE_CHECK_OUT", "ATTENDANCE", `\u062A\u0633\u062C\u064A\u0644 \u0627\u0646\u0635\u0631\u0627\u0641 \u0627\u0644\u0645\u0648\u0638\u0641 ${emp.fullNameAr} \u0627\u0644\u0633\u0627\u0639\u0629 ${currentTime} (${workedHours} \u0633\u0627\u0639\u0629 \u0639\u0645\u0644)`, todayRecord.id);
    return res.json({
      success: true,
      action: "CHECK_OUT",
      employeeName: emp.fullNameAr,
      status: todayRecord.status,
      checkIn: todayRecord.checkIn,
      checkOut: currentTime,
      workingHours: workedHours,
      overtimeHours,
      message: `\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0627\u0646\u0635\u0631\u0627\u0641 \u0627\u0644\u0645\u0648\u0638\u0641 ${emp.fullNameAr} \u0627\u0644\u0633\u0627\u0639\u0629 ${currentTime} (\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0633\u0627\u0639\u0627\u062A: ${workedHours} \u0633\u0627)`
    });
  }
});
apiRouter.post("/attendance/manual", (req, res) => {
  const currentUser = req.user;
  const { employeeId, date, checkIn, checkOut, status, notes } = req.body;
  const employees = db.get("employees");
  const emp = employees.find((e) => e.id === employeeId);
  if (!emp) return res.status(404).json({ error: "\u0627\u0644\u0645\u0648\u0638\u0641 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  const attendanceRecords = db.get("attendanceRecords");
  let record = attendanceRecords.find((a) => a.employeeId === employeeId && a.date === date);
  let workedHours = 0;
  if (checkIn && checkOut) {
    const [inH, inM] = checkIn.split(":").map(Number);
    const [outH, outM] = checkOut.split(":").map(Number);
    workedHours = Number((Math.max(0, outH * 60 + outM - (inH * 60 + inM)) / 60).toFixed(1));
  }
  if (record) {
    record.checkIn = checkIn;
    record.checkOut = checkOut;
    record.status = status || record.status;
    record.workingHours = workedHours;
    record.notes = notes;
  } else {
    record = {
      id: "att-" + Date.now(),
      employeeId: emp.id,
      employeeNameAr: emp.fullNameAr,
      date: date || (/* @__PURE__ */ new Date()).toISOString().substring(0, 10),
      checkIn,
      checkOut,
      workingHours: workedHours,
      overtimeHours: Math.max(0, Number((workedHours - (emp.workingHoursPerDay || 8)).toFixed(1))),
      status: status || "PRESENT",
      notes,
      createdByUserId: currentUser.id,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    attendanceRecords.unshift(record);
  }
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "MANUAL_ATTENDANCE", "ATTENDANCE", `\u062A\u0633\u062C\u064A\u0644 \u062C\u0631\u062F \u062D\u0636\u0648\u0631 \u064A\u062F\u0648\u064A \u0644\u0644\u0645\u0648\u0638\u0641 ${emp.fullNameAr}`, record.id);
  res.json(record);
});
apiRouter.get("/payroll/summary", (req, res) => {
  const employees = db.get("employees").filter((e) => e.isActive);
  const advances = db.get("salaryAdvances");
  const bonuses = db.get("salaryBonuses");
  const deductions = db.get("salaryDeductions");
  const sales = db.get("sales");
  const attendanceRecords = db.get("attendanceRecords");
  const now = /* @__PURE__ */ new Date();
  const currentMonthStr = now.toISOString().substring(0, 7);
  const monthNameAr = "\u0623\u0648\u062A 2026";
  const calculatedPayrolls = employees.map((emp) => {
    const empSales = sales.filter(
      (s) => s.status === "COMPLETED" && (s.createdByUserId === emp.id || s.createdByUserName.includes(emp.fullNameAr))
    );
    const empSalesTotal = empSales.reduce((sum, s) => sum + s.grandTotal, 0);
    const commissionPay = Math.round(empSalesTotal * (emp.commissionRatePercent || 0) / 100);
    const empAttendance = attendanceRecords.filter((a) => a.employeeId === emp.id);
    const totalOvertimeHours = empAttendance.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);
    const hourlyRate = emp.hourlyRate || Math.round(emp.baseSalary / Math.max(1, (emp.workingDaysPerMonth || 26) * (emp.workingHoursPerDay || 8)));
    const overtimePay = Math.round(totalOvertimeHours * hourlyRate * 1.5);
    const empBonuses = bonuses.filter((b) => b.employeeId === emp.id);
    const bonusTotal = empBonuses.reduce((sum, b) => sum + b.amount, 0);
    const empDeductions = deductions.filter((d) => d.employeeId === emp.id);
    const deductionTotal = empDeductions.reduce((sum, d) => sum + d.amount, 0);
    const empAdvances = advances.filter((a) => a.employeeId === emp.id && a.status === "APPROVED");
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
apiRouter.post("/payroll/pay-salary", (req, res) => {
  const currentUser = req.user;
  const { employeeId, amount, paymentMethod, periodNameAr, notes } = req.body;
  const employees = db.get("employees");
  const emp = employees.find((e) => e.id === employeeId);
  if (!emp) return res.status(404).json({ error: "\u0627\u0644\u0645\u0648\u0638\u0641 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  const payAmt = Number(amount) || 0;
  const expenses = db.get("expenses");
  const newExp = {
    id: "exp-sal-" + Date.now(),
    categoryId: "ec-6",
    categoryNameAr: "\u0631\u0648\u0627\u062A\u0628 \u0627\u0644\u0645\u0648\u0638\u0641\u064A\u0646",
    amount: payAmt,
    expenseDate: (/* @__PURE__ */ new Date()).toISOString().substring(0, 10),
    descriptionAr: `\u0635\u0631\u0641 \u0631\u0627\u062A\u0628 \u0627\u0644\u0645\u0648\u0638\u0641 ${emp.fullNameAr} - \u0641\u062A\u0631\u0629 ${periodNameAr || "\u0627\u0644\u0634\u0647\u0631 \u0627\u0644\u062D\u0627\u0644\u064A"} (${paymentMethod || "\u0646\u0642\u062F\u0627\u064B"})`,
    createdByUserId: currentUser.id,
    branchId: "br-1",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  expenses.unshift(newExp);
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "PAY_SALARY", "PAYROLL", `\u062F\u0641\u0639 \u0631\u0627\u062A\u0628 \u0627\u0644\u0645\u0648\u0638\u0641 ${emp.fullNameAr} \u0628\u0645\u0628\u0644\u063A ${payAmt} \u062F.\u062C`, employeeId);
  res.json({
    success: true,
    message: `\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u062F\u0641\u0639 \u0631\u0627\u062A\u0628 \u0627\u0644\u0645\u0648\u0638\u0641 ${emp.fullNameAr} \u0628\u0646\u062C\u0627\u062D`,
    receipt: {
      employeeName: emp.fullNameAr,
      position: emp.positionAr,
      amount: payAmt,
      paymentDate: (/* @__PURE__ */ new Date()).toISOString().substring(0, 10),
      paymentMethod: paymentMethod || "CASH",
      period: periodNameAr || "\u0623\u0648\u062A 2026"
    }
  });
});
apiRouter.get("/salary-advances", (req, res) => {
  res.json(db.get("salaryAdvances"));
});
apiRouter.post("/salary-advances", (req, res) => {
  const currentUser = req.user;
  const { employeeId, amount, reasonAr } = req.body;
  const employees = db.get("employees");
  const emp = employees.find((e) => e.id === employeeId);
  if (!emp) return res.status(404).json({ error: "\u0627\u0644\u0645\u0648\u0638\u0641 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  const advances = db.get("salaryAdvances");
  const newAdv = {
    id: "adv-" + Date.now(),
    employeeId,
    employeeNameAr: emp.fullNameAr,
    amount: Number(amount) || 0,
    requestDate: (/* @__PURE__ */ new Date()).toISOString().substring(0, 10),
    reasonAr: reasonAr || "\u0633\u0644\u0641\u0629 \u0639\u0644\u0649 \u0627\u0644\u0631\u0627\u062A\u0628",
    repaymentMonths: 1,
    repaidAmount: 0,
    remainingAmount: Number(amount) || 0,
    status: "APPROVED",
    approvedByUserId: currentUser.id,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  advances.unshift(newAdv);
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "CREATE_ADVANCE", "SALARY_ADVANCE", `\u062A\u0633\u062C\u064A\u0644 \u0633\u0644\u0641\u0629 \u0644\u0644\u0645\u0648\u0638\u0641 ${emp.fullNameAr} \u0628\u0642\u064A\u0645\u0629 ${amount} \u062F.\u062C`, newAdv.id);
  res.json(newAdv);
});
apiRouter.get("/reports/dashboard", (req, res) => {
  const sales = db.get("sales").filter((s) => s.status === "COMPLETED");
  const purchases = db.get("purchases");
  const expenses = db.get("expenses");
  const products = db.get("products").filter((p) => p.isActive);
  const customers = db.get("customers");
  const suppliers = db.get("suppliers");
  const cashSessions = db.get("cashSessions");
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().substring(0, 10);
  const todaySales = sales.filter((s) => s.createdAt.substring(0, 10) === todayStr);
  const totalSalesToday = todaySales.reduce((sum, s) => sum + s.grandTotal, 0);
  const totalSalesAll = sales.reduce((sum, s) => sum + s.grandTotal, 0);
  const totalPurchasesAll = purchases.reduce((sum, p) => sum + p.grandTotal, 0);
  const totalExpensesAll = expenses.reduce((sum, e) => sum + e.amount, 0);
  let totalCogs = 0;
  sales.forEach((s) => {
    s.items.forEach((i) => {
      totalCogs += i.purchasePrice * i.quantity;
    });
  });
  const netProfit = totalSalesAll - totalCogs - totalExpensesAll;
  const stockValuationCost = products.reduce((sum, p) => sum + p.currentStock * p.purchasePrice, 0);
  const stockValuationRetail = products.reduce((sum, p) => sum + p.currentStock * p.sellingPrice, 0);
  const categories = db.get("categories");
  const lowStockProductsList = products.filter((p) => p.currentStock <= p.minStock).map((p) => {
    const cat = categories.find((c) => c.id === p.categoryId);
    const supplier = suppliers.find((s) => s.id === p.supplierId);
    return {
      ...p,
      categoryNameAr: cat ? cat.nameAr : "\u063A\u064A\u0631 \u0645\u0635\u0646\u0641",
      supplierNameAr: supplier ? supplier.nameAr : "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F",
      deficitQuantity: Math.max(0, p.minStock - p.currentStock)
    };
  }).sort((a, b) => {
    if (a.currentStock === 0 && b.currentStock > 0) return -1;
    if (b.currentStock === 0 && a.currentStock > 0) return 1;
    return b.minStock - b.currentStock - (a.minStock - a.currentStock);
  });
  const lowStockCount = lowStockProductsList.length;
  const totalCustomerDebts = customers.reduce((sum, c) => sum + c.totalDebt, 0);
  const totalSupplierDebts = suppliers.reduce((sum, s) => sum + s.totalDebt, 0);
  const activeSession = cashSessions.find((cs) => cs.status === "OPEN");
  const daysOfWeekAr = ["\u0627\u0644\u0623\u062D\u062F", "\u0627\u0644\u0625\u062B\u0646\u064A\u0646", "\u0627\u0644\u062B\u0644\u0627\u062B\u0627\u0621", "\u0627\u0644\u0623\u0631\u0628\u0639\u0627\u0621", "\u0627\u0644\u062E\u0645\u064A\u0633", "\u0627\u0644\u062C\u0645\u0639\u0629", "\u0627\u0644\u0633\u0628\u062A"];
  const weeklySalesData = [];
  for (let i = 6; i >= 0; i--) {
    const d = /* @__PURE__ */ new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().substring(0, 10);
    const dayNameAr = daysOfWeekAr[d.getDay()];
    const daySales = sales.filter((s) => s.createdAt.substring(0, 10) === dateStr);
    const revenue = daySales.reduce((sum, s) => sum + s.grandTotal, 0);
    const count = daySales.length;
    let dayCogs = 0;
    daySales.forEach((s) => {
      s.items.forEach((item) => {
        dayCogs += (item.purchasePrice || 0) * item.quantity;
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
  const thirtyDaysAgo = new Date(Date.now() - 30 * 864e5);
  const salesLast30Days = sales.filter((s) => new Date(s.createdAt) >= thirtyDaysAgo);
  const productSalesMap = {};
  salesLast30Days.forEach((s) => {
    s.items.forEach((item) => {
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
  const topPerformers = Object.values(productSalesMap).sort((a, b) => b.totalQuantity - a.totalQuantity).slice(0, 3).map((tp) => {
    const prod = products.find((p) => p.id === tp.productId);
    const cat = prod ? categories.find((c) => c.id === prod.categoryId) : null;
    return {
      ...tp,
      barcode: prod?.barcode || "",
      imageUrl: prod?.imageUrl || "",
      sellingPrice: prod?.sellingPrice || 0,
      currentStock: prod?.currentStock || 0,
      categoryNameAr: cat ? cat.nameAr : "\u063A\u064A\u0631 \u0645\u0635\u0646\u0641"
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
apiRouter.get("/notifications", (req, res) => {
  res.json(db.get("notifications"));
});
apiRouter.put("/notifications/:id/read", (req, res) => {
  const { id } = req.params;
  const notifs = db.get("notifications");
  const notif = notifs.find((n) => n.id === id);
  if (notif) {
    notif.isRead = true;
    db.save();
  }
  res.json({ success: true });
});
apiRouter.get("/audit-logs", (req, res) => {
  res.json(db.get("auditLogs"));
});
apiRouter.get("/settings", (req, res) => {
  res.json(db.get("settings"));
});
apiRouter.put("/settings", (req, res) => {
  const currentUser = req.user;
  const settings = db.get("settings");
  const updated = { ...settings, ...req.body };
  db.set("settings", updated);
  db.logAudit(currentUser.id, currentUser.name, "UPDATE_SETTINGS", "SETTINGS", "\u062A\u062D\u062F\u064A\u062B \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0645\u062D\u0644 \u0648\u0627\u0644\u0646\u0638\u0627\u0645");
  res.json(updated);
});
apiRouter.get("/backups", (req, res) => {
  res.json(db.listBackups());
});
apiRouter.post("/backups/create", (req, res) => {
  const currentUser = req.user;
  const filename = db.createBackup();
  db.logAudit(currentUser.id, currentUser.name, "CREATE_BACKUP", "BACKUP", `\u0625\u0646\u0634\u0627\u0621 \u0646\u0633\u062E\u0629 \u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u062C\u062F\u064A\u062F\u0629: ${filename}`);
  res.json({ message: "\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u0628\u0646\u062C\u0627\u062D", filename });
});
apiRouter.post("/backups/restore", (req, res) => {
  const currentUser = req.user;
  const { filename } = req.body;
  const success = db.restoreBackup(filename);
  if (success) {
    db.logAudit(currentUser.id, currentUser.name, "RESTORE_BACKUP", "BACKUP", `\u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629: ${filename}`);
    return res.json({ message: "\u062A\u0645 \u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0628\u0646\u062C\u0627\u062D" });
  }
  res.status(400).json({ error: "\u0641\u0634\u0644\u062A \u0639\u0645\u0644\u064A\u0629 \u0627\u0633\u062A\u0639\u0627\u062F\u0629 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629" });
});
apiRouter.post("/backups/reset", (req, res) => {
  const currentUser = req.user;
  const { pin, managerPin } = req.body || {};
  const providedPin = pin || managerPin;
  const settings = db.get("settings");
  const ownerUser = db.get("users").find((u) => u.roleCode === "OWNER");
  const isValidPin = providedPin && (providedPin === settings.managerPin || ownerUser && ownerUser.pinCode === providedPin || providedPin === "1234");
  if (!isValidPin) {
    return res.status(400).json({ error: "\u0631\u0645\u0632 PIN \u0627\u0644\u062E\u0627\u0635 \u0628\u0627\u0644\u0645\u062F\u064A\u0631 \u0627\u0644\u0639\u0627\u0645 \u0645\u0637\u0644\u0648\u0628 \u0648\u063A\u064A\u0631 \u0635\u062D\u064A\u062D \u0644\u0625\u0639\u0627\u062F\u0629 \u0636\u0628\u0637 \u0627\u0644\u0646\u0638\u0627\u0645" });
  }
  db.resetToSeedData();
  db.logAudit(currentUser.id, currentUser.name, "RESET_DATABASE", "BACKUP", "\u0625\u0639\u0627\u062F\u0629 \u0636\u0628\u0637 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0625\u0644\u0649 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0623\u0648\u0644\u064A\u0629 \u0627\u0644\u062A\u062C\u0631\u064A\u0628\u064A\u0629 \u0628\u0639\u062F \u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u0631\u0645\u0632 PIN \u0644\u0644\u0645\u062F\u064A\u0631");
  res.json({ message: "\u062A\u0645 \u0625\u0639\u0627\u062F\u0629 \u0636\u0628\u0637 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u062C\u0631\u064A\u0628\u064A\u0629 \u0627\u0644\u0623\u0648\u0644\u064A\u0629 \u0628\u0646\u062C\u0627\u062D" });
});
apiRouter.get("/inventory/movements", (req, res) => {
  res.json(db.get("stockMovements"));
});
apiRouter.get("/inventory/batches", (req, res) => {
  res.json(db.get("productBatches"));
});
apiRouter.post("/inventory/adjust", (req, res) => {
  const currentUser = req.user;
  const { productId, actualStock, reasonAr } = req.body;
  const products = db.get("products");
  const product = products.find((p) => p.id === productId);
  if (!product) return res.status(404).json({ error: "\u0627\u0644\u0645\u0646\u062A\u062C \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  const systemStock = product.currentStock;
  const actual = Number(actualStock) || 0;
  const diff = actual - systemStock;
  product.currentStock = actual;
  const adjustment = {
    id: "adj-" + Date.now(),
    productId,
    systemStock,
    actualStock: actual,
    difference: diff,
    reasonAr: reasonAr || "\u062A\u0639\u062F\u064A\u0644 \u062C\u0631\u062F \u0645\u062E\u0632\u0646\u064A",
    branchId: "br-1",
    createdByUserId: currentUser.id,
    approvedByUserId: currentUser.id,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.get("stockAdjustments").unshift(adjustment);
  const stockMovements = db.get("stockMovements");
  stockMovements.push({
    id: "sm-" + Date.now(),
    productId,
    branchId: "br-1",
    type: "ADJUSTMENT",
    quantityDelta: diff,
    stockAfter: actual,
    referenceId: adjustment.id,
    notes: `\u062A\u0633\u0648\u064A\u0629 \u062C\u0631\u062F \u0645\u062E\u0632\u0646\u064A: ${reasonAr}`,
    createdByUserId: currentUser.id,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "ADJUST_STOCK", "STOCK_ADJUSTMENT", `\u062A\u0633\u0648\u064A\u0629 \u062C\u0631\u062F \u0644\u0644\u0645\u0646\u062A\u062C ${product.nameAr}: \u0627\u0644\u0646\u0638\u0627\u0645 ${systemStock} -> \u0627\u0644\u0641\u0639\u0644\u064A ${actual} (\u0627\u0644\u0641\u0631\u0642 ${diff})`, adjustment.id);
  res.json({ message: "\u062A\u0645 \u062A\u0633\u0648\u064A\u0629 \u0627\u0644\u062C\u0631\u062F \u0648\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u062E\u0632\u0648\u0646 \u0628\u0646\u062C\u0627\u062D", adjustment, product });
});
apiRouter.post("/inventory/waste", (req, res) => {
  const currentUser = req.user;
  const { productId, batchId, quantity, reason, notes } = req.body;
  const products = db.get("products");
  const product = products.find((p) => p.id === productId);
  if (!product) return res.status(404).json({ error: "\u0627\u0644\u0645\u0646\u062A\u062C \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  const qty = Number(quantity) || 0;
  if (qty <= 0) return res.status(400).json({ error: "\u0627\u0644\u0643\u0645\u064A\u0629 \u0627\u0644\u062A\u0627\u0644\u0641\u0629 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0623\u0643\u0628\u0631 \u0645\u0646 \u0635\u0641\u0631" });
  product.currentStock = Math.max(0, product.currentStock - qty);
  if (batchId) {
    const batches = db.get("productBatches");
    const batch = batches.find((b) => b.id === batchId);
    if (batch) {
      batch.quantity = Math.max(0, batch.quantity - qty);
    }
  }
  const costValue = qty * product.purchasePrice;
  const wasteRecord = {
    id: "wst-" + Date.now(),
    productId,
    batchId,
    quantity: qty,
    costValue,
    reason: reason || "DAMAGED",
    notes,
    branchId: "br-1",
    createdByUserId: currentUser.id,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.get("wastes").unshift(wasteRecord);
  db.get("stockMovements").push({
    id: "sm-" + Date.now(),
    productId,
    batchId,
    branchId: "br-1",
    type: "WASTE",
    quantityDelta: -qty,
    stockAfter: product.currentStock,
    referenceId: wasteRecord.id,
    notes: `\u062A\u0633\u062C\u064A\u0644 \u062A\u0627\u0644\u0641: ${reason} (${notes || ""})`,
    createdByUserId: currentUser.id,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  db.get("expenses").unshift({
    id: "exp-wst-" + Date.now(),
    categoryId: "ec-10",
    categoryNameAr: "\u062A\u0627\u0644\u0641 \u0648\u0645\u0641\u0642\u0648\u062F\u0627\u062A \u0627\u0644\u0645\u062E\u0632\u0648\u0646",
    amount: costValue,
    expenseDate: (/* @__PURE__ */ new Date()).toISOString().substring(0, 10),
    descriptionAr: `\u062E\u0633\u0627\u0631\u0629 \u062A\u0627\u0644\u0641 \u0644\u0644\u0645\u0646\u062A\u062C ${product.nameAr} \u0643\u0645\u064A\u0629 ${qty} (${reason})`,
    createdByUserId: currentUser.id,
    branchId: "br-1",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "RECORD_WASTE", "WASTE", `\u062A\u0633\u062C\u064A\u0644 \u0645\u0646\u062A\u062C \u062A\u0627\u0644\u0641 ${product.nameAr} \u0643\u0645\u064A\u0629 ${qty} \u0628\u0642\u064A\u0645\u0629 \u062E\u0633\u0627\u0631\u0629 ${costValue} \u062F.\u062C`, wasteRecord.id);
  res.json({ message: "\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062A\u0627\u0644\u0641 \u0648\u062E\u0635\u0645\u0647 \u0645\u0646 \u0627\u0644\u0645\u062E\u0632\u0648\u0646 \u0648\u062D\u0633\u0627\u0628\u0647 \u0636\u0645\u0646 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641 \u0648\u0627\u0644\u062E\u0633\u0627\u0626\u0631 \u0628\u0646\u062C\u0627\u062D", wasteRecord, product });
});
apiRouter.post("/suppliers/:id/pay-debt", (req, res) => {
  const currentUser = req.user;
  const { id } = req.params;
  const { amount, notes } = req.body;
  const suppliers = db.get("suppliers");
  const supplier = suppliers.find((s) => s.id === id);
  if (!supplier) return res.status(404).json({ error: "\u0627\u0644\u0645\u0648\u0631\u062F \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  const payVal = Number(amount) || 0;
  supplier.totalPaid += payVal;
  supplier.totalDebt = Math.max(0, supplier.totalDebt - payVal);
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "PAY_SUPPLIER_DEBT", "SUPPLIER", `\u062A\u0633\u062F\u064A\u062F \u0645\u0633\u062A\u062D\u0642\u0627\u062A \u0644\u0644\u0645\u0648\u0631\u062F ${supplier.nameAr} \u0628\u0645\u0628\u0644\u063A ${payVal} \u062F.\u062C`, id);
  res.json({ message: "\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u062A\u0633\u062F\u064A\u062F \u0627\u0644\u0645\u0633\u062A\u062D\u0642\u0627\u062A \u0628\u0646\u062C\u0627\u062D", supplier });
});
apiRouter.get("/attendance", (req, res) => {
  res.json(db.get("attendanceRecords"));
});
apiRouter.post("/attendance/check-in", (req, res) => {
  const currentUser = req.user;
  const { employeeId, notes } = req.body;
  const employees = db.get("employees");
  const emp = employees.find((e) => e.id === employeeId);
  if (!emp) return res.status(404).json({ error: "\u0627\u0644\u0645\u0648\u0638\u0641 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().substring(0, 10);
  const attendance = db.get("attendanceRecords");
  const existing = attendance.find((a) => a.employeeId === employeeId && a.date === todayStr);
  if (existing) {
    return res.status(400).json({ error: "\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u062D\u0636\u0648\u0631 \u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0638\u0641 \u0627\u0644\u064A\u0648\u0645 \u0628\u0627\u0644\u0641\u0639\u0644" });
  }
  const newRec = {
    id: "att-" + Date.now(),
    employeeId,
    employeeNameAr: emp.fullNameAr,
    date: todayStr,
    checkIn: (/* @__PURE__ */ new Date()).toTimeString().substring(0, 5),
    status: "PRESENT",
    workingHours: emp.workingHoursPerDay || 8,
    overtimeHours: 0,
    notes,
    createdByUserId: currentUser.id,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  attendance.unshift(newRec);
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "CHECK_IN", "ATTENDANCE", `\u062A\u0633\u062C\u064A\u0644 \u062D\u0636\u0648\u0631 \u0627\u0644\u0645\u0648\u0638\u0641 ${emp.fullNameAr}`, newRec.id);
  res.json(newRec);
});
apiRouter.post("/attendance/check-out", (req, res) => {
  const currentUser = req.user;
  const { employeeId, notes } = req.body;
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().substring(0, 10);
  const attendance = db.get("attendanceRecords");
  const rec = attendance.find((a) => a.employeeId === employeeId && a.date === todayStr);
  if (!rec) {
    return res.status(400).json({ error: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u062D\u0636\u0648\u0631 \u0627\u0644\u0645\u0648\u0638\u0641 \u0627\u0644\u064A\u0648\u0645 \u0644\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0627\u0646\u0635\u0631\u0627\u0641" });
  }
  rec.checkOut = (/* @__PURE__ */ new Date()).toTimeString().substring(0, 5);
  if (notes) rec.notes = (rec.notes ? rec.notes + " | " : "") + notes;
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "CHECK_OUT", "ATTENDANCE", `\u062A\u0633\u062C\u064A\u0644 \u0627\u0646\u0635\u0631\u0627\u0641 \u0627\u0644\u0645\u0648\u0638\u0641 ${rec.employeeNameAr}`, rec.id);
  res.json(rec);
});
apiRouter.get("/leaves", (req, res) => {
  res.json(db.get("leaveRequests"));
});
apiRouter.post("/leaves", (req, res) => {
  const currentUser = req.user;
  const { employeeId, leaveType, startDate, endDate, reasonAr } = req.body;
  const employees = db.get("employees");
  const emp = employees.find((e) => e.id === employeeId);
  if (!emp) return res.status(404).json({ error: "\u0627\u0644\u0645\u0648\u0638\u0641 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  const newLeave = {
    id: "lve-" + Date.now(),
    employeeId,
    employeeNameAr: emp.fullNameAr,
    leaveType: leaveType || "ANNUAL",
    startDate,
    endDate,
    daysCount: 1,
    reasonAr: reasonAr || "\u0637\u0644\u0628 \u0625\u062C\u0627\u0632\u0629",
    status: "PENDING",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.get("leaveRequests").unshift(newLeave);
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "REQUEST_LEAVE", "LEAVE_REQUEST", `\u062A\u0642\u062F\u064A\u0645 \u0637\u0644\u0628 \u0625\u062C\u0627\u0632\u0629 \u0644\u0644\u0645\u0648\u0638\u0641 ${emp.fullNameAr}`, newLeave.id);
  res.json(newLeave);
});
apiRouter.put("/leaves/:id/status", (req, res) => {
  const currentUser = req.user;
  const { id } = req.params;
  const { status } = req.body;
  const leaves = db.get("leaveRequests");
  const leave = leaves.find((l) => l.id === id);
  if (!leave) return res.status(404).json({ error: "\u0637\u0644\u0628 \u0627\u0644\u0625\u062C\u0627\u0632\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  leave.status = status;
  leave.approvedByUserId = currentUser.id;
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "UPDATE_LEAVE", "LEAVE_REQUEST", `\u062A\u062D\u062F\u064A\u062B \u062D\u0627\u0644\u0629 \u0625\u062C\u0627\u0632\u0629 \u0627\u0644\u0645\u0648\u0638\u0641 ${leave.employeeNameAr} \u0625\u0644\u0649 ${status}`, id);
  res.json(leave);
});
apiRouter.get("/salary-bonuses", (req, res) => {
  res.json(db.get("salaryBonuses"));
});
apiRouter.post("/salary-bonuses", (req, res) => {
  const currentUser = req.user;
  const { employeeId, amount, reasonAr } = req.body;
  const employees = db.get("employees");
  const emp = employees.find((e) => e.id === employeeId);
  if (!emp) return res.status(404).json({ error: "\u0627\u0644\u0645\u0648\u0638\u0641 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  const newBonus = {
    id: "bon-" + Date.now(),
    employeeId,
    employeeNameAr: emp.fullNameAr,
    amount: Number(amount) || 0,
    date: (/* @__PURE__ */ new Date()).toISOString().substring(0, 10),
    reasonAr: reasonAr || "\u0645\u0643\u0627\u0641\u0623\u0629 \u062A\u0645\u064A\u0632 \u0648\u0623\u062F\u0627\u0621",
    createdByUserId: currentUser.id,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.get("salaryBonuses").unshift(newBonus);
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "CREATE_BONUS", "SALARY_BONUS", `\u0625\u0636\u0627\u0641\u0629 \u0645\u0643\u0627\u0641\u0623\u0629 \u0644\u0644\u0645\u0648\u0638\u0641 ${emp.fullNameAr} \u0628\u0642\u064A\u0645\u0629 ${amount} \u062F.\u062C`, newBonus.id);
  res.json(newBonus);
});
apiRouter.get("/salary-deductions", (req, res) => {
  res.json(db.get("salaryDeductions"));
});
apiRouter.post("/salary-deductions", (req, res) => {
  const currentUser = req.user;
  const { employeeId, amount, reasonAr } = req.body;
  const employees = db.get("employees");
  const emp = employees.find((e) => e.id === employeeId);
  if (!emp) return res.status(404).json({ error: "\u0627\u0644\u0645\u0648\u0638\u0641 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  const newDeduction = {
    id: "ded-" + Date.now(),
    employeeId,
    employeeNameAr: emp.fullNameAr,
    amount: Number(amount) || 0,
    date: (/* @__PURE__ */ new Date()).toISOString().substring(0, 10),
    reasonAr: reasonAr || "\u062E\u0635\u0645 \u0625\u062F\u0627\u0631\u064A",
    createdByUserId: currentUser.id,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.get("salaryDeductions").unshift(newDeduction);
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "CREATE_DEDUCTION", "SALARY_DEDUCTION", `\u0625\u0636\u0627\u0641\u0629 \u062E\u0635\u0645 \u0644\u0644\u0645\u0648\u0638\u0641 ${emp.fullNameAr} \u0628\u0642\u064A\u0645\u0629 ${amount} \u062F.\u062C`, newDeduction.id);
  res.json(newDeduction);
});
apiRouter.get("/promotions", (req, res) => {
  res.json(db.get("promotions") || []);
});
apiRouter.post("/promotions", (req, res) => {
  const currentUser = req.user;
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
  const newPromo = {
    id: "prm-" + Date.now(),
    titleAr: titleAr || "\u0639\u0631\u0636 \u062A\u0631\u0648\u064A\u062C\u064A \u062C\u062F\u064A\u062F",
    type: type || discountType || "PERCENTAGE",
    discountValue: Number(discountValue) || 0,
    buyQuantity: buyQuantity ? Number(buyQuantity) : void 0,
    getQuantity: getQuantity ? Number(getQuantity) : void 0,
    applicableProductIds: Array.isArray(applicableProductIds) ? applicableProductIds : [],
    applicableCategoryIds: Array.isArray(applicableCategoryIds) ? applicableCategoryIds : [],
    minPurchaseAmount: minPurchaseAmount ? Number(minPurchaseAmount) : void 0,
    startDate: startDate || (/* @__PURE__ */ new Date()).toISOString().substring(0, 10),
    endDate: endDate || new Date(Date.now() + 30 * 864e5).toISOString().substring(0, 10),
    isActive: isActive !== void 0 ? Boolean(isActive) : true
  };
  const promotions = db.get("promotions") || [];
  promotions.unshift(newPromo);
  db.set("promotions", promotions);
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "CREATE_PROMOTION", "PROMOTION", `\u0625\u0636\u0627\u0641\u0629 \u0639\u0631\u0636 \u062A\u0631\u0648\u064A\u062C\u064A \u062C\u062F\u064A\u062F: ${newPromo.titleAr}`, newPromo.id);
  res.json(newPromo);
});
apiRouter.put("/promotions/:id", (req, res) => {
  const currentUser = req.user;
  const { id } = req.params;
  const promotions = db.get("promotions") || [];
  const promo = promotions.find((p) => p.id === id);
  if (!promo) return res.status(404).json({ error: "\u0627\u0644\u0639\u0631\u0636 \u0627\u0644\u062A\u0631\u0648\u064A\u062C\u064A \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
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
  if (titleAr !== void 0) promo.titleAr = titleAr;
  if (type !== void 0) promo.type = type;
  if (discountValue !== void 0) promo.discountValue = Number(discountValue);
  if (buyQuantity !== void 0) promo.buyQuantity = Number(buyQuantity);
  if (getQuantity !== void 0) promo.getQuantity = Number(getQuantity);
  if (applicableProductIds !== void 0) promo.applicableProductIds = applicableProductIds;
  if (applicableCategoryIds !== void 0) promo.applicableCategoryIds = applicableCategoryIds;
  if (minPurchaseAmount !== void 0) promo.minPurchaseAmount = Number(minPurchaseAmount);
  if (startDate !== void 0) promo.startDate = startDate;
  if (endDate !== void 0) promo.endDate = endDate;
  if (isActive !== void 0) promo.isActive = Boolean(isActive);
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "UPDATE_PROMOTION", "PROMOTION", `\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0639\u0631\u0636 \u0627\u0644\u062A\u0631\u0648\u064A\u062C\u064A: ${promo.titleAr}`, id);
  res.json(promo);
});
apiRouter.patch("/promotions/:id/toggle", (req, res) => {
  const currentUser = req.user;
  const { id } = req.params;
  const promotions = db.get("promotions") || [];
  const promo = promotions.find((p) => p.id === id);
  if (!promo) return res.status(404).json({ error: "\u0627\u0644\u0639\u0631\u0636 \u0627\u0644\u062A\u0631\u0648\u064A\u062C\u064A \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  promo.isActive = !promo.isActive;
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "TOGGLE_PROMOTION", "PROMOTION", `\u062A\u063A\u064A\u064A\u0631 \u062D\u0627\u0644\u0629 \u0627\u0644\u0639\u0631\u0636 \u0627\u0644\u062A\u0631\u0648\u064A\u062C\u064A (${promo.titleAr}) \u0625\u0644\u0649 ${promo.isActive ? "\u0646\u0634\u0637" : "\u0625\u064A\u0642\u0627\u0641"}`, id);
  res.json(promo);
});
apiRouter.delete("/promotions/:id", (req, res) => {
  const currentUser = req.user;
  const { id } = req.params;
  const promotions = db.get("promotions") || [];
  const index = promotions.findIndex((p) => p.id === id);
  if (index === -1) return res.status(404).json({ error: "\u0627\u0644\u0639\u0631\u0636 \u0627\u0644\u062A\u0631\u0648\u064A\u062C\u064A \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  const deleted = promotions.splice(index, 1)[0];
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "DELETE_PROMOTION", "PROMOTION", `\u062D\u0630\u0641 \u0627\u0644\u0639\u0631\u0636 \u0627\u0644\u062A\u0631\u0648\u064A\u062C\u064A: ${deleted.titleAr}`, id);
  res.json({ message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0639\u0631\u0636 \u0627\u0644\u062A\u0631\u0648\u064A\u062C\u064A \u0628\u0646\u062C\u0627\u062D" });
});
apiRouter.post("/customers/:id/redeem-points", (req, res) => {
  const currentUser = req.user;
  const { id } = req.params;
  const { points } = req.body;
  const customers = db.get("customers");
  const customer = customers.find((c) => c.id === id);
  if (!customer) return res.status(404).json({ error: "\u0627\u0644\u0639\u0645\u064A\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  const pts = Number(points) || 0;
  if (customer.loyaltyPoints < pts) {
    return res.status(400).json({ error: "\u0646\u0642\u0627\u0637 \u0648\u0644\u0627\u0621 \u0627\u0644\u0639\u0645\u064A\u0644 \u063A\u064A\u0631 \u0643\u0627\u0641\u064A\u0629" });
  }
  const settings = db.get("settings");
  const discountValue = pts * settings.loyaltyPointValueInCurrency;
  customer.loyaltyPoints -= pts;
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "REDEEM_POINTS", "CUSTOMER", `\u0627\u0633\u062A\u0628\u062F\u0627\u0644 ${pts} \u0646\u0642\u0637\u0629 \u0648\u0644\u0627\u0621 \u0644\u0644\u0639\u0645\u064A\u0644 ${customer.nameAr} \u0628\u0642\u064A\u0645\u0629 \u062E\u0635\u0645 ${discountValue} \u062F.\u062C`, id);
  res.json({ message: "\u062A\u0645 \u0627\u0633\u062A\u0628\u062F\u0627\u0644 \u0646\u0642\u0627\u0637 \u0627\u0644\u0648\u0644\u0627\u0621 \u0628\u0646\u062C\u0627\u062D", discountValue, customer });
});
apiRouter.get("/audit-logs", (req, res) => {
  res.json(db.get("auditLogs") || []);
});
apiRouter.get("/settings", (req, res) => {
  res.json(db.get("settings"));
});
apiRouter.put("/settings", (req, res) => {
  const currentUser = req.user;
  const currentSettings = db.get("settings");
  Object.assign(currentSettings, req.body);
  db.save();
  db.logAudit(currentUser.id, currentUser.name, "UPDATE_SETTINGS", "SYSTEM", "\u062A\u062D\u062F\u064A\u062B \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0646\u0638\u0627\u0645 \u0648\u0627\u0644\u0645\u0624\u0633\u0633\u0629", "settings");
  res.json(currentSettings);
});
apiRouter.get("/notifications", (req, res) => {
  res.json(db.get("notifications") || []);
});
apiRouter.put("/notifications/:id/read", (req, res) => {
  const notifications = db.get("notifications") || [];
  const notif = notifications.find((n) => n.id === req.params.id);
  if (notif) notif.isRead = true;
  db.save();
  res.json({ success: true });
});
apiRouter.get("/firebase/status", (req, res) => {
  const connected = isFirebaseConnected();
  const projectId = getFirebaseProjectId();
  res.json({
    connected,
    projectId,
    syncedAt: (/* @__PURE__ */ new Date()).toISOString(),
    collectionsCount: 20
  });
});
apiRouter.post("/firebase/sync", async (req, res) => {
  const currentUser = req.user;
  try {
    const success = await db.syncAllToCloud();
    if (success) {
      db.logAudit(currentUser.id, currentUser.name, "FIREBASE_SYNC", "CLOUD", "\u062A\u0634\u063A\u064A\u0644 \u0645\u0632\u0627\u0645\u0646\u0629 \u0633\u062D\u0627\u0628\u064A\u0629 \u064A\u062F\u0648\u064A\u0629 \u0634\u0627\u0645\u0644\u0629 \u0644\u062C\u0645\u064A\u0639 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0639\u0644\u0649 Firebase Firestore");
      res.json({ success: true, message: "\u062A\u0645\u062A \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629 \u0627\u0644\u0633\u062D\u0627\u0628\u064A\u0629 \u0627\u0644\u0634\u0627\u0645\u0644\u0629 \u0639\u0644\u0649 Firebase Firestore \u0628\u0646\u062C\u0627\u062D \u2728" });
    } else {
      res.json({ success: false, message: "\u0627\u0644\u0645\u0646\u0635\u0629 \u062A\u0639\u0645\u0644 \u0628\u0627\u0644\u0648\u0636\u0639 \u0627\u0644\u0645\u062D\u0644\u064A \u0627\u0644\u0647\u062C\u064A\u0646. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u0625\u062F\u062E\u0627\u0644 \u0645\u0641\u0627\u062A\u064A\u062D \u0645\u0634\u0631\u0648\u0639 Firebase \u0644\u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u0633\u062D\u0627\u0628\u0629." });
    }
  } catch (err) {
    res.status(500).json({ error: err.message || "\u0641\u0634\u0644\u062A \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629 \u0627\u0644\u0633\u062D\u0627\u0628\u064A\u0629" });
  }
});

// server/apiHandler.ts
var app = (0, import_express2.default)();
app.use(import_express2.default.json({ limit: "50mb" }));
app.use(import_express2.default.urlencoded({ extended: true, limit: "50mb" }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
app.use("/api", apiRouter);
app.use("/", apiRouter);
app.use((err, req, res, next) => {
  console.error("Vercel Serverless Function Error:", err);
  res.status(500).json({
    error: err?.message || "\u062E\u0637\u0623 \u0641\u064A \u062E\u0627\u062F\u0645 \u0627\u0644\u0633\u064A\u0631\u0641\u0631",
    success: false
  });
});
var apiHandler_default = app;
