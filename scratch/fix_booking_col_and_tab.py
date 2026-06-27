import os
import re

# Fix app.js
with open('app.js', 'r', encoding='utf-8') as f:
    app_content = f.read()

# Add handling for 'booking' in loadData
old_load_data_start = """    loadData: async (isSilent = false) => {
      try {
        if(!isSilent) {"""

new_load_data_start = """    loadData: async (isSilent = false) => {
      if (AdminApp.currentViewMode === 'booking') {
        const shiftFilter = document.getElementById('bookingShiftFilter');
        if (shiftFilter) shiftFilter.value = State.selectedShiftId;
        AdminApp.loadBookingData();
        return;
      }
      try {
        if(!isSilent) {"""

if old_load_data_start in app_content:
    app_content = app_content.replace(old_load_data_start, new_load_data_start)
else:
    print("WARNING: Could not find old_load_data_start")

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(app_content)
print("Updated app.js")

# Fix google-apps-script.js
with open('google-apps-script.js', 'r', encoding='utf-8') as f:
    gas_content = f.read()

old_gas = """        // Skip header row (row 0)
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
        }"""

new_gas = """        // Skip header row (row 0)
        for (var i = 1; i < dataRange.length; i++) {
          var row = dataRange[i];
          // Check if row is empty by checking if Ticket Number (col 1) is empty
          if (!row[1] && !row[2]) continue;
          
          var dateVal = row[2]; // Ngày fulfill
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
            region: row[3],
            department: row[4],
            socName: row[5],
            area: row[6],
            shift: row[7],
            vendor: row[8],
            totalReq: row[9],
            totalKpi: row[10],
            latestCommit: row[11]
          });
        }"""

if old_gas in gas_content:
    gas_content = gas_content.replace(old_gas, new_gas)
    print("Successfully replaced gas_content using exact match")
else:
    print("WARNING: Exact match failed, trying regex")
    # Let's just use regex to replace the whole get_booking action
    import re
    pattern = re.compile(r'// ACTION: GET_BOOKING.*?if \(action === "get_booking"\) \{.*?return sendJsonResponse\(\{ status: "success", data: bookings \}\);\s*\} catch \(e\) \{.*?\}\s*\}', re.DOTALL)
    
    new_get_booking = """// ACTION: GET_BOOKING
    if (action === "get_booking") {
      try {
        var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
        var bookingSheet = ss.getSheetByName("SOC_South");
        if (!bookingSheet) return sendJsonResponse({ status: "success", data: [] });
        
        var dataRange = bookingSheet.getDataRange().getValues();
        var bookings = [];
        
        // Skip header row (row 0)
        for (var i = 1; i < dataRange.length; i++) {
          var row = dataRange[i];
          // Check if row is empty by checking if Ticket Number (col 1) is empty
          if (!row[1] && !row[2]) continue;
          
          var dateVal = row[2]; // Ngày fulfill
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
            region: row[3],
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
    }"""
    gas_content, num = pattern.subn(new_get_booking, gas_content)
    if num > 0:
        print("Successfully replaced gas_content using regex")
    else:
        print("WARNING: Regex match failed too!")

with open('google-apps-script.js', 'w', encoding='utf-8') as f:
    f.write(gas_content)
print("Updated google-apps-script.js")
