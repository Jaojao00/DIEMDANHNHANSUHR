import os
import re

with open('app.js', 'r', encoding='utf-8') as f:
    app_content = f.read()

# Fix the loadData in app.js
pattern = re.compile(r'(\s+loadData:\s*async\s*\(\s*isSilent\s*=\s*false\s*\)\s*=>\s*\{)(\s+try\s*\{)', re.MULTILINE)

new_start = r"""\1
      if (AdminApp.currentViewMode === 'booking') {
        const shiftFilter = document.getElementById('bookingShiftFilter');
        if (shiftFilter) shiftFilter.value = State.selectedShiftId;
        AdminApp.loadBookingData();
        return;
      }\2"""

app_content, count = pattern.subn(new_start, app_content)
if count > 0:
    print(f"Replaced {count} instances in app.js")
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(app_content)
else:
    print("Failed to replace in app.js")
