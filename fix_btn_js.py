# -*- coding: utf-8 -*-
with open("app.js", "r", encoding="utf-8") as f:
    content = f.read()

import re

new_logic = """  const repairBtn = document.getElementById("repairBtn");
  if (repairBtn) {
    repairBtn.addEventListener("click", () => {
      const ua = navigator.userAgent || navigator.vendor || window.opera;
      const currentUrl = window.location.href;
      
      // If Android, try to open in Chrome via Intent
      if (/android/i.test(ua)) {
        const cleanUrl = currentUrl.replace(/^https?:\/\//, '');
        const intentUrl = `intent://${cleanUrl}#Intent;scheme=https;package=com.android.chrome;end;`;
        window.location.href = intentUrl;
        
        // Fallback
        setTimeout(() => {
          window.open(currentUrl, '_blank', 'noopener,noreferrer');
        }, 500);
      } else {
        // iOS or desktop
        window.open(currentUrl, '_blank', 'noopener,noreferrer');
      }
    });
  }"""

pattern = r'const repairBtn = document\.getElementById\("repairBtn"\);.*?\}\);.*?(?=\n  //|\n  const)'
# Wait, a safer regex:
pattern2 = r'const repairBtn = document\.getElementById\("repairBtn"\);\s*if \(repairBtn\) \{.*?\}\);?\s*\}'

content = re.sub(pattern2, new_logic, content, flags=re.DOTALL)

with open("app.js", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated app.js")
