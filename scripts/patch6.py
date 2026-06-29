import sys

filename = 'app.js'
with open(filename, 'rb') as f:
    content = f.read()

target = b'''        if (!empId || !name || !phone || !date || (type === 'XIN OFF' && !reason)) {
          Utils.showToast('Vui l\xc3\xb2ng \xc4\x91i\xe1\xbb\x81n \xc4\x91\xe1\xba\xa7y \xc4\x91\xe1\xbb\xa7 th\xc3\xb4ng tin b\xe1\xba\xaft bu\xe1\xbb\x99c!', 'error');
          return;
        }'''

replacement = target + b'''

        if (typeof CONFIG !== 'undefined' && CONFIG.EMPLOYEE_ID_REGEX && !CONFIG.EMPLOYEE_ID_REGEX.test(empId)) {
          Utils.showToast('M\xc3\xa3 nh\xc3\xa2n vi\xc3\xaan kh\xc3\xb4ng h\xe1\xbb\xa3p l\xe1\xbb\x87! Vui l\xc3\xb2ng nh\xe1\xba\xadp \xc4\x91\xc3\xbang \xc4\x91\xe1\xbb\x8bnh d\xe1\xba\xa1ng (VD: Ops123456)', 'error');
          return;
        }'''

if target in content:
    content = content.replace(target, replacement)
    with open(filename, 'wb') as f:
        f.write(content)
    print("Patched successfully!")
else:
    print("Target not found. Let's try flexible search.")
    # In case encoding was slightly different in the target string
    target2 = b"if (!empId || !name || !phone || !date || (type === 'XIN OFF' && !reason)) {"
    
    parts = content.split(target2)
    if len(parts) == 2:
        replacement2 = target2 + b'''
          Utils.showToast('Vui l\xc3\xb2ng \xc4\x91i\xe1\xbb\x81n \xc4\x91\xe1\xba\xa7y \xc4\x91\xe1\xbb\xa7 th\xc3\xb4ng tin b\xe1\xba\xaft bu\xe1\xbb\x99c!', 'error');
          return;
        }

        if (typeof CONFIG !== 'undefined' && CONFIG.EMPLOYEE_ID_REGEX && !CONFIG.EMPLOYEE_ID_REGEX.test(empId)) {
          Utils.showToast('M\xc3\xa3 nh\xc3\xa2n vi\xc3\xaan kh\xc3\xb4ng h\xe1\xbb\xa3p l\xe1\xbb\x87! Vui l\xc3\xb2ng nh\xe1\xba\xadp \xc4\x91\xc3\xbang \xc4\x91\xe1\xbb\x8bnh d\xe1\xba\xa1ng (VD: Ops123456)', 'error');
          return;
        }'''
        
        # We need to drop the original toast and return
        # Find the next }
        end_idx = parts[1].find(b"}")
        if end_idx != -1:
            content = parts[0] + replacement2 + parts[1][end_idx+1:]
            with open(filename, 'wb') as f:
                f.write(content)
            print("Patched successfully with flexible search!")
        else:
            print("Could not find closing brace.")
    else:
        print("Could not find target.")
