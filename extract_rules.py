import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Close empViewScheduleView before Rules, and start empRulesView
old_trans = r'</div> <!-- End Tab Salary -->\s*<!-- TAB QUY ĐỊNH VẬN HÀNH -->\s*<div id="tabContentRules"[^>]*>'
new_trans = """</div> <!-- End Tab Salary -->
          </div> <!-- End reg-body -->
        </div> <!-- End empViewScheduleView -->
        
        <!-- QUY ĐỊNH VIEW -->
        <div id="empRulesView" style="display: none">
          <div class="reg-body" style="padding-top: 20px;">
            <div class="rules-content" style="padding-bottom: 50px;">"""
content = re.sub(old_trans, new_trans, content)

# 2. End empRulesView
old_end = r'<!-- END TAB QUY ĐỊNH -->\s*</div>\s*</div>'
new_end = """</div> <!-- End rules-content -->
          </div>
        </div>
        <!-- END QUY ĐỊNH VIEW -->"""
content = re.sub(old_end, new_end, content)

# 3. Add to bottom nav
old_nav = """        <button
          class="emp-nav-item"
          id="navXemLich"
          onclick="EmpNav.show('xemLich')"
        >
          <span class="nav-icon">🔍</span>
          <span>Xem lịch</span>
        </button>
      </nav>"""
new_nav = """        <button
          class="emp-nav-item"
          id="navXemLich"
          onclick="EmpNav.show('xemLich')"
        >
          <span class="nav-icon">🔍</span>
          <span>Xem lịch</span>
        </button>
        <button
          class="emp-nav-item"
          id="navRules"
          onclick="EmpNav.show('rules')"
        >
          <span class="nav-icon">📜</span>
          <span>Quy định</span>
        </button>
      </nav>"""
content = content.replace(old_nav, new_nav)

# 4. Remove Quy định from top tabs
old_tab_rules = r'<span[^>]*id="tabNavRules"[^>]*>Quy định</span>'
content = re.sub(old_tab_rules, '', content)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated index.html HTML structure")
