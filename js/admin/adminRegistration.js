Object.assign(AdminApp, {

  renderRegistrationTable: (payload) => {
    AdminApp.currentRegPayload = payload;
    const dataList = payload.data || [];
    let dateHeaders = payload.headers || [];

    const tbody = document.getElementById("scheduleBody");
    const thead = document.getElementById("scheduleHead");
    if (!tbody) return;

    // Update counters
    const totalCount = dataList.length;
    const statTotal = document.getElementById("totalEmployees");
    const statPresent = document.getElementById("confirmedCount");
    const statAbsent = document.getElementById("pendingCount");
    const statOff = document.getElementById("xinOffCountTop");

    if (statTotal) statTotal.innerText = totalCount;
    if (statPresent) statPresent.innerText = "0";
    if (statAbsent) statAbsent.innerText = totalCount;
    if (statOff) statOff.innerText = "0";

    if (dataList.length === 0) {
      if (thead) {
        thead.innerHTML = `<tr><th>STT</th><th>Mã NV</th><th>Họ Tên</th><th>Thời gian gửi</th></tr>`;
      }
      tbody.innerHTML = `<tr><td colspan="4" class="text-center" style="padding:24px; color:var(--text-secondary)">Chưa có ai đăng ký ca này</td></tr>`;
      return;
    }

    // Fallback if API doesn't provide headers
    if (
      dateHeaders.length === 0 &&
      dataList[0].selections &&
      Array.isArray(dataList[0].selections)
    ) {
      dateHeaders = dataList[0].selections.map((s) => s.label);
    }

    // Đổi header cho chế độ Đăng Ký
    if (thead) {
      let html = `
        <tr>
          <th style="width: 40px; text-align: center;"><input type="checkbox" id="selectAllReg" style="cursor: pointer;"></th>
          <th>STT</th>
          <th>Mã NV</th>
          <th>Họ Tên</th>
          <th>Số ĐT</th>
          <th>Tên Ca</th>
      `;
      dateHeaders.forEach((date) => {
        const filterVal = AdminApp.regDateFilters?.[date] || "";
        html += `
          <th style="text-align:center; min-width: 100px;">
            <div style="margin-bottom: 4px;">${date}</div>
            <select class="reg-date-filter" data-date="${date}" style="font-size: 11px; padding: 2px 4px; width: 100%; border-radius: 4px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: black;">
              <option value="" style="color: black">Tất cả</option>
              <option value="WORK" style="color: black" ${filterVal === "WORK" ? "selected" : ""}>WORK</option>
              <option value="OFF" style="color: black" ${filterVal === "OFF" ? "selected" : ""}>OFF</option>
            </select>
          </th>
        `;
      });
      html += `<th>Thời gian gửi</th></tr>`;
      thead.innerHTML = html;

      // Add delete button if it doesn't exist in toolbar
      let toolbar = document.querySelector(".admin-toolbar");
      if (toolbar && !document.getElementById("btnDeleteSelectedReg")) {
        const btnHtml = `<button id="btnDeleteSelectedReg" class="btn" style="background:var(--danger); color:white; border:none; margin-left:10px; display:none; padding:8px 16px;">Xóa đã chọn</button>`;
        toolbar.insertAdjacentHTML("beforeend", btnHtml);

        document
          .getElementById("btnDeleteSelectedReg")
          .addEventListener("click", async () => {
            const checked = document.querySelectorAll(".reg-checkbox:checked");
            if (checked.length === 0) return;
            if (
              !confirm(
                `Bạn có chắc chắn muốn xóa ${checked.length} đăng ký đã chọn trên hệ thống (không ảnh hưởng Google Sheets)?`,
              )
            )
              return;

            try {
              const db = window.FirebaseDB?.db;
              if (db) {
                const { collection, query, where, getDocs, deleteDoc } =
                  window.FirebaseDB;
                const regRef = collection(db, "registrations");

                for (const cb of checked) {
                  const empId = cb.value;
                  const shiftId = cb.dataset.shift;
                  // Delete from Firebase
                  const q = query(
                    regRef,
                    where("empId", "==", empId),
                    where("shiftId", "==", shiftId),
                  );
                  const snap = await getDocs(q);
                  const deletePromises = snap.docs.map((doc) =>
                    deleteDoc(doc.ref),
                  );
                  await Promise.all(deletePromises);
                }
                Utils.showToast(
                  `Đã xóa thành công ${checked.length} bản ghi trên hệ thống.`,
                  "success",
                );
                AdminApp.loadData(); // Tải lại bảng
              } else {
                Utils.showToast(
                  "Không thể kết nối tới Firebase để xóa",
                  "error",
                );
              }
            } catch (e) {
              Utils.showToast("Lỗi khi xóa: " + e.message, "error");
            }
          });
      }

      // Handle Select All
      document
        .getElementById("selectAllReg")
        .addEventListener("change", (e) => {
          const cbs = document.querySelectorAll(".reg-checkbox");
          cbs.forEach((cb) => (cb.checked = e.target.checked));
          AdminApp.toggleDeleteBtn();
        });

      // Handle Date Filters
      document.querySelectorAll(".reg-date-filter").forEach((sel) => {
        sel.addEventListener("change", (e) => {
          if (!AdminApp.regDateFilters) AdminApp.regDateFilters = {};
          AdminApp.regDateFilters[e.target.dataset.date] = e.target.value;
          AdminApp.renderRegistrationTable(AdminApp.currentRegPayload);
        });
      });
    }

    tbody.innerHTML = "";

    // Filter data based on regDateFilters
    const filteredDataList = dataList.filter((r) => {
      let pass = true;
      if (!AdminApp.regDateFilters) return true;

      dateHeaders.forEach((date, i) => {
        const filterVal = AdminApp.regDateFilters[date];
        if (!filterVal) return; // if 'Tất cả' or no filter

        let choice = "";
        if (r.choices && Array.isArray(r.choices)) {
          choice = r.choices[i];
        } else if (r.selections && Array.isArray(r.selections)) {
          choice = r.selections[i]?.choice;
        }

        if (choice !== filterVal) pass = false;
      });
      return pass;
    });

    if (filteredDataList.length === 0 && dataList.length > 0) {
      tbody.innerHTML = `<tr><td colspan="${dateHeaders.length + 7}" class="text-center" style="padding:24px; color:var(--text-secondary)">Không có nhân sự nào khớp với bộ lọc</td></tr>`;
    }

    filteredDataList.forEach((r, idx) => {
      let isPending = false;
      let reqId = null;
      if (AdminApp.pendingChangeRequests) {
        const pReq = AdminApp.pendingChangeRequests.find(
          (pr) =>
            pr.empId === r.empId &&
            (pr.shiftId === r.shiftId ||
              pr.shiftId === "CA_NGAY" ||
              pr.shiftId === State.selectedShiftId),
        );
        if (pReq) {
          isPending = true;
          reqId = pReq.id;
        }
      }

      let badgeHtml = isPending
        ? `<span style="margin-left:8px; padding:2px 6px; background:#43e97b; color:black; font-size:10px; border-radius:10px; font-weight:bold; cursor:pointer;" onclick="AdminApp.openApproveModal('${reqId}')">Chờ xét duyệt</span>`
        : "";

      const tr = document.createElement("tr");
      let html = `
        <td style="text-align:center"><input type="checkbox" class="reg-checkbox" value="${r.empId}" data-name="${escapeHTML(r.name || r.empName || '')}" data-shift="${r.shiftId || State.selectedShiftId}" style="cursor: pointer;"></td>
        <td style="text-align:center">${idx + 1}</td>
        <td><span class="emp-id-badge">${r.empId}</span></td>
        <td style="font-weight:600; color:var(--text-main); white-space:nowrap">${r.name || r.empName || ""} ${badgeHtml}</td>

        <td>${r.empPhone || r.phone || ""}</td>
        <td>${r.shiftLabel || State.shifts.find((s) => s.id === (r.shiftId || State.selectedShiftId))?.label || ""}</td>
      `;

      // Render selection cells (supporting both .choices and .selections API responses)
      if (r.choices && Array.isArray(r.choices)) {
        r.choices.forEach((choice) => {
          const isOff = choice === "OFF";
          const style = isOff
            ? "color:var(--danger); font-weight:bold;"
            : "color:var(--success); font-weight:600;";
          html += `<td style="text-align:center; ${style}">${choice || ""}</td>`;
        });
      } else if (r.selections && Array.isArray(r.selections)) {
        r.selections.forEach((sel) => {
          const isOff = sel.choice === "OFF";
          const style = isOff
            ? "color:var(--danger); font-weight:bold;"
            : "color:var(--success); font-weight:600;";
          html += `<td style="text-align:center; ${style}">${sel.choice || ""}</td>`;
        });
      } else {
        // If somehow no selections exist for this row, fill with empty cells
        dateHeaders.forEach(() => {
          html += `<td></td>`;
        });
      }

      // Add timestamp
      html += `
        <td style="color:var(--text-secondary); text-align:left;">
          <span style="display:inline-block; padding:2px 6px; background:rgba(255,255,255,0.1); border-radius:4px; font-size:11px;">${r.timestamp}</span>
        </td>
      `;

      tr.innerHTML = html;
      tbody.appendChild(tr);
    });

    // BÁO CÁO TỔNG NHÂN SỰ ĐI LÀM TRONG CA THEO TỪNG NGÀY
    if (filteredDataList.length > 0) {
      const summaryTr = document.createElement("tr");
      summaryTr.style.background = "rgba(255, 255, 255, 0.05)";

      let summaryHtml = `
        <td colspan="6" style="text-align: right; padding-right: 16px; font-weight: bold; color: var(--text-main);">TỔNG SỐ LƯỢNG (WORK):</td>
      `;

      dateHeaders.forEach((date, i) => {
        let workCount = 0;
        filteredDataList.forEach((r) => {
          let choice = "";
          if (r.choices && Array.isArray(r.choices)) {
            choice = r.choices[i];
          } else if (r.selections && Array.isArray(r.selections)) {
            choice = r.selections[i]?.choice;
          }
          if (choice === "WORK") workCount++;
        });
        summaryHtml += `<td style="text-align:center; color:var(--success); font-size: 16px; font-weight: bold;">${workCount}</td>`;
      });

      summaryHtml += `<td></td>`;
      summaryTr.innerHTML = summaryHtml;
      tbody.appendChild(summaryTr);
    }

    // Handle individual checkbox change
    document.querySelectorAll(".reg-checkbox").forEach((cb) => {
      cb.addEventListener("change", AdminApp.toggleDeleteBtn);
    });
  },

  toggleDeleteBtn: () => {
    const checkedBoxes = document.querySelectorAll(".reg-checkbox:checked");
    const checked = checkedBoxes.length;
    const btn = document.getElementById("btnDeleteSelectedReg");
    if (btn) {
      btn.style.display = checked > 0 ? "inline-block" : "none";
      btn.innerText = `Xóa đã chọn (${checked})`;
    }
    AdminApp.updateScheduleCopyButton();
  },

  resetRegistrations: async () => {
    if (
      !confirm(
        "Hành động này sẽ XÓA TOÀN BỘ các bảng lịch đăng ký hiện có trên Google Sheets của bạn. Bạn có chắc chắn muốn dọn dẹp để tạo kỳ đăng ký lịch mới không?",
      )
    )
      return;

    const btn = document.getElementById("btnResetRegistrations");
    if (btn)
      btn.innerHTML =
        '<span class="spinner" style="width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;display:inline-block;animation:spin 1s linear infinite;"></span> Đang xóa...';

    try {
      const url = State.apiLink;
      if (!url)
        throw new Error(
          "Vui lòng thiết lập cấu hình CONFIG.API_URL trước khi xóa!",
        );

      const response = await fetch(url, {
        method: "POST",
        body: JSON.stringify({ action: "reset_registrations", adminToken: localStorage.getItem("agr_admin_token") }),
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      alert("Đã dọn dẹp thành công! " + (result.message || ""));
    } catch (err) {
      console.error(err);
      alert("Lỗi khi xóa lịch: " + err.message);
    } finally {
      if (btn)
        btn.innerHTML =
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Xóa toàn bộ đăng ký lịch cũ';
    }
  }
});
