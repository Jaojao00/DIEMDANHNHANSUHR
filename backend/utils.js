
function sendJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function sanitizeEmployeeId(empId) {
  if (!empId) return "";
  var cleanId = empId.toString().trim().toLowerCase();
  if (!/^[a-z0-9-_]*$/.test(cleanId)) throw new Error("Mã nhân viên chứa ký tự không hợp lệ");
  if (cleanId.length > 50) throw new Error("Mã nhân viên quá dài");
  return cleanId;
}

function buildEmployeeIndex(values, idColIndex) {
  var index = {};
  for (var i = 1; i < values.length; i++) {
    var empId = (values[i][idColIndex] || "").toString().toLowerCase().trim();
    if (empId) index[empId] = i;
  }
  return index;
}


function sendErrorResponse(errorMsg, statusCode) {
  var obj = { success: false, error: errorMsg };
  if (statusCode) obj.statusCode = statusCode;
  return sendJsonResponse(obj);
}


function sendSuccessResponse(data, message) {
  var obj = { success: true };
  if (data) {
    for (var key in data) {
      obj[key] = data[key];
    }
  }
  if (message) obj.message = message;
  return sendJsonResponse(obj);
}
