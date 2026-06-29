const fs = require('fs');
let code = fs.readFileSync('google-apps-script.js', 'utf8');

code = code.replace(
  'if (!shiftId && action !== "request" && action !== "submit_registration" && action !== "reset_registrations" && action !== "admin_login" && action !== "save_reg_config") {',
  'if (!shiftId && action !== "request" && action !== "submit_registration" && action !== "reset_registrations" && action !== "admin_login" && action !== "save_reg_config" && action !== "sync_roster") {'
);

const syncBlockRegex = /    if \(action === "sync_roster"\) \{\s*try \{\s*var targetShifts = req\.shiftId \? \[req\.shiftId\] : null;\s*autoGenerateRoster\(targetShifts\);\s*autoSyncPositions\(targetShifts\);\s*return ContentService\.createTextOutput\(JSON\.stringify\(\{ success: true, message: "[^"]+" \}\)\)\.setMimeType\(ContentService\.MimeType\.JSON\);\s*\} catch \(err\) \{\s*return ContentService\.createTextOutput\(JSON\.stringify\(\{ error: "[^"]+" \+ err\.toString\(\) \}\)\)\.setMimeType\(ContentService\.MimeType\.JSON\);\s*\}\s*\}/;

if (syncBlockRegex.test(code)) {
    code = code.replace(syncBlockRegex, '');
    console.log('Removed sync_roster from doGet');
} else {
    console.log('Failed to find sync_roster in doGet');
}

const insertRegex = /    return ContentService\.createTextOutput\(JSON\.stringify\(\{ error: "Invalid POST action" \}\)\)\.setMimeType\(ContentService\.MimeType\.JSON\);\s*\} catch \(e\) \{/;

const replacement = `    if (action === "sync_roster") {
      try {
        var targetShifts = data.shiftId ? [data.shiftId] : null;
        autoGenerateRoster(targetShifts);
        autoSyncPositions(targetShifts);
        return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Đã đồng bộ lịch và vị trí thành công!" })).setMimeType(ContentService.MimeType.JSON);
      } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ error: "Lỗi đồng bộ: " + err.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ error: "Invalid POST action" })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (e) {`;

if (insertRegex.test(code)) {
    code = code.replace(insertRegex, replacement);
    console.log('Inserted sync_roster into doPost');
} else {
    console.log('Failed to find Invalid POST action to insert sync_roster into doPost');
}

fs.writeFileSync('google-apps-script.js', code, 'utf8');
