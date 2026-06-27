import os
import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Booking button
old_toggle = """<div class="admin-view-toggle" style="margin-left: 24px; display: flex; gap: 8px; background: var(--bg-card); padding: 4px; border-radius: 8px; border: 1px solid var(--border);">
          <button class="btn btn-sm" id="viewModeFinal" style="background: var(--primary); color: white; border: none; font-size: 13px;">Đã Chốt</button>
          <button class="btn btn-sm btn-ghost" id="viewModeReg" style="color: var(--text-secondary); border: none; font-size: 13px;">Đăng Ký</button>
        </div>"""

new_toggle = """<div class="admin-view-toggle" style="margin-left: 24px; display: flex; gap: 8px; background: var(--bg-card); padding: 4px; border-radius: 8px; border: 1px solid var(--border);">
          <button class="btn btn-sm" id="viewModeFinal" style="background: var(--primary); color: white; border: none; font-size: 13px;">Đã Chốt</button>
          <button class="btn btn-sm btn-ghost" id="viewModeReg" style="color: var(--text-secondary); border: none; font-size: 13px;">Đăng Ký</button>
          <button class="btn btn-sm btn-ghost" id="viewModeBooking" style="color: var(--text-secondary); border: none; font-size: 13px;">Booking</button>
        </div>"""

if old_toggle in content:
    content = content.replace(old_toggle, new_toggle)
else:
    print("WARNING: Could not find old_toggle")


# 2. Add ID to scheduleTable container and append Booking container
old_table_container = """      <!-- Table -->
      <div class="table-container">
        <table class="schedule-table" id="scheduleTable">"""

new_table_container = """      <!-- Table -->
      <div class="table-container" id="scheduleTableContainer">
        <table class="schedule-table" id="scheduleTable">"""

if old_table_container in content:
    content = content.replace(old_table_container, new_table_container)
else:
    print("WARNING: Could not find old_table_container")


old_table_end = """          </tbody>
        </table>
      </div>
    </section>"""

new_table_end = """          </tbody>
        </table>
      </div>
      
      <!-- Booking Table Container -->
      <div class="table-container" id="bookingTableContainer" style="display: none;">
        <div style="display: flex; gap: 8px; margin-bottom: 12px; padding: 10px; background: rgba(255,255,255,0.03); border-radius: 8px; flex-wrap: wrap; align-items: center;">
          <input type="date" id="bookingDateFilter" class="status-filter-select" style="min-width: 140px;" onchange="if(typeof App!=='undefined') App.renderBookingTable();">
          <select id="bookingShiftFilter" class="status-filter-select" onchange="if(typeof App!=='undefined') App.renderBookingTable();">
            <option value="">Tất cả Ca</option>
            <option value="22:00-06:00">22:00-06:00</option>
            <option value="06:00-15:00">06:00-15:00</option>
            <option value="06:00-10:00">06:00-10:00</option>
            <option value="15:00-22:00">15:00-22:00</option>
            <option value="18:00-22:00">18:00-22:00</option>
            <option value="07:00-16:00">07:00-16:00</option>
            <option value="09:00-18:00">09:00-18:00</option>
          </select>
          <select id="bookingVendorFilter" class="status-filter-select" onchange="if(typeof App!=='undefined') App.renderBookingTable();">
            <option value="">Tất cả Vendor</option>
            <option value="AGR">AGR</option>
          </select>
          <input type="text" id="bookingSearch" placeholder="Tìm Ticket, Bộ phận, SOC..." class="status-filter-select" style="min-width: 180px; flex: 1;" oninput="if(typeof App!=='undefined') App.renderBookingTable();">
          <button class="btn btn-sm" id="bookingRefreshBtn" style="background: var(--surface); color: var(--text); border: 1px solid var(--border); padding: 8px 12px; border-radius: 6px; cursor: pointer;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;">
              <path d="M23 4v6h-6M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </button>
        </div>
        <table class="schedule-table" id="bookingTable">
          <thead id="bookingHead">
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
          </thead>
          <tbody id="bookingBody">
             <tr class="loading-row"><td colspan="11"><div class="loading-spinner"><div class="spinner"></div><span>Đang lấy dữ liệu Booking...</span></div></td></tr>
          </tbody>
        </table>
      </div>
    </section>"""

if old_table_end in content:
    content = content.replace(old_table_end, new_table_end)
else:
    print("WARNING: Could not find old_table_end")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("index.html updated successfully!")
