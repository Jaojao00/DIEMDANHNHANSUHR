import os

with open("app.js", "r", encoding="utf-8") as f:
    content = f.read()

def extract_block(name):
    # Find the string exactly
    search_str = f"const {name} = {{"
    start_idx = content.find(search_str)
    if start_idx == -1:
        print(f"Could not find {name}")
        return None, ""
    
    brace_count = 0
    in_string = False
    escape = False
    quote_char = ''
    
    # find the starting brace which is at start_idx + len(search_str) - 1
    brace_start = start_idx + len(search_str) - 1
    
    for i in range(brace_start, len(content)):
        char = content[i]
        
        if escape:
            escape = False
            continue
            
        if char == '\\':
            escape = True
            continue
            
        if in_string:
            if char == quote_char:
                in_string = False
            continue
            
        if char in '"\'`':
            in_string = True
            quote_char = char
            continue
            
        if char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            if brace_count == 0:
                end_idx = i + 1
                if end_idx < len(content) and content[end_idx] == ';':
                    end_idx += 1
                return (start_idx, end_idx), content[start_idx:end_idx]
                
    return None, ""

blocks = ["State", "Utils", "DataManager", "EmployeeApp", "AdminApp"]
extracted = {}
indices = []

for block in blocks:
    span, text = extract_block(block)
    if text:
        extracted[block] = text
        indices.append(span)

if len(indices) == len(blocks):
    with open("utils.js", "w", encoding="utf-8") as f:
        f.write(extracted["Utils"] + "\n")

    with open("dataManager.js", "w", encoding="utf-8") as f:
        f.write(extracted["State"] + "\n\n" + extracted["DataManager"] + "\n")

    with open("employee.js", "w", encoding="utf-8") as f:
        f.write(extracted["EmployeeApp"] + "\n")

    with open("admin.js", "w", encoding="utf-8") as f:
        f.write(extracted["AdminApp"] + "\n")

    new_content = content
    indices.sort(key=lambda x: x[0], reverse=True)
    for span in indices:
        new_content = new_content[:span[0]] + new_content[span[1]:]

    with open("app.js", "w", encoding="utf-8") as f:
        f.write(new_content)

    print("Split complete!")
else:
    print("Failed to find all blocks, aborting.")
