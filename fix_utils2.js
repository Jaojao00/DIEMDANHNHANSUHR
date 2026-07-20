const fs = require('fs');
let content = fs.readFileSync('backend/utils.js', 'utf8');

const successFunc = `
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
`;

content = content + '\n' + successFunc;
fs.writeFileSync('backend/utils.js', content);
