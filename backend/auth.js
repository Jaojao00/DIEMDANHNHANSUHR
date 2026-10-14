
function verifyAdminToken(token) {
  if (!token) return false;
  var scriptProperties = PropertiesService.getScriptProperties();
  var tokensStr = scriptProperties.getProperty("ACTIVE_TOKENS");
  var tokens = tokensStr ? JSON.parse(tokensStr) : {};
  
  var tokenData = tokens[token];
  if (!tokenData) return false;
  
  var currentTime = new Date().getTime();
  if (currentTime > tokenData.expiry) {
    delete tokens[token];
    scriptProperties.setProperty("ACTIVE_TOKENS", JSON.stringify(tokens));
    return false;
  }
  return true;
}

function generateAdminToken(email) {
  var scriptProperties = PropertiesService.getScriptProperties();
  var timestamp = new Date().getTime();
  var expiryMinutes = CONFIG.ADMIN_EXPIRY_MINUTES || 60;
  var expiryTime = timestamp + (expiryMinutes * 60 * 1000);
  var randomBytes = Utilities.getUuid();
  var tokenHash = Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, randomBytes + email + timestamp, Utilities.Charset.UTF_8)
  );
  var tokensStr = scriptProperties.getProperty("ACTIVE_TOKENS");
  var tokens = tokensStr ? JSON.parse(tokensStr) : {};
  for (var t in tokens) {
    if (timestamp > tokens[t].expiry) delete tokens[t];
  }
  tokens[tokenHash] = { email: email, expiry: expiryTime };
  scriptProperties.setProperty("ACTIVE_TOKENS", JSON.stringify(tokens));
  return tokenHash;
}
