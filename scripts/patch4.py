import json

with open('old_google_apps_script_utf8.js', 'r', encoding='utf-8') as f:
    old_lines = f.readlines()

with open('google-apps-script.js', 'r', encoding='utf-8') as f:
    new_lines = f.readlines()

# Extract from old (0-indexed)
submit_old = old_lines[248:315]
reset_old = old_lines[395:421]
get_reg_old = old_lines[552:614]
get_shift_old = old_lines[614:665]

# Replace in new (must go bottom to top to preserve line indices)
# 4. get_shift_registrations: 771 to 823 -> index 770 to 823
new_lines = new_lines[:770] + get_shift_old + new_lines[823:]

# 3. get_registration: 701 to 744 -> index 700 to 744
new_lines = new_lines[:700] + get_reg_old + new_lines[744:]

# 2. reset_registrations: 533 to 558 -> index 532 to 558
new_lines = new_lines[:532] + reset_old + new_lines[558:]

# 1. submit_registration: 249 to 297 -> index 248 to 297
new_lines = new_lines[:248] + submit_old + new_lines[297:]

with open('google-apps-script.js', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Sliced and patched successfully!")
