import re

with open("js/admin/adminCore.js", "r", encoding="utf-8") as f:
    content = f.read()

# Variables
content = content.replace(
    'const btnViewModeBooking = document.getElementById("viewModeBooking");',
    'const btnViewModeBooking = document.getElementById("viewModeBooking");\n    const btnViewModeSalary = document.getElementById("viewModeSalary");\n    const salaryTableContainer = document.getElementById("salaryTableContainer");'
)

# In btnViewModeFinal.addEventListener("click")
content = content.replace(
    'if (bookingTableContainer) bookingTableContainer.style.display = "none";',
    'if (bookingTableContainer) bookingTableContainer.style.display = "none";\n        if (salaryTableContainer) salaryTableContainer.style.display = "none";\n        if (btnViewModeSalary) { btnViewModeSalary.style.background = "transparent"; btnViewModeSalary.style.color = "var(--text-secondary)"; btnViewModeSalary.classList.add("btn-ghost"); }'
)

# In btnViewModeReg.addEventListener("click")
content = content.replace(
    'if (bookingTableContainer) bookingTableContainer.style.display = "none";\n        AdminApp.loadData();',
    'if (bookingTableContainer) bookingTableContainer.style.display = "none";\n        if (salaryTableContainer) salaryTableContainer.style.display = "none";\n        if (btnViewModeSalary) { btnViewModeSalary.style.background = "transparent"; btnViewModeSalary.style.color = "var(--text-secondary)"; btnViewModeSalary.classList.add("btn-ghost"); }\n        AdminApp.loadData();'
)

# In btnViewModeBooking.addEventListener("click")
content = content.replace(
    'btnViewModeFinal.classList.add("btn-ghost");\n        if (scheduleTableContainer) scheduleTableContainer.style.display = "none";',
    'btnViewModeFinal.classList.add("btn-ghost");\n        if (btnViewModeSalary) { btnViewModeSalary.style.background = "transparent"; btnViewModeSalary.style.color = "var(--text-secondary)"; btnViewModeSalary.classList.add("btn-ghost"); }\n        if (scheduleTableContainer) scheduleTableContainer.style.display = "none";\n        if (salaryTableContainer) salaryTableContainer.style.display = "none";'
)

# Add btnViewModeSalary listener
salary_listener = """
      if (btnViewModeSalary) {
        btnViewModeSalary.addEventListener("click", () => {
          AdminApp.currentViewMode = "salary";
          const rBtn = document.getElementById("regManagerBtn");
          const mBtn = document.getElementById("managerBtn");
          if(rBtn) rBtn.style.display = "none";
          if(mBtn) mBtn.style.display = "none";
          
          btnViewModeSalary.style.background = "var(--primary)";
          btnViewModeSalary.style.color = "white";
          btnViewModeSalary.classList.remove("btn-ghost");
          
          btnViewModeReg.style.background = "transparent";
          btnViewModeReg.style.color = "var(--text-secondary)";
          btnViewModeReg.classList.add("btn-ghost");
          btnViewModeFinal.style.background = "transparent";
          btnViewModeFinal.style.color = "var(--text-secondary)";
          btnViewModeFinal.classList.add("btn-ghost");
          if (btnViewModeBooking) {
            btnViewModeBooking.style.background = "transparent";
            btnViewModeBooking.style.color = "var(--text-secondary)";
            btnViewModeBooking.classList.add("btn-ghost");
          }
          if (scheduleTableContainer) scheduleTableContainer.style.display = "none";
          if (bookingTableContainer) bookingTableContainer.style.display = "none";
          if (salaryTableContainer) salaryTableContainer.style.display = "block";
          
          if (typeof AdminSalary !== "undefined") AdminSalary.init();
        });
      }
"""

content = content.replace(
    'if (typeof AdminBooking !== "undefined") AdminBooking.renderBookingTable();\n      });\n    }',
    'if (typeof AdminBooking !== "undefined") AdminBooking.renderBookingTable();\n      });\n    }\n' + salary_listener
)

with open("js/admin/adminCore.js", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated adminCore.js")
