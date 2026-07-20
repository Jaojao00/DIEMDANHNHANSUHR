const fs = require('fs');
let content = fs.readFileSync('backend/utils.js', 'utf8');

const errorFunc = `
function sendErrorResponse(errorMsg, statusCode) {
  var obj = { success: false, error: errorMsg };
  if (statusCode) obj.statusCode = statusCode;
  return sendJsonResponse(obj);
}
`;

content = content + '\n' + errorFunc;
fs.writeFileSync('backend/utils.js', content);
