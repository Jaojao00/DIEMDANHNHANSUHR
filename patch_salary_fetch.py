import re

with open("js/admin/adminSalary.js", "r", encoding="utf-8") as f:
    content = f.read()

old_fetch = """            const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    action: "get_salary_list",
                    adminToken: token,
                    shiftId: "dummy" // Bypass if needed
                })
            });"""

new_fetch = """            const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({
                    action: "get_salary_list",
                    adminToken: token,
                    shiftId: "dummy"
                })
            });"""

if old_fetch in content:
    content = content.replace(old_fetch, new_fetch)
    with open("js/admin/adminSalary.js", "w", encoding="utf-8") as f:
        f.write(content)
    print("Fixed fetch to use JSON!")
else:
    print("Could not find the fetch block to replace.")
