import os
import re

with open('registration.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the empty array check
old_selections_build = r'(// Build crCurrentSelections.*?)(^\s*RegApp\.crOriginalData)'
new_selections_build = """      // Build crCurrentSelections từ mảng selections của backend (WORK, OFF, v.v.)
      RegApp.crCurrentSelections = [];
      if (empData.selections && Array.isArray(empData.selections)) {
        empData.selections.forEach(sel => {
          if (sel.label && sel.choice && sel.choice.trim() !== "") {
            RegApp.crCurrentSelections.push({
              id: sel.label.substring(0, 10),
              label: sel.label,
              value: sel.choice,
              choice: sel.choice
            });
          }
        });
      }
      
"""
content = re.sub(r'// Build crCurrentSelections.*?RegApp\.crOriginalData', new_selections_build + '      RegApp.crOriginalData', content, flags=re.DOTALL)

# Add spinner to submitChangeRequest
old_submit_start = """  submitChangeRequest: async () => {
    const btn = document.getElementById('crSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Đang gửi yêu cầu...';"""

new_submit_start = """  submitChangeRequest: async () => {
    const btn = document.getElementById('crSubmitBtn');
    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<svg class="spinner" width="20" height="20" viewBox="0 0 50 50" style="vertical-align:middle; margin-right:8px;"><circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="5" stroke-dasharray="31.4 1000" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite"/></circle></svg> Đang gửi yêu cầu...';"""

content = content.replace(old_submit_start, new_submit_start)

# Replace the finally block in submitChangeRequest
old_finally = """    } finally {
      btn.textContent = 'Gửi yêu cầu thay đổi';
    }"""

new_finally = """    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Gửi yêu cầu thay đổi';
    }"""

content = content.replace(old_finally, new_finally)

with open('registration.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated registration.js")
