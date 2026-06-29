import os

# 1. Update app.js
with open('app.js', 'r', encoding='utf-8') as f:
    app_content = f.read()

app_get_old = "fetch(`${API_LINK}?action=get_change_requests`).then(res => res.json()).then(data => {"
app_get_new = "fetch(API_LINK, { method: 'POST', body: JSON.stringify({ action: 'get_change_requests' }) }).then(res => res.json()).then(data => {"
app_content = app_content.replace(app_get_old, app_get_new)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(app_content)

# 2. Update registration.js
with open('registration.js', 'r', encoding='utf-8') as f:
    reg_content = f.read()

reg_get_old = "const res = await fetch(`${API_LINK}?action=get_change_requests`);"
reg_get_new = "const res = await fetch(API_LINK, { method: 'POST', body: JSON.stringify({ action: 'get_change_requests' }) });"
reg_content = reg_content.replace(reg_get_old, reg_get_new)

with open('registration.js', 'w', encoding='utf-8') as f:
    f.write(reg_content)

# 3. Update google-apps-script.js
with open('google-apps-script.js', 'r', encoding='utf-8') as f:
    gas_content = f.read()

whitelist_old = 'if (!shiftId && action !== "request" && action !== "submit_registration" && action !== "reset_registrations" && action !== "admin_login" && action !== "save_reg_config" && action !== "sync_roster") {'
whitelist_new = 'if (!shiftId && action !== "request" && action !== "submit_registration" && action !== "reset_registrations" && action !== "admin_login" && action !== "save_reg_config" && action !== "sync_roster" && action !== "get_change_requests" && action !== "submit_change_request" && action !== "approve_change_request") {'

if whitelist_old in gas_content:
    gas_content = gas_content.replace(whitelist_old, whitelist_new)
else:
    print("WARNING: whitelist_old not found in google-apps-script.js. Did the regex change?")

with open('google-apps-script.js', 'w', encoding='utf-8') as f:
    f.write(gas_content)

print("Fixed API calls and whitelist successfully")
