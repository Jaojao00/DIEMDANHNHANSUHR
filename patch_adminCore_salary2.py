import re

with open("js/admin/adminCore.js", "r", encoding="utf-8") as f:
    content = f.read()

old_block = """          const shiftFilter = document.getElementById("bookingShiftFilter");
          if (shiftFilter) shiftFilter.value = "";
          AdminApp.loadBookingData();
        });
      }"""

new_block = """          const shiftFilter = document.getElementById("bookingShiftFilter");
          if (shiftFilter) shiftFilter.value = "";
          AdminApp.loadBookingData();
        });
      }
      
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
          if (document.getElementById("bookingTableContainer")) document.getElementById("bookingTableContainer").style.display = "none";
          if (salaryTableContainer) salaryTableContainer.style.display = "block";
          
          if (typeof AdminSalary !== "undefined") AdminSalary.init();
        });
      }
"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open("js/admin/adminCore.js", "w", encoding="utf-8") as f:
        f.write(content)
    print("Replaced successfully!")
else:
    print("Not found! Let's try regex")
