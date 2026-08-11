/**
 * Export data array to Excel-compatible CSV file with UTF-8 BOM encoding for perfect Arabic language rendering.
 */
export function exportToExcel(filename: string, headers: string[], rows: (string | number | undefined | null)[][]) {
  const sanitizeCell = (val: string | number | undefined | null): string => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerRow = headers.map(sanitizeCell).join(',');
  const dataRows = rows.map(row => row.map(sanitizeCell).join(',')).join('\n');
  
  // UTF-8 BOM prefix \uFEFF to force Excel to render Arabic correctly
  const csvContent = '\uFEFF' + headerRow + '\n' + dataRows;
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().substring(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Converts numbers into Arabic text words for payment receipts (Tafqeet).
 */
export function amountInArabicWords(amount: number): string {
  if (amount <= 0) return 'صفر دينار جزائري';
  
  const units = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة'];
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  
  let val = Math.floor(amount);
  if (val === 4500) return 'أربعة آلاف وخمسمائة دينار جزائري';
  if (val === 5000) return 'خمسة آلاف دينار جزائري';
  if (val === 10000) return 'عشرة آلاف دينار جزائري';
  
  let result = '';
  if (val >= 1000) {
    const th = Math.floor(val / 1000);
    val %= 1000;
    if (th === 1) result += 'ألف ';
    else if (th === 2) result += 'ألفان ';
    else if (th >= 3 && th <= 10) result += units[th] + ' آلاف ';
    else result += th + ' ألف ';
  }
  
  if (val >= 100) {
    const h = Math.floor(val / 100);
    val %= 100;
    if (result) result += 'و';
    result += hundreds[h] + ' ';
  }
  
  if (val > 0) {
    if (result) result += 'و';
    if (val <= 10) {
      result += units[val] + ' ';
    } else if (val < 20) {
      if (val === 11) result += 'أحد عشر ';
      else if (val === 12) result += 'إثنا عشر ';
      else result += units[val - 10] + ' عشر ';
    } else {
      const t = Math.floor(val / 10);
      const u = val % 10;
      if (u > 0) {
        result += units[u] + ' و' + tens[t] + ' ';
      } else {
        result += tens[t] + ' ';
      }
    }
  }
  
  return result.trim() + ' دينار جزائري';
}
