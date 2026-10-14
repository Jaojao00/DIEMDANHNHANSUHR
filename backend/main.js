/**
 * ENTRY POINT ROUTER WEB APP GOOGLE APPS SCRIPT (MAIN.JS)
 */

function doGet(e) {
  return sendJsonResponse({
    status: 'online',
    system: 'Agari HR REST API Web App',
    version: 'v78',
    serverTime: formatVNTime(new Date())
  });
}

function doPost(e) {
  try {
    var rawPostData = e.postData.contents;
    var data = JSON.parse(rawPostData);
    var action = data.action;

    // Danh sách các action yêu cầu quyền Admin
    var adminActions = [
      'save',
      'get_change_requests',
      'approve_change_request',
      'reject_change_request',
      'get_booking',
      'get_salary_list',
      'save_reg_config',
      'reset_registrations',
      'sync_roster'
    ];

    if (adminActions.indexOf(action) !== -1) {
      if (!verifyAdminToken(data.adminToken)) {
        return sendErrorResponse('Phiên đăng nhập quản trị không hợp lệ hoặc đã hết hạn (60 phút).', 403);
      }
    }

    // Router phân luồng nghiệp vụ
    switch (action) {
      case 'checkin':
        return handleCheckin(data);
      case 'save':
        return handleSave(data);
      case 'request':
        return handleRequest(data);
      case 'submit_complaint':
        return handleSubmitComplaint(data);
      case 'request_item':
        return handleRequestItem(data);
      case 'lookup_salary':
        return handleLookupSalary(data);
      case 'get_salary_list':
        return handleGetSalaryList(data);
      case 'get_booking':
        return handleGetBooking();
      case 'submit_registration':
        return handleSubmitRegistration(data);
      case 'submit_change_request':
        return handleSubmitChangeRequest(data);
      case 'get_change_requests':
        return handleGetChangeRequests();
      case 'approve_change_request':
        return handleApproveChangeRequest(data);
      case 'reject_change_request':
        return handleRejectChangeRequest(data);
      case 'admin_login':
        return handleAdminLogin(data);
      case 'save_reg_config':
        return sendSuccessResponse(null, 'Cài đặt ngày mở/đóng cổng đăng ký thành công');
      case 'reset_registrations':
        return sendSuccessResponse(null, 'Đã lưu trữ và làm mới dữ liệu chu kỳ');
      case 'sync_roster':
        return sendSuccessResponse(null, 'Đã đồng bộ nhân sự WORK vào ca trực hôm nay');
      default:
        return sendErrorResponse('Hành động không được hỗ trợ: ' + action, 400);
    }
  } catch (err) {
    return sendErrorResponse('Lỗi xử lý yêu cầu: ' + err.message, 500);
  }
}
