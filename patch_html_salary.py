import re

with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

# Add button
nav_btn = """                <button
                  class="btn btn-sm btn-ghost"
                  id="viewModeBooking"
                  style="
                    color: var(--text-secondary);
                    border: none;
                    font-size: 13px;
                  "
                >
                  Booking
                </button>
                <button
                  class="btn btn-sm btn-ghost"
                  id="viewModeSalary"
                  style="
                    color: var(--text-secondary);
                    border: none;
                    font-size: 13px;
                  "
                >
                  Bảng Lương
                </button>"""

content = re.sub(r'<\s*button[^>]*id="viewModeBooking"[^>]*>[\s\S]*?Booking\s*</button>', nav_btn, content)

table_container = """
          <!-- Salary Table Container -->
          <div class="table-container" id="salaryTableContainer" style="display: none">
            <div style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap; align-items: center;">
              <input type="month" id="salaryMonthFilter" class="status-filter-select" style="min-width: 140px" onchange="if(typeof AdminSalary !== 'undefined') AdminSalary.renderTable();" />
              <input type="text" id="salarySearch" placeholder="Tìm CCCD, Họ tên, Khu vực..." class="status-filter-select" style="min-width: 180px; flex: 1" oninput="if(typeof AdminSalary !== 'undefined') AdminSalary.renderTable();" />
              <button class="btn btn-sm" id="salaryRefreshBtn" onclick="if(typeof AdminSalary !== 'undefined') AdminSalary.fetchData();" style="background: var(--surface); color: var(--text); border: 1px solid var(--border); padding: 8px 12px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path>
                  <path d="M21 3v5h-5"></path>
                </svg>
              </button>
              <button class="btn btn-sm btn-outline" id="exportSalaryExcelBtn" onclick="if(typeof AdminSalary !== 'undefined') AdminSalary.exportToExcel();" style="color: #4CAF50; border-color: #4CAF50;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Xuất Excel
              </button>
            </div>
            
            <div style="display:flex; justify-content: space-between; margin-bottom:10px; font-size:14px;">
              <div>Tổng ca làm: <strong id="salaryTotalShifts" style="color:var(--autumn-amber)">0</strong></div>
              <div>Tổng lương: <strong id="salaryTotalAmount" style="color:#4CAF50">0 VNĐ</strong></div>
            </div>

            <div style="overflow-x: auto;">
                <table class="schedule-table" id="salaryTable">
                <thead id="salaryHead">
                    <tr>
                    <th>Ngày</th>
                    <th>CCCD</th>
                    <th>Họ Tên</th>
                    <th>Khu vực / Địa điểm</th>
                    <th>Tổng giờ</th>
                    <th>Ca Ngày / Đêm</th>
                    <th>Tổng Lương</th>
                    </tr>
                </thead>
                <tbody id="salaryBody">
                    <tr class="loading-row">
                    <td colspan="7">
                        <div class="loading-spinner">
                        <div class="spinner"></div>
                        <span>Đang tải bảng lương...</span>
                        </div>
                    </td>
                    </tr>
                </tbody>
                </table>
            </div>
          </div>
"""

# Insert table after bookingTableContainer
content = content.replace('<!-- Booking Table Container -->', table_container + '\n          <!-- Booking Table Container -->')

# Add the script tag for adminSalary.js
script_tag = '<script defer src="js/admin/adminSalary.js?v=1"></script>'
content = content.replace('<script defer="" src="js/admin/adminBooking.js', script_tag + '\n      <script defer="" src="js/admin/adminBooking.js')


with open("index.html", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated index.html")
