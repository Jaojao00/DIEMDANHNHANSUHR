Object.assign(AdminApp, {

  openLogModal: async () => {
    const btn = document.getElementById("adminLogBtn");
    if (btn) btn.classList.add("loading");
    
    document.getElementById("adminLogModal").classList.remove("hidden");
    
    try {
      const token = localStorage.getItem("agr_admin_token");
      if (!token) throw new Error("Chưa xác thực Admin");
      
      const res = await fetch(CONFIG.API_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "get_admin_logs",
          adminToken: token
        })
      });
      const result = await res.json();
      
      if (result.status === "success") {
        AdminApp.renderAdminLogs(result.data || []);
      } else {
        Utils.showToast(result.error || result.message, "error");
      }
    } catch (e) {
      Utils.showToast("Lỗi tải lịch sử: " + e.message, "error");
    } finally {
      if (btn) btn.classList.remove("loading");
    }
  },

  closeLogModal: () => {
    document.getElementById("adminLogModal").classList.add("hidden");
  },

  renderAdminLogs: (logs) => {
    const tbody = document.getElementById("adminLogTableBody");
    if (!tbody) return;
    
    if (logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-muted)">Chưa có lịch sử chỉnh sửa nào.</td></tr>`;
      return;
    }
    
    tbody.innerHTML = logs.map(log => {
      const dt = new Date(log.timestamp);
      const formattedDate = dt.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
      
      return `
        <tr>
          <td><div class="emp-id-badge" style="background:var(--bg-elevated);color:var(--text-main)">${formattedDate}</div></td>
          <td><b>${log.sheetName}</b></td>
          <td><span style="color:var(--primary);font-weight:bold">${log.cell}</span></td>
          <td><span style="color:var(--text-muted);text-decoration:line-through">${log.oldVal}</span></td>
          <td><span style="color:#43e97b;font-weight:600">${log.newVal}</span></td>
          <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${log.user}">${log.user}</td>
        </tr>
      `;
    }).join("");
  },

  renderLogs: () => {
    const logList = document.getElementById("logList");
    if (!logList) return;
    const confirmed = State.scheduleData
      .filter((e) => e.status === "confirmed")
      .sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || "")); // Xếp mới nhất lên trên

    if (confirmed.length === 0) {
      logList.innerHTML = `<div class="log-empty">Chưa có ai điểm danh</div>`;
      return;
    }

    logList.innerHTML = confirmed
      .map((emp) => {
        const initial = (emp.name || "").trim().charAt(0) || "?";
        return `
      <div class="log-item">
        <div class="log-avatar">${initial}</div>
        <div class="log-info">
          <div class="log-name">${emp.name || ""}</div>
          <div class="log-code">${emp.id || ""}</div>
        </div>
        <div class="log-time">${emp.timestamp || "--:--"}</div>
      </div>`;
      })
      .join("");
  }
});
