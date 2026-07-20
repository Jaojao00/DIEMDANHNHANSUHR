const fs = require('fs');
let content = fs.readFileSync('js/admin/adminCore.js', 'utf8');

const newFunctions = `

Object.assign(AdminApp, {
  promptAddPersonnel: async () => {
    if (!State.selectedShiftId) {
      Swal.fire("Lỗi", "Vui lòng chọn một ca trước khi thêm nhân sự.", "error");
      return;
    }
    const { value: formValues } = await Swal.fire({
      title: "Thêm Nhân Sự",
      html:
        '<input id="swal-input1" class="swal2-input" placeholder="Mã Nhân Viên">' +
        '<input id="swal-input2" class="swal2-input" placeholder="Họ Tên">',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Xác nhận",
      cancelButtonText: "Hủy",
      preConfirm: () => {
        return [
          document.getElementById('swal-input1').value,
          document.getElementById('swal-input2').value
        ];
      }
    });

    if (formValues) {
      const empId = formValues[0].trim();
      const empName = formValues[1].trim();
      
      if (!empId || !empName) {
        Swal.fire("Lỗi", "Vui lòng nhập đầy đủ Mã NV và Họ Tên", "error");
        return;
      }
      
      const shift = AdminApp.getShiftDetails(State.selectedShiftId);
      const posCount = shift ? shift.colHeaders.length : 4;
      
      const newEmp = {
        stt: State.scheduleData.length + 1,
        id: empId,
        name: empName,
        dinhDanh: "",
        positions: Array(posCount).fill("Chưa xếp"),
        note: "Thêm thủ công",
        status: "pending"
      };
      
      State.scheduleData.push(newEmp);
      AdminUI.renderSchedule();
      AdminApp.saveScheduleData(); // Auto save to backend
      Swal.fire("Thành công", "Đã thêm nhân sự và lưu vào hệ thống.", "success");
    }
  },

  changeConfirmStatus: async (empId, currentStatus) => {
    // Current status map for UI default selection
    let defaultStatus = currentStatus;
    if (currentStatus === "xin off") defaultStatus = "xin off";
    else if (currentStatus === "confirmed") defaultStatus = "confirmed";
    else defaultStatus = "pending";

    const { value: newStatus } = await Swal.fire({
      title: 'Cập Nhật Trạng Thái',
      input: 'select',
      inputOptions: {
        'pending': 'Chưa Điểm Danh',
        'confirmed': 'Đã Điểm Danh',
        'xin off': 'Xin Off',
        'xin lên ca': 'Xin Lên Ca'
      },
      inputPlaceholder: 'Chọn trạng thái...',
      inputValue: defaultStatus,
      showCancelButton: true,
      confirmButtonText: "Cập nhật",
      cancelButtonText: "Hủy"
    });

    if (newStatus) {
      const emp = State.scheduleData.find(e => e.id.toLowerCase() === empId.toLowerCase());
      if (emp) {
        // Handle xin lên ca specifically since it relies on extraIds normally,
        // but since we want to overwrite it, we can just save it into emp.status
        emp.status = newStatus;
        if (newStatus === 'confirmed' && !emp.timestamp) {
           emp.timestamp = new Date().toLocaleTimeString();
        }
        AdminUI.renderSchedule();
        AdminApp.saveScheduleData();
      }
    }
  }
});
`;

content = content + newFunctions;
fs.writeFileSync('js/admin/adminCore.js', content);
