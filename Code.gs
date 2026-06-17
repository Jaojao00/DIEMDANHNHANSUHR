/**
 * ============================================================
 * AGR Attendance System - Google Apps Script Backend
 * ============================================================
 * Deploy this as a Google Apps Script Web App.
 * See README.md for setup instructions.
 *
 * Google Sheet structure required:
 *   Sheet "LichLamViec": STT | MaCTV | HoTen | DinhDanh | ViTriCoDinh | SauGioNghi | Slot4h6h | Ngay | Highlight
 *   Sheet "DiemDanh":    Ngay | MaCTV | HoTen | SDT | ThoiGian | PhuongThuc | ViTri | Ca
 * ============================================================
 */

// ============================================================
// CONFIGURATION
// ============================================================
const SHEET_SCHEDULE = 'LichLamViec';   // Sheet chứa lịch làm việc
const SHEET_ATTENDANCE = 'DiemDanh';    // Sheet ghi kết quả điểm danh

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// ============================================================
// HANDLE GET REQUESTS
// ============================================================
function doGet(e) {
  try {
    const action = e.parameter.action || 'getSchedule';

    switch (action) {
      case 'getSchedule':
        return jsonResponse(getSchedule(e.parameter.date));

      case 'getAttendance':
        return jsonResponse(getAttendance(e.parameter.date));

      default:
        return jsonResponse({ error: 'Unknown action: ' + action }, 400);
    }
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// ============================================================
// HANDLE POST REQUESTS
// ============================================================
function doPost(e) {
  try {
    let body;
    try {
      body = JSON.parse(e.postData.contents);
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const action = body.action || 'attendance';

    switch (action) {
      case 'attendance':
        return jsonResponse(recordAttendance(body));

      default:
        return jsonResponse({ error: 'Unknown action: ' + action }, 400);
    }
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// ============================================================
// GET SCHEDULE
// Trả về lịch làm việc theo ngày (mặc định: hôm nay)
// ============================================================
function getSchedule(dateParam) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_SCHEDULE);

  if (!sheet) throw new Error(`Sheet "${SHEET_SCHEDULE}" không tồn tại`);

  const today = dateParam || formatDateVN(new Date());
  const data = sheet.getDataRange().getValues();

  // Row 0 = headers
  const headers = data[0].map(h => String(h).trim().toLowerCase());

  // Find column indices (flexible, không phụ thuộc vào thứ tự)
  const col = {
    stt:      findCol(headers, ['stt', 'so thu tu', 'số thứ tự']),
    maCTV:    findCol(headers, ['mactv', 'ma ctv', 'mã ctv', 'employee id', 'ops']),
    hoTen:    firstValid(findCol(headers, ['ho ten', 'họ tên', 'name', 'fullname'])),
    dinhDanh: findCol(headers, ['dinh danh', 'định danh', 'type']),
    viTri:    findCol(headers, ['vi tri co dinh', 'vị trí cố định', 'position']),
    sauNghi:  findCol(headers, ['sau gio nghi', 'sau giờ nghỉ']),
    slot4h6h: findCol(headers, ['4h-6h', '4h6h', '4h – 6h']),
    ngay:     findCol(headers, ['ngay', 'ngày', 'date']),
    highlight:findCol(headers, ['highlight', 'color', 'mau']),
  };

  const employees = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // Filter by date if date column exists
    if (col.ngay >= 0) {
      const rowDate = formatDateVN(new Date(row[col.ngay]));
      if (rowDate !== today) continue;
    }

    // Skip completely empty rows
    const maCTV = String(row[col.maCTV] || '').trim();
    if (!maCTV) continue;

    employees.push({
      stt:         row[col.stt] || i,
      maCTV:       maCTV,
      hoTen:       String(row[col.hoTen] || '').trim(),
      dinhDanh:    String(row[col.dinhDanh] || 'A-OS').trim(),
      viTriCoDinh: String(row[col.viTri] || '').trim() || 'Chưa sắp lịch',
      sauGioNghi:  String(row[col.sauNghi] || '').trim() || 'Chưa sắp lịch',
      slot4h6h:    String(row[col.slot4h6h] || '').trim() || 'Chưa sắp lịch',
      highlight:   String(row[col.highlight] || '').trim().toLowerCase() || null,
    });
  }

  // Get shift title from a title row or build from date
  const shiftTitle = extractShiftTitle(data) || `CA (${today})`;

  return {
    date: today,
    shift: shiftTitle,
    employees: employees,
    total: employees.length,
    fetchedAt: new Date().toISOString(),
  };
}

// ============================================================
// RECORD ATTENDANCE
// Ghi điểm danh mới vào sheet DiemDanh
// ============================================================
function recordAttendance(body) {
  const { maCTV, hoTen, sdt, timestamp, timeDisplay, date, method, viTriCoDinh } = body;

  // Validate
  if (!maCTV || !hoTen) {
    return { success: false, error: 'Thiếu mã CTV hoặc họ tên' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_ATTENDANCE);

  // Create sheet if not exists
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_ATTENDANCE);
    sheet.getRange(1, 1, 1, 8).setValues([[
      'Ngày', 'Mã CTV', 'Họ tên', 'SDT Zalo', 'Thời gian', 'Phương thức', 'Vị trí', 'Ca'
    ]]);
    sheet.getRange(1, 1, 1, 8)
      .setBackground('#e63c1e')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
  }

  // Check duplicate (same employee, same date)
  const today = date || formatDateVN(new Date());
  const existingData = sheet.getDataRange().getValues();
  for (let i = 1; i < existingData.length; i++) {
    const existDate = String(existingData[i][0]).trim();
    const existCode = String(existingData[i][1]).toUpperCase().trim();
    if (existDate === today && existCode === maCTV.toUpperCase().trim()) {
      return {
        success: false,
        alreadyAttended: true,
        error: `${maCTV} đã điểm danh lúc ${existingData[i][4]}`,
      };
    }
  }

  // Append row
  const methodLabel = method === 'camera' ? 'Quét thẻ' : 'Nhập tay';
  sheet.appendRow([
    today,
    maCTV.toUpperCase(),
    hoTen,
    sdt || '',
    timeDisplay || formatTime(new Date()),
    methodLabel,
    viTriCoDinh || '',
    extractShift(ss),
  ]);

  // Format the new row
  const lastRow = sheet.getLastRow();
  const rowRange = sheet.getRange(lastRow, 1, 1, 8);
  rowRange.setBackground(lastRow % 2 === 0 ? '#f8f8f8' : '#ffffff');

  return {
    success: true,
    message: `Đã ghi điểm danh: ${maCTV} - ${hoTen} lúc ${timeDisplay}`,
  };
}

// ============================================================
// GET ATTENDANCE
// Trả về danh sách đã điểm danh hôm nay
// ============================================================
function getAttendance(dateParam) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_ATTENDANCE);
  if (!sheet) return { attendance: [] };

  const today = dateParam || formatDateVN(new Date());
  const data = sheet.getDataRange().getValues();
  const records = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[0]).trim() === today) {
      records.push({
        maCTV:     String(row[1]).trim(),
        hoTen:     String(row[2]).trim(),
        sdt:       String(row[3]).trim(),
        time:      String(row[4]).trim(),
        method:    String(row[5]).trim(),
        viTri:     String(row[6]).trim(),
      });
    }
  }

  return { date: today, attendance: records };
}

// ============================================================
// HELPERS
// ============================================================
function jsonResponse(data, statusCode) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function formatDateVN(date) {
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatTime(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function pad(n) { return String(n).padStart(2, '0'); }

function findCol(headers, keys) {
  for (const key of keys) {
    const idx = headers.findIndex(h => h.includes(key));
    if (idx >= 0) return idx;
  }
  return -1;
}

function firstValid(...indices) {
  for (const i of indices) if (i >= 0) return i;
  return -1;
}

function extractShiftTitle(data) {
  // Look for a merged title row that mentions "CA"
  for (let i = 0; i < Math.min(5, data.length); i++) {
    const cell = String(data[i][0] || '');
    if (cell.toUpperCase().includes('CA')) return cell;
  }
  return null;
}

function extractShift(ss) {
  const sheet = ss.getSheetByName(SHEET_SCHEDULE);
  if (!sheet) return '';
  const cell = String(sheet.getRange(1, 1).getValue());
  return cell.includes('CA') ? cell.split('\n')[0].trim() : 'CA';
}

/**
 * Test function — chạy trong Apps Script Editor để kiểm tra
 */
function testGetSchedule() {
  const result = getSchedule();
  Logger.log(JSON.stringify(result, null, 2));
}

function testRecordAttendance() {
  const result = recordAttendance({
    maCTV: 'OPS224190',
    hoTen: 'Phan Tuấn Kiệt',
    sdt: '0901234567',
    timestamp: new Date().toISOString(),
    timeDisplay: '22:35:00',
    date: formatDateVN(new Date()),
    method: 'manual',
    viTriCoDinh: 'A1-A4',
  });
  Logger.log(JSON.stringify(result));
}
