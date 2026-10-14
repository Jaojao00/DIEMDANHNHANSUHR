/**
 * BẢO MẬT & XÁC THỰC ADMIN (AGARI HR)
 */

function generateAdminToken(email) {
  var raw = email + "_" + new Date().getTime() + "_" + Utilities.getUuid();
  var signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  var token = signature.map(function(b) {
    return ('0' + (b & 0xFF).toString(16)).slice(-2);
  }).join('');

  var props = PropertiesService.getScriptProperties();
  var rawTokens = props.getProperty('ACTIVE_TOKENS') || '{}';
  var tokens = JSON.parse(rawTokens);

  var expiresAt = new Date().getTime() + (CONFIG.TOKEN_EXPIRY_MINUTES * 60 * 1000);
  tokens[token] = {
    email: email,
    expiresAt: expiresAt
  };

  props.setProperty('ACTIVE_TOKENS', JSON.stringify(tokens));
  return token;
}

function verifyAdminToken(token) {
  if (!token) return false;

  var props = PropertiesService.getScriptProperties();
  var rawTokens = props.getProperty('ACTIVE_TOKENS') || '{}';
  var tokens = JSON.parse(rawTokens);

  var session = tokens[token];
  if (!session) return false;

  var now = new Date().getTime();
  if (now > session.expiresAt) {
    delete tokens[token];
    props.setProperty('ACTIVE_TOKENS', JSON.stringify(tokens));
    return false;
  }

  return true;
}

function handleAdminLogin(data) {
  var email = (data.email || '').toLowerCase().trim();
  var password = data.password || '';

  // Kiểm tra tài khoản hợp lệ
  var isValidUser = CONFIG.ADMIN_ACCOUNTS.some(function(acc) {
    return acc.email.toLowerCase() === email;
  });

  if (!isValidUser) {
    return sendErrorResponse('Tài khoản không được phân quyền quản trị.', 401);
  }

  // Mật khẩu quản trị lưu trong ScriptProperties hoặc mặc định
  var props = PropertiesService.getScriptProperties();
  var storedPass = props.getProperty('ADMIN_PASSWORD_' + email) || 'agari@2026';

  if (password !== storedPass) {
    return sendErrorResponse('Mật khẩu không chính xác.', 401);
  }

  var token = generateAdminToken(email);
  return sendSuccessResponse({
    adminToken: token,
    email: email,
    expiresIn: CONFIG.TOKEN_EXPIRY_MINUTES * 60
  }, 'Đăng nhập thành công');
}
