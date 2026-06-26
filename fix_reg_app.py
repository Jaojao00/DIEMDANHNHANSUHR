import os

file_path = "registration.js"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# The injected block starts with '  ,\n  crOriginalData: null,'
target_str = "  ,\n  crOriginalData: null,"
if target_str in content:
    parts = content.split(target_str)
    # The first part is up to the end of ViewScheduleApp's original methods.
    # The second part is the injected methods, up to the end.
    
    original_part = parts[0]
    injected_part = target_str + parts[1]
    
    # We want to remove the injected_part from the end of the file.
    # But wait, injected_part contains the final }; of ViewScheduleApp.
    # Actually, injected_part is:
    # "  ,\n  crOriginalData: null,\n ... \n  }\n};\n"
    # We want to extract just the methods (from `,\n  crOriginalData` to `  }\n`)
    # and put them into RegApp.
    
    # Let's find the `};\n` at the end of injected_part
    last_brace_pos = injected_part.rfind('};')
    
    methods_to_move = injected_part[:last_brace_pos]
    
    # Restore ViewScheduleApp
    restored_view_schedule = original_part + "};"
    if original_part.endswith("  }\n"):
        restored_view_schedule = original_part + "};\n"
        
    # Now find RegApp's end.
    # RegApp ends right before:
    # // ==========================================
    # // XEM L?CH D DANG K (ViewScheduleApp)
    # // ==========================================
    reg_app_end_pos = restored_view_schedule.find('// ==========================================\n// XEM')
    
    # Before reg_app_end_pos, there should be `};` for RegApp
    reg_app_part = restored_view_schedule[:reg_app_end_pos]
    
    # Find the last }; in reg_app_part
    last_reg_app_brace = reg_app_part.rfind('};')
    
    # Insert methods_to_move here
    new_reg_app_part = reg_app_part[:last_reg_app_brace] + methods_to_move + "\n};\n" + reg_app_part[last_reg_app_brace+2:]
    
    final_content = new_reg_app_part + restored_view_schedule[reg_app_end_pos:]
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(final_content)
    print("Fixed registration.js: Moved methods from ViewScheduleApp to RegApp.")
else:
    print("Target string not found in registration.js")
