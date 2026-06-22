/**// ==========================================
// CÁC HÀM GỌI TRIGGER THEO TỪNG CA
// ==========================================
// Nhóm Ca Sáng (06:00-15:00 và 06:00-10:00)
function trigger_Generate_CaSang() { autoGenerateRoster(["06:00-15:00", "06:00-10:00"]); }
function trigger_Sync_CaSang() { autoSyncPositions(["06:00-15:00", "06:00-10:00"]); }

// Nhóm Ca Chiều (15:00-22:00)
function trigger_Generate_CaChieu() { autoGenerateRoster(["15:00-22:00"]); }
function trigger_Sync_CaChieu() { autoSyncPositions(["15:00-22:00"]); }

// Nhóm Ca Tối (18:00-22:00)
function trigger_Generate_CaToi() { autoGenerateRoster(["18:00-22:00"]); }
function trigger_Sync_CaToi() { autoSyncPositions(["18:00-22:00"]); }

// Nhóm Ca Đêm (22:00-06:00)
function trigger_Generate_CaDem() { autoGenerateRoster(["22:00-06:00"]); }
function trigger_Sync_CaDem() { autoSyncPositions(["22:00-06:00"]); }

// ==========================================
// HÀM TẠO TRIGGER TỰ ĐỘNG (CHỈ CẦN CHẠY 1 LẦN)
// ==========================================
function setupAutoTriggers() {
  var existingTriggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < existingTriggers.length; i++) {
    ScriptApp.deleteTrigger(existingTriggers[i]);
  }
  
  // 1. Ca Sáng (6h-15h & 6h-10h): Chốt 06:15 hôm trước, Cập nhật vị trí 15:00
  ScriptApp.newTrigger("trigger_Generate_CaSang").timeBased().atHour(6).nearMinute(15).everyDays(1).create();
  ScriptApp.newTrigger("trigger_Sync_CaSang").timeBased().atHour(15).nearMinute(0).everyDays(1).create();

  // 2. Ca Chiều (15h-22h): Chốt 15:00 hôm trước, Cập nhật vị trí 20:00
  ScriptApp.newTrigger("trigger_Generate_CaChieu").timeBased().atHour(15).nearMinute(0).everyDays(1).create();
  ScriptApp.newTrigger("trigger_Sync_CaChieu").timeBased().atHour(20).nearMinute(0).everyDays(1).create();

  // 3. Ca Tối (18h-22h): Chốt 18:00 hôm trước, Cập nhật vị trí 22:00
  ScriptApp.newTrigger("trigger_Generate_CaToi").timeBased().atHour(18).nearMinute(0).everyDays(1).create();
  ScriptApp.newTrigger("trigger_Sync_CaToi").timeBased().atHour(22).nearMinute(0).everyDays(1).create();

  // 4. Ca Đêm (22h-06h): Chốt 22:00 hôm trước, Cập nhật vị trí 22:00 (vị trí cập nhật cho hôm nay, chốt lịch cho ngày mai)
  ScriptApp.newTrigger("trigger_Generate_CaDem").timeBased().atHour(22).nearMinute(0).everyDays(1).create();
  ScriptApp.newTrigger("trigger_Sync_CaDem").timeBased().atHour(22).nearMinute(0).everyDays(1).create();
}
