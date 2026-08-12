# دليل نشر قواعد الفايربيز وتفعيل السحابة الكاملة (Firebase Firestore Deployment Guide)

لتحقيق الربط السحابي الشامل والكامل 100% لقاعدة بيانات منصة زروقي، اتبع الخطوات التالية لنشر قواعد حماية **Firebase Firestore**:

---

## 1️⃣ الخطوة الأولى: الدخول إلى وحدة تحكم الفايربيز (Firebase Console)
1. افتح رابط وحدة تحكم فايربيز: [https://console.firebase.google.com](https://console.firebase.google.com)
2. اختر مشروعك التجاري (أو أنشئ مشروعاً جديداً مجاناً باسم `zerrouki-store-cloud`).

---

## 2️⃣ الخطوة الثانية: تفعيل قاعدة البيانات السحابية (Firestore Database)
1. من القائمة الجانبية في Firebase Console، اضغط على **Build** ثم اختر **Firestore Database**.
2. اضغط على زر **Create database**.
3. اختر موقع الخادم القريب (مثل: `europe-west1` أو `us-central1`).

---

## 3️⃣ الخطوة الثالثة: نسخ ونشر قواعد الأمان الكاملة (Firestore Rules)
1. داخل صفحة **Firestore Database**، اضغط على تبويب **Rules (القواعد)** في الأعلى.
2. امسح المحتوى القديم بالكامل وضَع القواعد التالية المجهزة والشاملة لجميع مجموعات المنصة (الـ 33 مجموعة بالكامل):

```protobuf
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // القاعدة العامة الشاملة لكل المجموعات الحالية والمستقبلية (Recursive Wildcard Rule)
    match /{document=**} {
      allow read, write: if true;
    }

    // 📦 المنتجات والمخزون والتصنيفات
    match /products/{id} { allow read, write: if true; }
    match /productBatches/{id} { allow read, write: if true; }
    match /categories/{id} { allow read, write: if true; }
    match /brands/{id} { allow read, write: if true; }
    match /units/{id} { allow read, write: if true; }
    match /stockMovements/{id} { allow read, write: if true; }
    match /wastes/{id} { allow read, write: if true; }
    match /stockAdjustments/{id} { allow read, write: if true; }

    // 💰 المبيعات والعملاء وفواتير المشتريات والموردين
    match /sales/{id} { allow read, write: if true; }
    match /saleReturns/{id} { allow read, write: if true; }
    match /customers/{id} { allow read, write: if true; }
    match /customerPayments/{id} { allow read, write: if true; }
    match /purchases/{id} { allow read, write: if true; }
    match /suppliers/{id} { allow read, write: if true; }
    match /promotions/{id} { allow read, write: if true; }

    // 💵 الخزينة والكتلة المالية والمصاريف
    match /cashSessions/{id} { allow read, write: if true; }
    match /cashMovements/{id} { allow read, write: if true; }
    match /expenses/{id} { allow read, write: if true; }
    match /expenseCategories/{id} { allow read, write: if true; }

    // 👥 الموظفون والأجور والحضور والخصومات
    match /employees/{id} { allow read, write: if true; }
    match /attendanceRecords/{id} { allow read, write: if true; }
    match /leaveRequests/{id} { allow read, write: if true; }
    match /salaryAdvances/{id} { allow read, write: if true; }
    match /salaryBonuses/{id} { allow read, write: if true; }
    match /salaryDeductions/{id} { allow read, write: if true; }
    match /payrollPeriods/{id} { allow read, write: if true; }
    match /payrollRecords/{id} { allow read, write: if true; }

    // ⚙️ المستخدمون والصلاحيات وإعدادات النظام وسجل التدقيق
    match /users/{id} { allow read, write: if true; }
    match /roles/{id} { allow read, write: if true; }
    match /permissions/{id} { allow read, write: if true; }
    match /branches/{id} { allow read, write: if true; }
    match /settings/{id} { allow read, write: if true; }
    match /app_settings/{id} { allow read, write: if true; }
    match /auditLogs/{id} { allow read, write: if true; }
    match /notifications/{id} { allow read, write: if true; }
  }
}
```

3. اضغط على زر **Publish (نشر)** المضيء باللون الأزرق في الأعلى لتفعيل القواعد سحابياً!
