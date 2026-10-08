import re

with open('js/registration/regApp.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Update views hiding logic
old_hide = """    const empView = document.getElementById('employeeView');
    const regView = document.getElementById('empRegView');
    const vsView  = document.getElementById('empViewScheduleView');
    if (!empView || !regView || !vsView) return;

    empView.classList.remove('active');
    empView.style.display = 'none';
    regView.style.display = 'none';
    vsView.style.display = 'none';"""

new_hide = """    const empView = document.getElementById('employeeView');
    const regView = document.getElementById('empRegView');
    const vsView  = document.getElementById('empViewScheduleView');
    const rulesView = document.getElementById('empRulesView');
    if (!empView || !regView || !vsView) return;

    empView.classList.remove('active');
    empView.style.display = 'none';
    regView.style.display = 'none';
    vsView.style.display = 'none';
    if(rulesView) rulesView.style.display = 'none';"""
content = content.replace(old_hide, new_hide)

# Update show logic
old_show = """    } else if (tab === 'xemLich') {
      const btn = document.getElementById('navXemLich');
      if (btn) btn.classList.add('active');
      vsView.style.display = 'block';
    }"""
new_show = """    } else if (tab === 'xemLich') {
      const btn = document.getElementById('navXemLich');
      if (btn) btn.classList.add('active');
      vsView.style.display = 'block';
    } else if (tab === 'rules') {
      const btn = document.getElementById('navRules');
      if (btn) btn.classList.add('active');
      if (rulesView) rulesView.style.display = 'block';
    }"""
content = content.replace(old_show, new_show)

with open('js/registration/regApp.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated regApp.js EmpNav.show logic")
