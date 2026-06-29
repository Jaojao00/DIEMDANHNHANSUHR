const fs = require('fs');
const oldCode = fs.readFileSync('old_google_apps_script_utf8.js', 'utf8');
let newCode = fs.readFileSync('google-apps-script.js', 'utf8');

function extract(code, startMarker, endMarker) {
    const startIndex = code.indexOf(startMarker);
    const endIndex = code.indexOf(endMarker, startIndex);
    return code.substring(startIndex, endIndex);
}

// 1. SUBMIT_REGISTRATION
const submitOld = extract(oldCode, '// ACTION: SUBMIT_REGISTRATION', '// ACTION: CHECKIN');
newCode = newCode.replace(extract(newCode, '// ACTION: SUBMIT_REGISTRATION', '// ACTION: CHECKIN'), submitOld);

// 2. RESET_REGISTRATIONS
const resetOld = extract(oldCode, '// ACTION: RESET_REGISTRATIONS', '// ACTION: SAVE_REG_CONFIG');
newCode = newCode.replace(extract(newCode, '// ACTION: RESET_REGISTRATIONS', '// ACTION: SAVE_REG_CONFIG'), resetOld);

// 3. get_registration
const getRegOld = extract(oldCode, 'if (action === "get_registration") {', 'if (action === "get_shift_registrations") {');
newCode = newCode.replace(extract(newCode, 'if (action === "get_registration") {', 'if (action === "get_shift_registrations") {'), getRegOld);

// 4. get_shift_registrations
const getShiftRegOld = extract(oldCode, 'if (action === "get_shift_registrations") {', 'if (action === "sync_roster") {');
const endMarkerNew = newCode.indexOf('if (action === "sync_roster") {') !== -1 ? 'if (action === "sync_roster") {' : '// Pre-flight check';
newCode = newCode.replace(extract(newCode, 'if (action === "get_shift_registrations") {', endMarkerNew), getShiftRegOld);

fs.writeFileSync('google-apps-script.js', newCode, 'utf8');
console.log('Successfully patched google-apps-script.js');
