import re

with open("backend/main.js", "r", encoding="utf-8") as f:
    content = f.read()

# Add submit_complaint to whitelist
content = content.replace(
    'action !== "lookup_salary"',
    'action !== "lookup_salary" && action !== "submit_complaint"'
)

# Add case "submit_complaint": return handleSubmitComplaint(data);
if 'case "lookup_salary": return handleLookupSalary(data);' in content:
    content = content.replace(
        'case "lookup_salary": return handleLookupSalary(data);',
        'case "lookup_salary": return handleLookupSalary(data);\n      case "submit_complaint": return handleSubmitComplaint(data);'
    )

with open("backend/main.js", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated backend/main.js")
