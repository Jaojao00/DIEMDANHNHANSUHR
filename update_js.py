import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace toggleLookupTab function
old_js = """    function toggleLookupTab(tab) {
      const tabSched = document.getElementById('tabContentSchedule');
      const tabSal = document.getElementById('tabContentSalary');
      const navSched = document.getElementById('tabNavSchedule');
      const navSal = document.getElementById('tabNavSalary');
      
      if (tab === 'schedule') {
          tabSched.style.display = 'block';
          tabSal.style.display = 'none';
          navSched.style.color = 'var(--primary)';
          navSched.style.borderBottom = '2px solid var(--primary)';
          navSal.style.color = 'var(--text-secondary)';
          navSal.style.borderBottom = 'none';
      } else {
          tabSched.style.display = 'none';
          tabSal.style.display = 'block';
          navSal.style.color = 'var(--primary)';
          navSal.style.borderBottom = '2px solid var(--primary)';
          navSched.style.color = 'var(--text-secondary)';
          navSched.style.borderBottom = 'none';
      }
    }"""

new_js = """    function toggleLookupTab(tab) {
      const tabSched = document.getElementById('tabContentSchedule');
      const tabSal = document.getElementById('tabContentSalary');
      const tabRules = document.getElementById('tabContentRules');
      
      const navSched = document.getElementById('tabNavSchedule');
      const navSal = document.getElementById('tabNavSalary');
      const navRules = document.getElementById('tabNavRules');
      
      // Reset all
      [tabSched, tabSal, tabRules].forEach(t => { if(t) t.style.display = 'none'; });
      [navSched, navSal, navRules].forEach(n => {
          if(!n) return;
          n.style.color = 'var(--text-secondary)';
          n.style.borderBottom = 'none';
      });
      
      // Active one
      let activeTab, activeNav;
      if (tab === 'schedule') { activeTab = tabSched; activeNav = navSched; }
      else if (tab === 'salary') { activeTab = tabSal; activeNav = navSal; }
      else if (tab === 'rules') { activeTab = tabRules; activeNav = navRules; }
      
      if (activeTab) activeTab.style.display = 'block';
      if (activeNav) {
          activeNav.style.color = 'var(--primary)';
          activeNav.style.borderBottom = '2px solid var(--primary)';
      }
    }"""

content = content.replace(old_js, new_js)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated JS for tabs")
