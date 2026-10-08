import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

new_field = '''            <div class="form-group" id="itemReqReasonGroup">
              <label class="form-label" for="itemReqReason">Lý Do <span class="required-star">*</span></label>
              <select id="itemReqReason" class="form-input">
                <option value="">-- Chọn Lý Do --</option>
              </select>
            </div>
'''

content = re.sub(
    r'(<select id="itemReqShift" class="form-input" required>[\s\S]*?</select>\s*</div>)',
    r'\1\n' + new_field,
    content
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated index.html")
