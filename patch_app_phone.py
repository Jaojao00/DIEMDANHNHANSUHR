with open("app.js", "r", encoding="utf-8") as f:
    content = f.read()

import re

# 1. Add _currentEmpCode in app.js
if "window._currentEmpCode =" not in content:
    content = content.replace(
        "window._currentEmpName = empName;",
        "window._currentEmpName = empName;\n              window._currentEmpCode = getVal(firstRec, ['m\\u00e3 ctv']) || getVal(firstRec, ['cccd']) || empId;"
    )

# 2. Update openComplaintModal to prefill
old_open = """window.openComplaintModal = function() {
    const modal = document.getElementById('complaintModal');
    if (modal) { modal.classList.remove('hidden'); modal.style.display = 'flex'; }
}"""

new_open = """window.openComplaintModal = function() {
    const modal = document.getElementById('complaintModal');
    if (modal) { 
        modal.classList.remove('hidden'); 
        modal.style.display = 'flex'; 
        
        // Auto fill
        if(document.getElementById('compName')) document.getElementById('compName').value = window._currentEmpName || '';
        if(document.getElementById('compCode')) document.getElementById('compCode').value = window._currentEmpCode || '';
    }
}"""

content = content.replace(old_open, new_open)

# 3. Update submitComplaint to read new fields
old_submit_start = """    const type = document.getElementById('compType').value;
    const content = document.getElementById('compDesc').value;"""

new_submit_start = """    const type = document.getElementById('compType').value;
    const content = document.getElementById('compDesc').value;
    const phone = document.getElementById('compPhone') ? document.getElementById('compPhone').value.trim() : '';
    const code = document.getElementById('compCode') ? document.getElementById('compCode').value.trim() : '';
    const name = document.getElementById('compName') ? document.getElementById('compName').value.trim() : window._currentEmpName;
    
    if (!phone) {
        Swal.fire({ title: "Thiếu SĐT", text: "Vui lòng nhập số điện thoại để quản lý liên hệ!", icon: "warning", background: "var(--surface)", color: "var(--text)"});
        return;
    }"""

content = content.replace(old_submit_start, new_submit_start)

# 4. Update payload in submitComplaint
old_payload = """    const payload = {
        action: 'submit_complaint',
        empId: empId,
        empName: window._currentEmpName || 'Không rõ',
        type: type,
        content: content,
        imageBase64: base64,"""

new_payload = """    const payload = {
        action: 'submit_complaint',
        empId: code || empId,
        empName: name || 'Không rõ',
        phone: phone,
        type: type,
        content: content,
        imageBase64: base64,"""

# Since Khng r might be there:
content = re.sub(r"const payload = \{\s*action: 'submit_complaint',\s*empId: empId,\s*empName: window\._currentEmpName \|\| '[^']+',\s*type: type,\s*content: content,\s*imageBase64: base64,", new_payload, content)


with open("app.js", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated app.js")
