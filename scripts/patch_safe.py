import sys

def patch_file(filename, replacements, prepend=None):
    with open(filename, 'rb') as f:
        content = f.read()

    for old_str, new_str in replacements:
        content = content.replace(old_str.encode('utf-8'), new_str.encode('utf-8'))

    if prepend:
        prepend_bytes = prepend.encode('utf-8')
        # Handle BOM if present
        if content.startswith(b'\xef\xbb\xbf'):
            content = b'\xef\xbb\xbf' + prepend_bytes + content[3:]
        else:
            content = prepend_bytes + content

    with open(filename, 'wb') as f:
        f.write(content)


escape_html_func = """
window.escapeHTML = function(str) {
  if (!str) return '';
  return str.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};
"""

app_replacements = [
    ('${emp.name}', '${escapeHTML(emp.name)}'),
    ('${emp.id}', '${escapeHTML(emp.id)}'),
    ('${emp.note}', '${escapeHTML(emp.note)}'),
    ('${emp.dinhDanh}', '${escapeHTML(emp.dinhDanh)}'),
    ('${emp.phone}', '${escapeHTML(emp.phone)}'),
    ('${r.name}', '${escapeHTML(r.name)}'),
    ('${r.id}', '${escapeHTML(r.id)}'),
    ('${r.note}', '${escapeHTML(r.note)}'),
    ('${r.phone}', '${escapeHTML(r.phone)}'),
    ('fetch(CONFIG.API_URL', 'fetch(State.apiLink'),
    ('fetch( CONFIG.API_URL', 'fetch(State.apiLink'),
    ('${CONFIG.API_URL}', '${State.apiLink}'),
    ('const url = CONFIG.API_URL;', 'const url = State.apiLink;'),
    ('if (CONFIG.API_URL &&', 'if (State.apiLink &&')
]

reg_replacements = [
    ('${emp.name}', '${escapeHTML(emp.name)}'),
    ('${emp.id}', '${escapeHTML(emp.id)}'),
    ('${emp.note}', '${escapeHTML(emp.note)}')
]

patch_file('app.js', app_replacements, prepend=escape_html_func)
patch_file('registration.js', reg_replacements, prepend=escape_html_func)

print("Files patched safely via bytes.")
