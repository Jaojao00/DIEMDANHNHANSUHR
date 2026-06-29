const fs = require('fs');

function refactorFrontend(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Inject escapeHTML
    if (!content.includes('window.escapeHTML')) {
        const escapeFunc = `
window.escapeHTML = function(str) {
  if (!str) return '';
  return str.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};
`;
        content = escapeFunc + content;
    }

    // 2. Escape variables in template strings
    content = content.replace(/\$\{emp\.name\}/g, '${escapeHTML(emp.name)}');
    content = content.replace(/\$\{emp\.id\}/g, '${escapeHTML(emp.id)}');
    content = content.replace(/\$\{emp\.note\}/g, '${escapeHTML(emp.note)}');
    content = content.replace(/\$\{emp\.dinhDanh\}/g, '${escapeHTML(emp.dinhDanh)}');
    content = content.replace(/\$\{emp\.phone\}/g, '${escapeHTML(emp.phone)}');
    content = content.replace(/\$\{r\.name\}/g, '${escapeHTML(r.name)}');
    content = content.replace(/\$\{r\.id\}/g, '${escapeHTML(r.id)}');
    content = content.replace(/\$\{r\.note\}/g, '${escapeHTML(r.note)}');
    content = content.replace(/\$\{r\.phone\}/g, '${escapeHTML(r.phone)}');

    // 3. Clean up hardcoded fetch(CONFIG.APPS_SCRIPT_URL
    content = content.replace(/CONFIG\.APPS_SCRIPT_URL/g, "localStorage.getItem('agr_api_link') || (typeof CONFIG !== 'undefined' ? CONFIG.API_URL : '')");
    content = content.replace(/CONFIG\.API_URL/g, "(typeof CONFIG !== 'undefined' ? CONFIG.API_URL : '')");

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Refactored ' + filePath);
}

refactorFrontend('app.js');
refactorFrontend('registration.js');
