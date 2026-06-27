import os

# 1. Update index.html
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

old_thead = """          <thead id="bookingHead">
            <tr>
              <th style="min-width: 60px;">Commit >= Req</th>
              <th>Ticket Number</th>
              <th>Ngày fulfill</th>
              <th>Bộ phận</th>
              <th>Tên SOC</th>
              <th>Khu Làm việc</th>
              <th>Ca yêu cầu</th>
              <th>Vendor Name</th>
              <th>Total Request</th>
              <th>Tổng KPI</th>
              <th>Vendor commit mới nhất</th>
            </tr>
          </thead>"""
new_thead = """          <thead id="bookingHead">
            <tr>
              <th style="min-width: 60px;">Commit >= Req</th>
              <th>Ticket Number</th>
              <th>Ngày fulfill</th>
              <th>Vùng</th>
              <th>Bộ phận</th>
              <th>Tên SOC</th>
              <th>Khu Làm việc</th>
              <th>Ca yêu cầu</th>
              <th>Vendor Name</th>
              <th>Total Request</th>
              <th>Tổng KPI</th>
              <th>Vendor commit mới nhất</th>
            </tr>
          </thead>"""
content = content.replace(old_thead, new_thead)
content = content.replace('colspan="11"', 'colspan="12"')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

# 2. Update app.js
with open('app.js', 'r', encoding='utf-8') as f:
    app_content = f.read()

old_tbody = """          <tr>
            ${commitCell}
            <td>${b.ticket || ''}</td>
            <td>${dateStr}</td>
            <td>${b.department || ''}</td>
            <td>${b.socName || ''}</td>
            <td>${b.area || ''}</td>
            <td>${b.shift || ''}</td>
            <td>${b.vendor || ''}</td>
            <td>${b.totalReq || ''}</td>
            <td>${b.totalKpi || ''}</td>
            <td>${b.latestCommit || ''}</td>
          </tr>"""
new_tbody = """          <tr>
            ${commitCell}
            <td>${b.ticket || ''}</td>
            <td>${dateStr}</td>
            <td>${b.region || ''}</td>
            <td>${b.department || ''}</td>
            <td>${b.socName || ''}</td>
            <td>${b.area || ''}</td>
            <td>${b.shift || ''}</td>
            <td>${b.vendor || ''}</td>
            <td>${b.totalReq || ''}</td>
            <td>${b.totalKpi || ''}</td>
            <td>${b.latestCommit || ''}</td>
          </tr>"""

app_content = app_content.replace(old_tbody, new_tbody)
app_content = app_content.replace('colspan="11"', 'colspan="12"')

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(app_content)

# 3. Update google-apps-script.js
with open('google-apps-script.js', 'r', encoding='utf-8') as f:
    gas_content = f.read()

old_gas = """          // Skip header row (row 0)
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

new_gas = """          // Skip header row (row 0)
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

gas_content = gas_content.replace(old_gas, new_gas)

with open('google-apps-script.js', 'w', encoding='utf-8') as f:
    f.write(gas_content)

print("All files updated successfully")
