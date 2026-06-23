const fs = require('fs');
const oldCode = fs.readFileSync('old_google_apps_script_utf8.js', 'utf8');
const newCode = fs.readFileSync('google-apps-script.js', 'utf8');

function extractBlock(code, startMarker, endMarker) {
    const startIndex = code.indexOf(startMarker);
    if (startIndex === -1) return null;
    let endIndex = code.indexOf(endMarker, startIndex);
    if (endIndex === -1) endIndex = code.length;
    return code.substring(startIndex, endIndex);
}

const submitRegOld = extractBlock(oldCode, '// ACTION: SUBMIT_REGISTRATION', '// ACTION: CHECKIN');
const resetRegOld = extractBlock(oldCode, '// ACTION: RESET_REGISTRATIONS', '// ACTION: SAVE_REG_CONFIG');
const getRegOld = extractBlock(oldCode, 'if (action === "get_registration") {', 'if (action === "get_shift_registrations") {');
const getShiftRegOld = extractBlock(oldCode, 'if (action === "get_shift_registrations") {', '//==========================================');

let modifiedCode = newCode;

function replaceBlock(code, startMarker, endMarker, newBlock) {
    const startIndex = code.indexOf(startMarker);
    const endIndex = code.indexOf(endMarker, startIndex);
    if (startIndex !== -1 && endIndex !== -1 && newBlock) {
        return code.substring(0, startIndex) + newBlock + code.substring(endIndex);
    }
    return code;
}

modifiedCode = replaceBlock(modifiedCode, '// ACTION: SUBMIT_REGISTRATION', '// ACTION: CHECKIN', submitRegOld);
modifiedCode = replaceBlock(modifiedCode, '// ACTION: RESET_REGISTRATIONS', '// ACTION: SAVE_REG_CONFIG', resetRegOld);
modifiedCode = replaceBlock(modifiedCode, 'if (action === "get_registration") {', 'if (action === "get_shift_registrations") {', getRegOld);
modifiedCode = replaceBlock(modifiedCode, 'if (action === "get_shift_registrations") {', '//==========================================', getShiftRegOld);

fs.writeFileSync('google-apps-script.js', modifiedCode);
console.log('Restored the 4 blocks!');
