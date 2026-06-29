const fs = require('fs');

function refactorAppJs() {
    let content = fs.readFileSync('app.js', 'utf8');

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

    content = content.replace(/\$\{emp\.name\}/g, '${escapeHTML(emp.name)}');
    content = content.replace(/\$\{emp\.id\}/g, '${escapeHTML(emp.id)}');
    content = content.replace(/\$\{emp\.note\}/g, '${escapeHTML(emp.note)}');
    content = content.replace(/\$\{emp\.dinhDanh\}/g, '${escapeHTML(emp.dinhDanh)}');
    content = content.replace(/\$\{emp\.phone\}/g, '${escapeHTML(emp.phone)}');
    content = content.replace(/\$\{r\.name\}/g, '${escapeHTML(r.name)}');
    content = content.replace(/\$\{r\.id\}/g, '${escapeHTML(r.id)}');
    content = content.replace(/\$\{r\.note\}/g, '${escapeHTML(r.note)}');
    content = content.replace(/\$\{r\.phone\}/g, '${escapeHTML(r.phone)}');

    // Replace CONFIG.API_URL with State.apiLink EXCEPT in State initialization
    content = content.replace(/CONFIG\.API_URL/g, "State.apiLink");
    content = content.replace(/CONFIG\.APPS_SCRIPT_URL/g, "State.apiLink");
    
    // Fix the State.apiLink initialization itself
    content = content.replace(/apiLink: State\.apiLink \|\| State\.apiLink,/g, "apiLink: localStorage.getItem('agr_api_link') || (typeof CONFIG !== 'undefined' ? CONFIG.API_URL : ''),");

    // Also fix the settings update
    content = content.replace(/State\.apiLink = localStorage\.getItem\('agr_api_url'\) \|\| State\.apiLink;/g, "State.apiLink = localStorage.getItem('agr_api_link') || (typeof CONFIG !== 'undefined' ? CONFIG.API_URL : '');");

    fs.writeFileSync('app.js', content, 'utf8');
}

function refactorRegJs() {
    let content = fs.readFileSync('registration.js', 'utf8');

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

    content = content.replace(/\$\{emp\.name\}/g, '${escapeHTML(emp.name)}');
    content = content.replace(/\$\{emp\.id\}/g, '${escapeHTML(emp.id)}');
    content = content.replace(/\$\{emp\.note\}/g, '${escapeHTML(emp.note)}');
    
    // registration.js uses localStorage or CONFIG.API_URL locally in functions. 
    // It's mostly correct already (uses localStorage.getItem('agr_api_link') || (typeof CONFIG !== 'undefined' ? CONFIG.API_URL : '')).
    
    fs.writeFileSync('registration.js', content, 'utf8');
}

refactorAppJs();
refactorRegJs();
console.log("Frontend refactored safely!");
