import os

files_to_patch = [
    'employee.js',
    'js/admin/adminUI.js',
    'js/admin/adminManager.js',
    'js/admin/adminCore.js'
]

for file_path in files_to_patch:
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace State.shifts.map with State.shifts.filter(s => !s.hidden).map
        if "State.shifts\n" in content:
            content = content.replace("State.shifts\n      .map(", "State.shifts\n      .filter(s => !s.hidden)\n      .map(")
            content = content.replace("State.shifts\n            .map(", "State.shifts\n            .filter(s => !s.hidden)\n            .map(")
            content = content.replace("State.shifts.map(", "State.shifts.filter(s => !s.hidden).map(")
            
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Patched {file_path}")
    else:
        print(f"Not found: {file_path}")
