const fs = require('fs');

function replaceAllSafe() {
    let content = fs.readFileSync('app.js');
    let str = content.toString('utf8');
    
    // Check if it starts with BOM
    let hasBom = str.charCodeAt(0) === 0xFEFF;
    if (hasBom) {
        str = str.slice(1);
    }

    if (!str.includes('window.escapeHTML')) {
        const escapeFunc = `\nwindow.escapeHTML = function(str) {\n  if (!str) return '';\n  return str.toString()\n    .replace(/&/g, '&amp;')\n    .replace(/</g, '&lt;')\n    .replace(/>/g, '&gt;')\n    .replace(/"/g, '&quot;')\n    .replace(/'/g, '&#039;');\n};\n`;
        str = escapeFunc + str;
    }

    str = str.replace(/\$\{emp\.name\}/g, '${escapeHTML(emp.name)}');
    str = str.replace(/\$\{emp\.id\}/g, '${escapeHTML(emp.id)}');
    str = str.replace(/\$\{emp\.note\}/g, '${escapeHTML(emp.note)}');
    str = str.replace(/\$\{emp\.dinhDanh\}/g, '${escapeHTML(emp.dinhDanh)}');
    str = str.replace(/\$\{emp\.phone\}/g, '${escapeHTML(emp.phone)}');
    str = str.replace(/\$\{r\.name\}/g, '${escapeHTML(r.name)}');
    str = str.replace(/\$\{r\.id\}/g, '${escapeHTML(r.id)}');
    str = str.replace(/\$\{r\.note\}/g, '${escapeHTML(r.note)}');
    str = str.replace(/\$\{r\.phone\}/g, '${escapeHTML(r.phone)}');

    // ONLY replace CONFIG.API_URL inside fetch() and template literals, not in assignments or conditionals if we can avoid it.
    // Actually, just replacing CONFIG.API_URL with State.apiLink is fine except where State is initialized!
    
    str = str.replace(/fetch\(CONFIG\.API_URL/g, "fetch(State.apiLink");
    str = str.replace(/fetch\(\s*CONFIG\.API_URL/g, "fetch(State.apiLink");
    str = str.replace(/\$\{CONFIG\.API_URL\}/g, "${State.apiLink}");
    str = str.replace(/const url = CONFIG\.API_URL;/g, "const url = State.apiLink;");
    str = str.replace(/if \(CONFIG\.API_URL &&/g, "if (State.apiLink &&");
    
    // Write back with BOM if it had one
    let finalStr = hasBom ? '\\uFEFF' + str : str;
    fs.writeFileSync('app.js', finalStr, 'utf8');

    // Registration.js
    let regContent = fs.readFileSync('registration.js');
    let regStr = regContent.toString('utf8');
    let regHasBom = regStr.charCodeAt(0) === 0xFEFF;
    if (regHasBom) {
        regStr = regStr.slice(1);
    }

    if (!regStr.includes('window.escapeHTML')) {
        const escapeFunc = `\nwindow.escapeHTML = function(str) {\n  if (!str) return '';\n  return str.toString()\n    .replace(/&/g, '&amp;')\n    .replace(/</g, '&lt;')\n    .replace(/>/g, '&gt;')\n    .replace(/"/g, '&quot;')\n    .replace(/'/g, '&#039;');\n};\n`;
        regStr = escapeFunc + regStr;
    }

    regStr = regStr.replace(/\$\{emp\.name\}/g, '${escapeHTML(emp.name)}');
    regStr = regStr.replace(/\$\{emp\.id\}/g, '${escapeHTML(emp.id)}');
    regStr = regStr.replace(/\$\{emp\.note\}/g, '${escapeHTML(emp.note)}');
    
    let finalRegStr = regHasBom ? '\\uFEFF' + regStr : regStr;
    fs.writeFileSync('registration.js', finalRegStr, 'utf8');
}

replaceAllSafe();
console.log("Refactored properly.");
