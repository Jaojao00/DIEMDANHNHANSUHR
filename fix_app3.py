import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the HTML card inside the forEach
old_card_pattern = r"html \+= `[\s\S]*?</div>\s*`;"
new_card = """html += `
                <div style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:16px; margin-bottom:15px; position:relative; overflow:hidden;">
                    <div style="position:absolute; top:0; left:0; width:4px; height:100%; background:var(--primary);"></div>
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:12px; margin-bottom:12px;">
                        <div>
                            <div style="font-weight:bold; color:#fff; font-size:1.1rem; margin-bottom:4px;">Ngày: ${record['Ngày chấm công'] || 'Không rõ'}</div>
                            <div style="color:var(--text-secondary); font-size:0.9rem;">${record['Họ Tên'] || record['Họ và Tên'] || 'Không rõ'}</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="color:var(--primary); font-weight:bold; font-size:1.3rem;">${record['Lương theo ngày công'] || '0'}</div>
                            <div style="color:var(--text-secondary); font-size:0.8rem; text-transform:uppercase; letter-spacing:1px;">Lương ngày</div>
                        </div>
                    </div>
                    
                    <div style="display:grid; grid-template-columns:1fr; gap:8px; font-size:0.95rem;">
                        <div style="display:flex; justify-content:space-between;">
                            <span style="color:var(--text-secondary)">CCCD:</span> 
                            <span style="color:#fff; font-weight:500;">${record['CCCD'] || 'N/A'}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between;">
                            <span style="color:var(--text-secondary)">Địa điểm:</span> 
                            <span style="color:#fff; font-weight:500;">${record['Địa điểm'] || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                `;"""

content = re.sub(old_card_pattern, new_card, content)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated app.js layout for cards")
