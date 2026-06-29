import re
import os

# Clean app.js
with open('app.js', 'r', encoding='utf-8') as f:
    app_content = f.read()

# Remove the viewModeBooking button block
app_content = re.sub(
    r'\s*const btnViewModeBooking = document\.getElementById\(\'viewModeBooking\'\);\s*if \(btnViewModeBooking\) \{.*?\n\s*\}\s*\n',
    '\n',
    app_content,
    flags=re.DOTALL
)

# Remove the bookingDateFilter change listener
app_content = re.sub(
    r'\s*const bookingDp = document\.getElementById\(\'bookingDateFilter\'\);\s*if \(bookingDp\) \{.*?\n\s*\}\s*\n',
    '\n',
    app_content,
    flags=re.DOTALL
)

# Remove references to viewModeBooking and bookingDateFilter in other listeners
app_content = re.sub(
    r'\s*if \(document\.getElementById\(\'viewModeBooking\'\)\) \{.*?\n\s*\}',
    '',
    app_content,
    flags=re.DOTALL
)
app_content = re.sub(
    r'\s*if \(document\.getElementById\(\'bookingDateFilter\'\)\)\s*document\.getElementById\(\'bookingDateFilter\'\)\.style\.display = \'none\';',
    '',
    app_content
)

# Remove currentViewMode === 'booking'
app_content = re.sub(
    r'\s*if \(AdminApp\.currentViewMode === \'booking\'\) \{.*?\n\s*\} else \{',
    ' else {',
    app_content,
    flags=re.DOTALL
)
app_content = app_content.replace(' else {', ' {', 1) # Fix the if/else chain in loadData if needed...
# Wait, let's just make it exact
app_content = re.sub(
    r'if \(AdminApp\.currentViewMode === \'booking\'\) \{\s*AdminApp\.loadBookingData\(\);\s*\} else if ',
    'if ',
    app_content
)

# Remove renderBookingTable and loadBookingData
app_content = re.sub(
    r'\s*loadBookingData:\s*async\s*\(\)\s*=>\s*\{.*?(?=\s*loadData:)',
    '\n  ',
    app_content,
    flags=re.DOTALL
)

app_content = re.sub(
    r'\s*renderBookingTable:\s*\(\w+,\s*\w+\)\s*=>\s*\{.*?(?=\s*exportTableToExcel:)',
    '\n  ',
    app_content,
    flags=re.DOTALL
)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(app_content)


# Clean google-apps-script.js
with open('google-apps-script.js', 'r', encoding='utf-8') as f:
    gas_content = f.read()

# Remove the get_daily_booking block
gas_content = re.sub(
    r'\s*if \(action === "get_daily_booking"\) \{.*?\n\s*\}\s*\n(?=\s*if \(action === "sync_roster"\)|\s*if \(action === "get_shift_registrations"\)|\s*// ACTION)',
    '\n\n',
    gas_content,
    flags=re.DOTALL
)

# Remove get_daily_booking from the shiftId check
gas_content = gas_content.replace(' && action !== "get_daily_booking"', '')

with open('google-apps-script.js', 'w', encoding='utf-8') as f:
    f.write(gas_content)

print("Cleaned app.js and google-apps-script.js")
