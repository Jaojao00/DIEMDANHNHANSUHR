/**
 * TRIGGERS TỰ ĐỘNG HÓA ĐỊNH KỲ VÀ AUDIT LOG (TRIGGERS)
 */

function setupAutoTriggers() {
  // Xóa các trigger cũ để tránh trùng lặp
  var allTriggers = ScriptApp.getProjectTriggers();
  allTriggers.forEach(function(trigger) {
    ScriptApp.deleteTrigger(trigger);
  });

  // 1. Dọn dẹp đơn cũ lúc 00:05 mỗi ngày
  ScriptApp.newTrigger('cleanupOldRequests')
    .timeBased()
    .atHour(0)
    .nearMinute(5)
    .everyDays(1)
    .create();

  // 2. Chốt danh sách & đồng bộ vị trí các ca
  // Ca Sáng: 06:15 và 15:00
  ScriptApp.newTrigger('triggerMorningShift').timeBased().atHour(6).nearMinute(15).everyDays(1).create();
  // Ca Chiều: 15:00 và 20:00
  ScriptApp.newTrigger('triggerAfternoonShift').timeBased().atHour(15).nearMinute(0).everyDays(1).create();
  // Ca Tối: 18:00 và 22:00
  ScriptApp.newTrigger('triggerEveningShift').timeBased().atHour(18).nearMinute(0).everyDays(1).create();
  // Ca Đêm: 22:00
  ScriptApp.newTrigger('triggerNightShift').timeBased().atHour(22).nearMinute(0).everyDays(1).create();

  console.log('Tất cả Auto Triggers đã được thiết lập thành công!');
}

function cleanupOldRequests() {
  try {
    var sheet = getOrCreateSheet(CONFIG.SHEETS.XIN_OFF);
    var rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) return;

    var todayStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd");
    var keepRows = [rows[0]]; // header

    for (var i = 1; i < rows.length; i++) {
      var dateVal = String(rows[i][6] || '');
      if (dateVal >= todayStr) {
        keepRows.push(rows[i]);
      }
    }

    sheet.clearContents();
    sheet.getRange(1, 1, keepRows.length, keepRows[0].length).setValues(keepRows);
    console.log('Đã dọn dẹp các đơn xin off cũ quá hạn.');
  } catch (e) {
    console.warn('Lỗi cleanupOldRequests:', e);
  }
}

function onEdit(e) {
  try {
    if (!e || !e.range) return;
    var range = e.range;
    var sheet = range.getSheet();
    var sheetName = sheet.getName();

    // Bỏ qua nếu sửa trong AdminLogs
    if (sheetName === CONFIG.SHEETS.ADMIN_LOGS) return;

    var logSheet = getOrCreateSheet(CONFIG.SHEETS.ADMIN_LOGS);
    var user = Session.getActiveUser().getEmail() || 'Anonymous';
    var cellA1 = range.getA1Notation();
    var oldValue = e.oldValue !== undefined ? String(e.oldValue) : '';
    var newValue = e.value !== undefined ? String(e.value) : '';

    logSheet.appendRow([
      formatVNTime(new Date()),
      user,
      sheetName,
      cellA1,
      oldValue,
      newValue
    ]);
  } catch (err) {
    console.warn('Lỗi onEdit audit log:', err);
  }
}
