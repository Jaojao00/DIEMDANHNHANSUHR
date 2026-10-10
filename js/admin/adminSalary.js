window.AdminSalary = (function() {
    let salaryData = [];
    let isFetching = false;

    function init() {
        // Set default month to current month
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        document.getElementById('salaryMonthFilter').value = `${yyyy}-${mm}`;
        
        fetchData();
    }

    async function fetchData() {
        if (isFetching) return;
        isFetching = true;
        
        const tbody = document.getElementById('salaryBody');
        tbody.innerHTML = `
            <tr class="loading-row">
                <td colspan="7">
                    <div class="loading-spinner">
                    <div class="spinner"></div>
                    <span>Đang tải dữ liệu Bảng lương...</span>
                    </div>
                </td>
            </tr>
        `;
        document.getElementById('salaryTotalShifts').innerText = "0";
        document.getElementById('salaryTotalAmount').innerText = "0 VNĐ";

        try {
            const token = localStorage.getItem("adminToken");
            const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({
                    action: "get_salary_list",
                    adminToken: token,
                    shiftId: "dummy"
                })
            });
            const data = await res.json();
            if (data.success) {
                salaryData = data.salaries || [];
                renderTable();
            } else {
                Swal.fire("Lỗi", data.error || data.message || "Không thể tải dữ liệu", "error");
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red">Lỗi tải dữ liệu</td></tr>`;
            }
        } catch (error) {
            console.error(error);
            Swal.fire("Lỗi", "Không thể kết nối đến máy chủ", "error");
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red">Lỗi kết nối máy chủ</td></tr>`;
        } finally {
            isFetching = false;
        }
    }

    function renderTable() {
        const tbody = document.getElementById('salaryBody');
        const monthFilter = document.getElementById('salaryMonthFilter').value; // YYYY-MM
        const searchVal = (document.getElementById('salarySearch').value || "").toLowerCase().trim();

        if (salaryData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-secondary)">Không có dữ liệu</td></tr>`;
            return;
        }

        let filtered = salaryData.filter(row => {
            // Check month
            if (monthFilter) {
                const dateStr = row["Ngày chấm công"] || "";
                // dateStr usually is DD/MM/YYYY or similar. Let's extract MM and YYYY.
                const parts = dateStr.split('/');
                if (parts.length >= 3) {
                    const dMonth = parts[1].padStart(2, '0');
                    const dYear = parts[2].substring(0, 4);
                    const rowMonthStr = `${dYear}-${dMonth}`;
                    if (rowMonthStr !== monthFilter) return false;
                } else if (dateStr.indexOf(monthFilter) === -1) {
                    // Fallback
                    // Maybe date is YYYY-MM-DD
                    if (!dateStr.startsWith(monthFilter)) {
                        // Let's try rearranging
                        const [fYear, fMonth] = monthFilter.split('-');
                        if (dateStr.indexOf(`${fMonth}/${fYear}`) === -1) return false;
                    }
                }
            }

            // Check search
            if (searchVal) {
                const cccd = (row["CCCD"] || "").toLowerCase();
                const name = (row["Họ Tên"] || "").toLowerCase();
                const loc = (row["Khu vực"] || "").toLowerCase();
                const branch = (row["Địa điểm"] || "").toLowerCase();
                if (!cccd.includes(searchVal) && !name.includes(searchVal) && !loc.includes(searchVal) && !branch.includes(searchVal)) {
                    return false;
                }
            }
            return true;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-secondary)">Không tìm thấy kết quả phù hợp</td></tr>`;
            document.getElementById('salaryTotalShifts').innerText = "0";
            document.getElementById('salaryTotalAmount').innerText = "0 VNĐ";
            return;
        }

        let totalShifts = 0;
        let totalAmount = 0;
        let html = "";

        filtered.forEach(row => {
            totalShifts++;
            let luongRaw = (row["Lương theo ngày công"] || row[" Lương theo ngày công "] || "0").toString();
            // Remove non-numeric characters except maybe comma/dot if we want to handle decimals, but let's just strip everything not digit
            let luongNum = parseInt(luongRaw.replace(/[^0-9]/g, '')) || 0;
            totalAmount += luongNum;

            let date = row["Ngày chấm công"] || "-";
            let cccd = row["CCCD"] || "-";
            let name = row["Họ Tên"] || "-";
            let location = (row["Khu vực"] || "") + " - " + (row["Địa điểm"] || "");
            let hours = row["Tổng giờ"] || "-";
            let normal = row["Normal Day"] || "0";
            let night = row["Night Shift"] || "0";
            
            let formattedLuong = new Intl.NumberFormat('vi-VN').format(luongNum) + " VNĐ";

            html += `
                <tr>
                    <td>${date}</td>
                    <td>${cccd}</td>
                    <td><strong style="color:var(--text)">${name}</strong></td>
                    <td style="font-size:12px; color:var(--text-secondary)">${location}</td>
                    <td>${hours}h</td>
                    <td><span style="color:#4CAF50">${normal}h</span> / <span style="color:#9C27B0">${night}h</span></td>
                    <td style="color:var(--autumn-amber); font-weight:bold">${formattedLuong}</td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
        document.getElementById('salaryTotalShifts').innerText = new Intl.NumberFormat('vi-VN').format(totalShifts);
        document.getElementById('salaryTotalAmount').innerText = new Intl.NumberFormat('vi-VN').format(totalAmount) + " VNĐ";
    }

    function exportToExcel() {
        if (salaryData.length === 0) {
            Swal.fire("Thông báo", "Không có dữ liệu để xuất!", "info");
            return;
        }
        
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        let headers = ["Ngày", "CCCD", "Họ Tên", "Khu vực", "Địa điểm", "Tổng giờ", "Normal Day", "Night Shift", "Lương"];
        csvContent += headers.join(",") + "\n";
        
        // Use filtered data from table
        const tbody = document.getElementById('salaryBody');
        const rows = tbody.querySelectorAll('tr');
        if (rows.length === 0 || rows[0].classList.contains('loading-row') || rows[0].innerText.includes('Không')) {
             Swal.fire("Thông báo", "Không có dữ liệu trên bảng để xuất!", "info");
             return;
        }
        
        // Quick way: just map over the salaryData based on current filters, but we already have `salaryData` filtered inside `renderTable`.
        // To avoid duplicating filter logic, let's just parse the table DOM.
        Array.from(rows).forEach(tr => {
            let cols = tr.querySelectorAll('td');
            if (cols.length === 7) {
                let rDate = cols[0].innerText.replace(/,/g, '');
                let rCccd = cols[1].innerText.replace(/,/g, '');
                let rName = cols[2].innerText.replace(/,/g, '');
                let rLoc = cols[3].innerText.replace(/,/g, ' '); // Combined loc
                let rHours = cols[4].innerText.replace(/,/g, '');
                let rDayNight = cols[5].innerText.replace(/,/g, '');
                let rLuong = cols[6].innerText.replace(/,/g, '');
                
                let rowArray = [rDate, rCccd, rName, rLoc, "", rHours, rDayNight, "", rLuong];
                csvContent += rowArray.join(",") + "\n";
            }
        });

        var encodedUri = encodeURI(csvContent);
        var link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `BangLuong_${document.getElementById('salaryMonthFilter').value}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    return {
        init,
        fetchData,
        renderTable,
        exportToExcel
    };
})();
