import sys

with open('google-apps-script.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Extract get_daily_booking block
start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if 'if (action === "get_daily_booking") {' in line:
        start_idx = i
        break

if start_idx != -1:
    open_brackets = 0
    for i in range(start_idx, len(lines)):
        if '{' in lines[i]:
            open_brackets += lines[i].count('{')
        if '}' in lines[i]:
            open_brackets -= lines[i].count('}')
        if open_brackets == 0:
            end_idx = i
            break

if start_idx != -1 and end_idx != -1:
    block = lines[start_idx:end_idx+1]
    
    # Remove it from the file
    lines = lines[:start_idx] + lines[end_idx+1:]
    
    # Insert it into doPost
    # Find sync_roster action block in doPost
    insert_idx = -1
    for i, line in enumerate(lines):
        if 'if (action === "sync_roster") {' in line:
            # We want to insert AFTER this block
            open_b = 0
            for j in range(i, len(lines)):
                if '{' in lines[j]: open_b += lines[j].count('{')
                if '}' in lines[j]: open_b -= lines[j].count('}')
                if open_b == 0:
                    insert_idx = j + 1
                    break
            break
            
    if insert_idx != -1:
        # Also ensure the shiftId check is correct
        for i, line in enumerate(lines):
            if 'if (!shiftId && action !== "request"' in line:
                if 'get_daily_booking' not in line:
                    lines[i] = line.replace(') {', ' && action !== "get_daily_booking") {')
                break
                
        lines = lines[:insert_idx] + ["\n"] + block + ["\n"] + lines[insert_idx:]
        
        with open('google-apps-script.js', 'w', encoding='utf-8') as f:
            f.writelines(lines)
            
        print("Fixed google-apps-script.js successfully.")
    else:
        print("Could not find insert index.")
else:
    print("Could not find get_daily_booking block.")
