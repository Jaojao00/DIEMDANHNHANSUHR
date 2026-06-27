import os
import re

with open('google-apps-script.js', 'r', encoding='utf-8') as f:
    content = f.read()

reject_code = """
    // ACTION: REJECT_CHANGE_REQUEST
    if (action === "reject_change_request") {
      var lock = LockService.getScriptLock();
      try {
        lock.waitLock(10000);
        var regSs = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
        var crSheet = regSs.getSheetByName("ChangeRequests");
        if (crSheet && data.reqId) {
          var crVals = crSheet.getDataRange().getValues();
          for (var c = 1; c < crVals.length; c++) {
            if (crVals[c][0] === data.reqId) {
              crSheet.getRange(c + 1, 6).setValue("rejected");
              break;
            }
          }
        }
        return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
      } catch (e) {
        return ContentService.createTextOutput(JSON.stringify({ error: e.toString() })).setMimeType(ContentService.MimeType.JSON);
      } finally {
        lock.releaseLock();
      }
    }
"""

# Insert before GET_CHANGE_REQUESTS
content = content.replace('    // ACTION: GET_CHANGE_REQUESTS', reject_code + '    // ACTION: GET_CHANGE_REQUESTS')

# Also, I should make sure get_change_requests action allows reject_change_request in the top validation.
# Let's see the top validation:
# if (!shiftId && action !== "request" && action !== "submit_registration" && action !== "reset_registrations" && action !== "admin_login" && action !== "save_reg_config" && action !== "sync_roster" && action !== "get_change_requests" && action !== "submit_change_request" && action !== "approve_change_request") { ... }
content = content.replace('action !== "approve_change_request")', 'action !== "approve_change_request" && action !== "reject_change_request")')

with open('google-apps-script.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated GAS with reject_change_request")
