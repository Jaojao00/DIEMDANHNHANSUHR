Object.assign(AdminApp, {

  renderShiftTabs: () => {
    const list = document.getElementById("shiftTabsList");
    if (!list) return;
    list.innerHTML = State.shifts
      .map(
        (s) => `
      <div class="shift-tab ${s.id === State.selectedShiftId ? "active" : ""}" 
           data-shift="${s.id}" style="--tab-color:${s.color}">
        <span class="shift-tab-icon">${s.icon}</span>
        <div class="shift-tab-info">
          <span class="shift-tab-time">${s.id}</span>
          <span class="shift-tab-label">${s.label}</span>
        </div>
      </div>
    `,
      )
      .join("");

    // Bind event
    list.querySelectorAll(".shift-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        State.selectedShiftId = tab.dataset.shift;
        AdminApp.renderShiftTabs(); // Re-render to update active class
        if (AdminApp.currentViewMode === "booking") {
          const shiftFilter = document.getElementById("bookingShiftFilter");
          if (shiftFilter) shiftFilter.value = State.selectedShiftId;
          AdminApp.loadBookingData();
        } else {
          AdminApp.loadData();
        }
      });
    });
  },

  renderTable: () => {
    const tbody = document.getElementById("scheduleBody");
    if (!tbody) return;
    const shift = State.shifts.find((s) => s.id === State.selectedShiftId);
    const colCount = shift ? shift.colHeaders.length + 7 : 11;

    tbody.innerHTML = "";

    // Check view mode
    if (AdminApp.currentViewMode === "registration") {
      AdminApp.renderRegistrationTable([]); // Should not reach here normally, but just in case
      return;
    }

    if (!State.scheduleData || State.scheduleData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${colCount}" style="text-align:center;padding:20px;color:var(--text-muted)">Không có dữ liệu lịch ca này. Vui lòng thêm bằng tính năng Quản lý.</td></tr>`;
      return;
    }

    // Lấy danh sách ID đã xin nghỉ/lên ca từ localStorage
    let requests = [];
    try {
      const stored = localStorage.getItem("agr_requests");
      if (stored) requests = JSON.parse(stored);

      const scheduleDate = localStorage.getItem("agr_schedule_date");
      if (scheduleDate) {
        requests = requests.filter((r) => {
          if (!r || !r.date) return false;
          let rDateStr = r.date.toString();
          if (rDateStr.includes("T")) {
            const d = new Date(rDateStr);
            rDateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
          }
          return rDateStr === scheduleDate || rDateStr.startsWith(scheduleDate);
        });
      }
    } catch (e) {
      console.error("Lỗi đọc dự án:", e);
    }
    const offIds = new Set(
      (requests || [])
        .filter((r) => r && r.type === "XIN OFF" && r.empId)
        .map((r) => r.empId.toLowerCase().trim()),
    );
    const extraIds = new Set(
      (requests || [])
        .filter((r) => r && r.type === "XIN LÊN CA" && r.empId)
        .map((r) => r.empId.toLowerCase().trim()),
    );

    const timeStatus = Utils.isWithinTimeWindow(State.selectedShiftId);
    const isTimeOver = timeStatus.isOver;

    tbody.innerHTML = State.scheduleData
      .map((emp) => {
        const empIdLower = (emp.id || "").toLowerCase().trim();
        const isOff = offIds.has(empIdLower) || emp.status === "xin off";
        const isExtra = extraIds.has(empIdLower);
        const isAutoOff =
          !isOff && !isExtra && emp.status !== "confirmed" && isTimeOver;

        let rowClass = isOff
          ? "xin-off-row"
          : emp.status === "confirmed"
            ? "attended"
            : "";
        if (isAutoOff) rowClass = "auto-off-row";

        let confirmCell = "";
        const onclickAttr = `onclick="AdminApp.changeConfirmStatus('${escapeHTML(emp.id)}', '${emp.status || ''}')" style="cursor: pointer;"`;
        
        if (isOff) {
          confirmCell = `<span class="xin-off-badge" ${onclickAttr}>📋 Xin Off</span>`;
        } else if (isAutoOff) {
          confirmCell = `<span class="auto-off-badge" ${onclickAttr}>OFF CHƯA ĐIỂM DANH</span>`;
        } else if (isExtra || emp.status === "xin lên ca") {
          confirmCell = `<span class="xin-len-ca-badge" ${onclickAttr}>⬆️ Xin Lên Ca</span>`;
        } else if (emp.status === "confirmed") {
          confirmCell = `<div class="confirm-badge confirmed" title="Đã điểm danh lúc ${emp.timestamp || ''}" ${onclickAttr}>✓</div>`;
        } else {
          confirmCell = `<div class="confirm-badge pending" ${onclickAttr}></div>`;
        }

        const posCells = shift
          ? shift.colHeaders
              .map((_, idx) => {
                const p = emp.positions ? emp.positions[idx] : "";
                return `<td><span class="position-tag ${!p ? "empty" : ""}" style="cursor: pointer;" onclick="AdminCore.editPosition('${emp.id}', ${idx}, '${p || ""}')" title="Nhấn để cập nhật Vị trí làm việc">${p || "Chưa xếp"}</span></td>`;
              })
              .join("")
          : "";

        return `
      <tr class="${rowClass}">
        <td style="text-align:center">
          <input type="checkbox" class="schedule-checkbox" value="${escapeHTML(emp.id)}" data-name="${escapeHTML(emp.name)}" onchange="AdminApp.updateScheduleCopyButton()" style="cursor: pointer; width: 16px; height: 16px;">
        </td>
        <td>${emp.stt}</td>
        <td><span class="employee-code">${escapeHTML(emp.id)}</span></td>
        <td style="font-weight:500">${escapeHTML(emp.name)}</td>
        <td><span class="dinhDanh-badge">${emp.dinhDanh || ""}</span></td>
        ${posCells}
        <td><span style="font-size:12px; color:var(--text-muted)">${emp.note || ""}</span></td>
        <td class="confirm-cell">${confirmCell}</td>
      </tr>`;
      })
      .join("");

    // Cập nhật header bảng theo ca hiện tại
    const thead = document.getElementById("scheduleHead");
    if (thead && shift) {
      const posHeaders = shift.colHeaders.map((h) => `<th>${h}</th>`).join("");
      thead.innerHTML = `<tr>
        <th style="width: 40px; text-align: center;"><input type="checkbox" id="selectAllSchedule" onchange="toggleSelectAllSchedule(this)" style="cursor: pointer; width: 16px; height: 16px;"></th>
        <th>STT</th>
        <th>Mã CTV</th>
        <th>Họ tên</th>
        <th>Định danh</th>
        ${posHeaders}
        <th>Note</th>
        <th>Xác nhận</th>
      </tr>`;
    }

    // Reset copy state
    AdminApp.updateScheduleCopyButton();

    // Áp dụng bộ lọc và tìm kiếm hiện tại
    AdminApp.filterScheduleTable();
  },

  filterScheduleTable: () => {
    const searchInput =
      document.getElementById("adminQuerySearch") ||
      document.getElementById("searchInput");
    if (!searchInput) return;
    let searchVal = searchInput.value.trim();
    const lowerVal = searchVal.toLowerCase();

    // Tự động dọn dẹp các từ khóa tiêu đề do browser autofill nhầm
    if (
      lowerVal === "hệ thống điểm danh" ||
      lowerVal === "hệ thống" ||
      lowerVal === "hệ thống điểm danh quản trị" ||
      lowerVal === "agr điểm danh" ||
      lowerVal === "agr | điểm danh"
    ) {
      searchInput.value = "";
      searchVal = "";
    }

    const searchValLower = searchVal.toLowerCase();
    const filterEl = document.getElementById("statusFilter");
    const filterVal = filterEl ? filterEl.value : "all";

    document.querySelectorAll("#scheduleBody tr").forEach((row) => {
      if (row.classList.contains("loading-row") || row.cells.length <= 1)
        return;

      const text = row.textContent.toLowerCase();
      const matchesSearch = text.includes(searchValLower);

      let matchesFilter = true;
      if (filterVal !== "all") {
        if (filterVal === "confirmed") {
          matchesFilter = row.classList.contains("attended");
        } else if (filterVal === "pending") {
          matchesFilter =
            !row.classList.contains("attended") &&
            !row.classList.contains("xin-off-row") &&
            !row.querySelector(".xin-len-ca-badge");
        } else if (filterVal === "xin-off") {
          matchesFilter =
            row.classList.contains("xin-off-row") ||
            row.querySelector(".xin-off-badge") !== null;
        } else if (filterVal === "xin-len-ca") {
          matchesFilter = row.querySelector(".xin-len-ca-badge") !== null;
        }
      }

      if (matchesSearch && matchesFilter) {
        row.classList.remove("hidden");
      } else {
        row.classList.add("hidden");
      }
    });
  },

  renderStats: () => {
    let requests = [];
    try {
      const stored = localStorage.getItem("agr_requests");
      if (stored) requests = JSON.parse(stored);

      const scheduleDate = localStorage.getItem("agr_schedule_date");
      if (scheduleDate) {
        requests = requests.filter((r) => {
          if (!r || !r.date) return false;
          let rDateStr = r.date.toString();
          if (rDateStr.includes("T")) {
            const d = new Date(rDateStr);
            rDateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
          }
          return rDateStr === scheduleDate || rDateStr.startsWith(scheduleDate);
        });
      }
    } catch (e) {}
    const offIds = new Set(
      (requests || [])
        .filter((r) => r && r.type === "XIN OFF" && r.empId)
        .map((r) => r.empId.toLowerCase().trim()),
    );
    const extraIds = new Set(
      (requests || [])
        .filter((r) => r && r.type === "XIN LÊN CA" && r.empId)
        .map((r) => r.empId.toLowerCase().trim()),
    );

    const timeStatus = Utils.isWithinTimeWindow(State.selectedShiftId);
    const isTimeOver = timeStatus.isOver;

    const total = State.scheduleData.length;
    const confirmed = State.scheduleData.filter(
      (e) => e.status === "confirmed",
    ).length;

    let explicitXinOffCount = 0;
    let autoOffCount = 0;

    State.scheduleData.forEach((e) => {
      const idLower = (e.id || "").toLowerCase().trim();
      const isOff = offIds.has(idLower) || e.status === "xin off";
      const isExtra = extraIds.has(idLower);
      if (isOff) {
        explicitXinOffCount++;
      } else if (isTimeOver && !isExtra && e.status !== "confirmed") {
        autoOffCount++;
      }
    });

    const xinOffCount = explicitXinOffCount + autoOffCount;

    const effectiveTotal = Math.max(0, total - xinOffCount);

    const totalEl = document.getElementById("totalEmployees");
    const confirmedEl = document.getElementById("confirmedCount");
    const pendingEl = document.getElementById("pendingCount");
    const xinOffElTop = document.getElementById("xinOffCountTop");

    const adminDone = document.getElementById("adminDone");
    const adminTotal = document.getElementById("adminTotal");
    const adminBar = document.getElementById("adminBar");

    if (totalEl) totalEl.textContent = effectiveTotal;
    if (confirmedEl) confirmedEl.textContent = confirmed;
    if (pendingEl)
      pendingEl.textContent = Math.max(0, effectiveTotal - confirmed);
    if (xinOffElTop) xinOffElTop.textContent = xinOffCount;

    if (adminDone) adminDone.textContent = confirmed;
    if (adminTotal) adminTotal.textContent = effectiveTotal;
    if (adminBar) {
      const pct = effectiveTotal === 0 ? 0 : (confirmed / effectiveTotal) * 100;
      adminBar.style.width = `${pct}%`;
    }
  }
});
