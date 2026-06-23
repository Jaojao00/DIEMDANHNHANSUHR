const fs = require('fs');

let oldCode = fs.readFileSync('google-apps-script.js', 'utf8');
let latestCode = fs.readFileSync('latest_google_apps_script.js', 'utf8');

// 1. Delete sync_roster from doGet
const syncGetRegex = /    if \(action === "sync_roster"\) \{\s*try \{\s*var targetShifts = req\.shiftId \? \[req\.shiftId\] : null;\s*autoGenerateRoster\(targetShifts\);\s*autoSyncPositions\(targetShifts\);\s*return ContentService\.createTextOutput\(JSON\.stringify\(\{ success: true, message: "[^"]+" \}\)\)\.setMimeType\(ContentService\.MimeType\.JSON\);\s*\} catch \(err\) \{\s*return ContentService\.createTextOutput\(JSON\.stringify\(\{ error: "[^"]+" \+ err\.toString\(\) \}\)\)\.setMimeType\(ContentService\.MimeType\.JSON\);\s*\}\s*\}/g;
oldCode = oldCode.replace(syncGetRegex, '');

// 2. Insert sync_roster into doPost
const insertRegex = /    \/\/ Pre-flight check \(CORS ping\)\s*return ContentService\.createTextOutput\(JSON\.stringify\(\{ status: "AGR API is running" \}\)\)\.setMimeType\(ContentService\.MimeType\.JSON\);\s*\} catch \(e\) \{/;

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

    // Pre-flight check (CORS ping)
    return ContentService.createTextOutput(JSON.stringify({ status: "AGR API is running" })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (e) {`;

oldCode = oldCode.replace(insertRegex, replacement);

// 3. Replace the tail (autoGenerateRoster onwards)
const autoGenStart = oldCode.indexOf('// ==========================================');
const latestAutoGenStart = latestCode.indexOf('// ==========================================');

if (autoGenStart !== -1 && latestAutoGenStart !== -1) {
    const tailOld = oldCode.substring(autoGenStart);
    const tailNew = latestCode.substring(latestAutoGenStart);
    oldCode = oldCode.substring(0, autoGenStart) + tailNew;
}

// 4. Update the Pre-flight block at top of file
const topPreFlight = 'if (!shiftId && action !== "request" && action !== "submit_registration" && action !== "reset_registrations" && action !== "admin_login" && action !== "save_reg_config") {';
const topPreFlightNew = 'if (!shiftId && action !== "request" && action !== "submit_registration" && action !== "reset_registrations" && action !== "admin_login" && action !== "save_reg_config" && action !== "sync_roster") {';
oldCode = oldCode.replace(topPreFlight, topPreFlightNew);


fs.writeFileSync('google-apps-script.js', oldCode, 'utf8');
console.log('Successfully patched tail and sync_roster!');
