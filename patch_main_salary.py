import re

with open("backend/main.js", "r", encoding="utf-8") as f:
    content = f.read()

# Add get_salary_list to adminActions
content = content.replace(
    'var adminActions = ["save_reg_config", "reset_registrations", "reset_all_shifts", "sync_roster", "get_change_requests", "approve_change_request", "reject_change_request", "get_booking", "get_admin_logs"];',
    'var adminActions = ["save_reg_config", "reset_registrations", "reset_all_shifts", "sync_roster", "get_change_requests", "approve_change_request", "reject_change_request", "get_booking", "get_admin_logs", "get_salary_list"];'
)

# Add case to switch statement
content = content.replace(
    'case "get_admin_logs": return handleGetAdminLogs(data, shiftId, sheet);',
    'case "get_admin_logs": return handleGetAdminLogs(data, shiftId, sheet);\n      case "get_salary_list": return handleGetSalaryList(data);'
)

with open("backend/main.js", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated backend/main.js")
