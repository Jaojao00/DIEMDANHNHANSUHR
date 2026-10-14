/**
 * BỘ HÀM NGHIỆP VỤ XỬ LÝ GOOGLE SHEETS & GOOGLE DRIVE (HANDLERS)
 */

// ================= 1. ĐIỂM DANH (CHECKIN) =================
function handleCheckin(data) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // LockService chống xung đột khi hàng trăm người bấm cùng lúc
  } catch (e) {
    return sendErrorResponse('Hệ thống đang quá tải, vui lòng thử lại sau giây lát.');
  }

  try {
    var identifier = sanitizeEmployeeId(data.identifier);
    var shift = data.shift || '18:00-22:00';
    var sheetName = CONFIG.SHEETS.CA_PREFIX + shift;
    var sheet = getOrCreateSheet(sheetName);

    var rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) {
      return sendErrorResponse('Danh sách ca làm hôm nay chưa được khởi tạo.');
    }

    // Cấu trúc cột giả định: STT, Mã NV, Họ Tên, Định Danh, [Vị trí 1], [Vị trí 2], Ghi Chú, Trạng Thái, Thời Gian, SĐT, CCCD
    var foundIndex = -1;
    var empData = null;

    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      var empId = sanitizeEmployeeId(row[1]);
      var cccd = sanitizeEmployeeId(row[10] || '');
      var phone = String(row[9] || '').trim();

      if (isCccdMatch(identifier, empId) || isCccdMatch(identifier, cccd) || phone === identifier) {
        foundIndex = i + 1; // 1-indexed trong Sheets
        empData = {
          stt: row[0],
          id: row[1],
          name: row[2],
          identity: row[3],
          positions: {
            '18H-20H': row[4] || 'Chưa xếp',
            '20H-22H': row[5] || 'Chưa xếp'
          },
          note: row[6],
          status: 'confirmed',
          checkinTime: formatVNTime(new Date())
        };
        break;
      }
    }

    if (foundIndex === -1) {
      return sendErrorResponse('Không tìm thấy nhân viên trong ca ' + shift + '. Hãy liên hệ Admin Zalo ca trực!');
    }

    // Cập nhật trạng thái và thời gian điểm danh
    sheet.getRange(foundIndex, 8).setValue('confirmed'); // Cột Trạng Thái
    sheet.getRange(foundIndex, 9).setValue(empData.checkinTime); // Cột Thời Gian

    return sendSuccessResponse(empData, 'Điểm danh thành công');
  } catch (err) {
    return sendErrorResponse('Lỗi điểm danh: ' + err.message);
  } finally {
    lock.releaseLock();
  }
}

// ================= 2. LƯU LỊCH VÀ PHÂN BỔ VỊ TRÍ (SAVE) =================
function handleSave(data) {
  var shift = data.shift || '18:00-22:00';
  var sheetName = CONFIG.SHEETS.CA_PREFIX + shift;
  var sheet = getOrCreateSheet(sheetName);
  var roster = data.roster || [];

  if (!roster.length) {
    return sendErrorResponse('Dữ liệu rỗng');
  }

  var header = ['STT', 'Mã NV', 'Họ Tên', 'Định Danh', '18H-20H', '20H-22H', 'Ghi Chú', 'Trạng Thái', 'Thời Gian', 'SĐT', 'CCCD'];
  var rows = [header];

  roster.forEach(function(emp, index) {
    rows.push([
      index + 1,
      emp.id || '',
      emp.name || '',
      emp.identity || 'CTV',
      emp.positions ? (emp.positions['18H-20H'] || '') : '',
      emp.positions ? (emp.positions['20H-22H'] || '') : '',
      emp.note || '',
      emp.status || 'pending',
      emp.checkinTime || '',
      emp.phone || '',
      emp.cccd || ''
    ]);
  });

  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, header.length).setValues(rows);

  return sendSuccessResponse(null, 'Lưu bảng lịch thành công');
}

// ================= 3. ĐƠN XIN OFF & XIN LÊN CA =================
function handleRequest(data) {
  var sheet = getOrCreateSheet(CONFIG.SHEETS.XIN_OFF);
  var timestamp = formatVNTime(new Date());
  var type = data.type || 'XIN_OFF';

  sheet.appendRow([
    timestamp,
    data.empId,
    data.empName,
    data.phone,
    type,
    data.reason || data.note || '',
    data.date || '',
    data.shift || '',
    data.targetShift || ''
  ]);

  // Nếu là xin lên ca, chèn dòng mới vào ca với trạng thái pending và định danh A-OS
  if (type === 'XIN_LEN_CA') {
    var caSheet = getOrCreateSheet(CONFIG.SHEETS.CA_PREFIX + (data.targetShift || data.shift));
    var lastRow = caSheet.getLastRow();
    caSheet.appendRow([
      lastRow,
      data.empId,
      data.empName,
      'A-OS',
      'Chưa xếp',
      'Chưa xếp',
      'Đăng ký thế ca/bù',
      'pending',
      '',
      data.phone,
      ''
    ]);
  }

  return sendSuccessResponse(null, 'Đã lưu đơn thành công');
}

// ================= 4. KHIẾU NẠI & TẢI ẢNH GOOGLE DRIVE =================
function handleSubmitComplaint(data) {
  var folderId = data.driveFolderId || CONFIG.GDRIVE_FOLDER_ID;
  var imageUrl = '';

  if (data.imageBase64) {
    try {
      var folder = DriveApp.getFolderById(folderId);
      var base64Data = data.imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
      var decodedBytes = Utilities.base64Decode(base64Data);
      var blob = Utilities.newBlob(decodedBytes, "image/jpeg", "KhieuNai_" + data.empId + "_" + new Date().getTime() + ".jpg");
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      imageUrl = file.getUrl();
    } catch (e) {
      imageUrl = 'Lỗi lưu ảnh: ' + e.message;
    }
  }

  var sheet = getOrCreateSheet(CONFIG.SHEETS.KHIEU_NAI);
  sheet.appendRow([
    formatVNTime(new Date()),
    data.empId,
    data.empName,
    data.phone,
    data.complaintType || 'Sai công/lương',
    data.content,
    imageUrl,
    'Chờ xử lý'
  ]);

  return sendSuccessResponse({ imageUrl: imageUrl }, 'Đã gửi khiếu nại thành công');
}

// ================= 5. YÊU CẦU CẤP ĐỔI ÁO THẺ & DƯ VÉ =================
function handleRequestItem(data) {
  var sheet = getOrCreateSheet(CONFIG.SHEETS.CAP_DOI_AO_THE);
  sheet.appendRow([
    formatVNTime(new Date()),
    data.itemType,
    data.empId,
    data.empName,
    data.shift,
    'CTV',
    data.quantity || 1,
    data.pickupDate,
    0,
    data.reason
  ]);
  return sendSuccessResponse(null, 'Tiếp nhận yêu cầu trang thiết bị thành công');
}

// ================= 6. TRA CỨU BẢNG LƯƠNG CÁ NHÂN =================
function handleLookupSalary(data) {
  var identifier = sanitizeEmployeeId(data.identifier);
  var sheet = getOrCreateSheet(CONFIG.SHEETS.BANG_LUONG);
  var rows = sheet.getDataRange().getValues();

  if (rows.length <= 1) {
    return sendErrorResponse('Bảng lương chưa có dữ liệu');
  }

  var matched = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    var cccd = sanitizeEmployeeId(r[1]);
    var empId = sanitizeEmployeeId(r[3]);

    if (isCccdMatch(identifier, cccd) || isCccdMatch(identifier, empId)) {
      matched.push({
        project: r[0],
        cccd: r[1],
        name: r[2],
        empId: r[3],
        area: r[4],
        location: r[5],
        position: r[6],
        date: r[7],
        dayOfWeek: r[8],
        timeInOut: r[9],
        totalHours: r[10],
        shiftType: r[11],
        salary: r[12]
      });
    }
  }

  if (!matched.length) {
    return sendErrorResponse('Không tìm thấy thông tin lương cho mã này');
  }

  return sendSuccessResponse(matched);
}

// ================= 7. ADMIN TẢI TOÀN BỘ BẢNG LƯƠNG =================
function handleGetSalaryList(data) {
  var sheet = getOrCreateSheet(CONFIG.SHEETS.BANG_LUONG);
  var rows = sheet.getDataRange().getValues();

  var result = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    result.push({
      project: r[0],
      cccd: r[1],
      name: r[2],
      empId: r[3],
      area: r[4],
      location: r[5],
      position: r[6],
      date: r[7],
      dayOfWeek: r[8],
      timeInOut: r[9],
      totalHours: r[10],
      shiftType: r[11],
      salary: r[12]
    });
  }

  return sendSuccessResponse(result);
}

// ================= 8. ADMIN TẢI DỮ LIỆU BOOKING SOC SOUTH =================
function handleGetBooking() {
  var sheet = getOrCreateSheet(CONFIG.SHEETS.SOC_SOUTH);
  var rows = sheet.getDataRange().getValues();
  var result = [];

  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    result.push({
      commit: r[0],
      ticket: r[1],
      fulfillDate: r[2],
      region: r[3],
      department: r[4],
      socName: r[5],
      area: r[6],
      shift: r[7],
      vendor: r[8],
      totalReq: r[9],
      totalKpi: r[10],
      vendorCommit: r[11]
    });
  }

  return sendSuccessResponse(result);
}

// ================= 9. ĐĂNG KÝ LỊCH VÀ XIN SỬA LỊCH =================
function handleSubmitRegistration(data) {
  var sheet = getOrCreateSheet(CONFIG.SHEETS.REGISTRATIONS_PREFIX + (data.shift || 'Default'));
  sheet.appendRow([
    formatVNTime(new Date()),
    data.empId,
    data.empName,
    data.phone,
    'CTV',
    data.shift,
    data.selections
  ]);
  return sendSuccessResponse(null, 'Đăng ký ca làm thành công');
}

function handleSubmitChangeRequest(data) {
  var sheet = getOrCreateSheet(CONFIG.SHEETS.CHANGE_REQUESTS);
  sheet.appendRow([
    data.requestId,
    data.empId,
    data.empName,
    data.shiftId,
    data.selections,
    'pending',
    formatVNTime(new Date())
  ]);
  return sendSuccessResponse(null, 'Đã gửi yêu cầu đổi lịch');
}

function handleGetChangeRequests() {
  var sheet = getOrCreateSheet(CONFIG.SHEETS.CHANGE_REQUESTS);
  var rows = sheet.getDataRange().getValues();
  var result = [];

  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    result.push({
      id: r[0],
      empId: r[1],
      empName: r[2],
      shiftId: r[3],
      selections: r[4],
      status: r[5],
      timestamp: r[6]
    });
  }

  return sendSuccessResponse(result);
}

function handleApproveChangeRequest(data) {
  var sheet = getOrCreateSheet(CONFIG.SHEETS.CHANGE_REQUESTS);
  var rows = sheet.getDataRange().getValues();

  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.requestId) {
      sheet.getRange(i + 1, 6).setValue('approved');
      return sendSuccessResponse(null, 'Đã duyệt yêu cầu đổi lịch');
    }
  }
  return sendErrorResponse('Không tìm thấy yêu cầu');
}

function handleRejectChangeRequest(data) {
  var sheet = getOrCreateSheet(CONFIG.SHEETS.CHANGE_REQUESTS);
  var rows = sheet.getDataRange().getValues();

  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.requestId) {
      sheet.getRange(i + 1, 6).setValue('rejected');
      return sendSuccessResponse(null, 'Đã từ chối yêu cầu đổi lịch');
    }
  }
  return sendErrorResponse('Không tìm thấy yêu cầu');
}
