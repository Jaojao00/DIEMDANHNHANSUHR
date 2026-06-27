import os
import re

with open('google-apps-script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# I want to add status update logic to approve_change_request.
# Just before `return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);` (both of them).

# First, find where action === "approve_change_request" begins, and inject finding the reqId.
# Wait, it's safer to just do a string replace for the success returns.
# But we need reqId. The payload will have `data.reqId`.

update_status_code = """          // Update status in ChangeRequests sheet
          var crSheet = regSs.getSheetByName("ChangeRequests");
          if (crSheet && data.reqId) {
            var crVals = crSheet.getDataRange().getValues();
            for (var c = 1; c < crVals.length; c++) {
              if (crVals[c][0] === data.reqId) {
                crSheet.getRange(c + 1, 6).setValue("approved");
                break;
              }
            }
          }
          return ContentService.createTextOutput"""

content = content.replace("return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);", update_status_code + "(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);")

with open('google-apps-script.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated GAS script with status update for approve_change_request")
