import re

with open('old_google_apps_script_utf8.js', 'r', encoding='utf-8') as f:
    old_code = f.read()

with open('google-apps-script.js', 'r', encoding='utf-8') as f:
    new_code = f.read()

def extract(code, start_marker, end_marker):
    start = code.find(start_marker)
    if start == -1: return ''
    end = code.find(end_marker, start)
    if end == -1: end = len(code)
    return code[start:end]

submit_old = extract(old_code, '// ACTION: SUBMIT_REGISTRATION', '// ACTION: CHECKIN')
reset_old = extract(old_code, '// ACTION: RESET_REGISTRATIONS', '// ACTION: SAVE_REG_CONFIG')
get_reg_old = extract(old_code, 'if (action === "get_registration") {', 'if (action === "get_shift_registrations") {')
get_shift_reg_old = extract(old_code, 'if (action === "get_shift_registrations") {', 'if (action === "sync_roster") {')

submit_new = extract(new_code, '// ACTION: SUBMIT_REGISTRATION', '// ACTION: CHECKIN')
reset_new = extract(new_code, '// ACTION: RESET_REGISTRATIONS', '// ACTION: SAVE_REG_CONFIG')
get_reg_new = extract(new_code, 'if (action === "get_registration") {', 'if (action === "get_reg_config") {')

end_marker_new = 'if (action === "sync_roster") {' if new_code.find('if (action === "sync_roster") {') != -1 else '// Pre-flight check'
get_shift_reg_new = extract(new_code, 'if (action === "get_shift_registrations") {', end_marker_new)

new_code = new_code.replace(submit_new, submit_old)
new_code = new_code.replace(reset_new, reset_old)
new_code = new_code.replace(get_reg_new, get_reg_old)
new_code = new_code.replace(get_shift_reg_new, get_shift_reg_old)

with open('google-apps-script.js', 'w', encoding='utf-8') as f:
    f.write(new_code)

print('Success Python patch')
