import os

with open('google-apps-script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Add get_booking to the Missing shiftId check
old_missing_shiftId = 'action !== "reject_change_request") {'
new_missing_shiftId = 'action !== "reject_change_request" && action !== "get_booking") {'

if old_missing_shiftId in content:
    content = content.replace(old_missing_shiftId, new_missing_shiftId)
else:
    print("WARNING: old_missing_shiftId not found")


booking_action = """
    // ACTION: GET_BOOKING
    if (action === "get_booking") {
      try {
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var bookingSheet = ss.getSheetByName("SOC_South");
        if (!bookingSheet) return sendJsonResponse({ status: "success", data: [] });
        
        var dataRange = bookingSheet.getDataRange().getValues();
        var bookings = [];
        
        // Skip header row (row 0)
        for (var i = 1; i < dataRange.length; i++) {
          var row = dataRange[i];
          // Check if row is empty by checking if Ticket Number (col 1) is empty
          if (!row[1] && !row[3]) continue;
          
          var dateVal = row[3]; // Ngày fulfill
          if (dateVal instanceof Date) {
            // Formatting JS Date to YYYY-MM-DD
            var y = dateVal.getFullYear();
            var m = ("0" + (dateVal.getMonth() + 1)).slice(-2);
            var d = ("0" + dateVal.getDate()).slice(-2);
            dateVal = y + "-" + m + "-" + d;
          } else {
            dateVal = dateVal.toString();
          }
          
          bookings.push({
            commit: row[0],
            ticket: row[1],
            date: dateVal,
            department: row[4],
            socName: row[5],
            area: row[6],
            shift: row[7],
            vendor: row[8],
            totalReq: row[9],
            totalKpi: row[10],
            latestCommit: row[11]
          });
        }
        return sendJsonResponse({ status: "success", data: bookings });
      } catch (e) {
        return sendJsonResponse({ status: "error", message: e.toString() });
      }
    }
"""

old_get_change_requests = """    // ACTION: GET_CHANGE_REQUESTS
    if (action === "get_change_requests") {"""

if old_get_change_requests in content:
    content = content.replace(old_get_change_requests, booking_action + '\n' + old_get_change_requests)
else:
    print("WARNING: old_get_change_requests not found")


with open('google-apps-script.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("google-apps-script.js updated successfully!")
