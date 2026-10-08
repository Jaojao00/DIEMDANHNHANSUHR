import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the broken string assignment
old_str = '''                const name = record['Họ Tên'] || record['Họ và Tên'] || 'Không rõ';
                const shift = record['Ca làm việc'] || record['Thứ'] || 'N/A';
                
                html += 
                <div style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:15px; margin-bottom:15px;">'''

new_str = '''                const name = record['Họ Tên'] || record['Họ và Tên'] || 'Không rõ';
                const shift = record['Ca làm việc'] || record['Thứ'] || 'N/A';
                
                html += 
                '<div style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:15px; margin-bottom:15px;">' +'''

content = content.replace(old_str, new_str)

content = content.replace(
    '<div style="font-weight:bold; color:#fff; font-size:1.1rem;"></div>',
    '<div style="font-weight:bold; color:#fff; font-size:1.1rem;">' + "'+date+'" + '</div>'
)

content = content.replace(
    '<div style="color:var(--text-secondary); font-size:0.85rem; margin-top:4px;"> ()</div>',
    '<div style="color:var(--text-secondary); font-size:0.85rem; margin-top:4px;">' + "'+name+' ('+ctv+')" + '</div>'
)

content = content.replace(
    '<div style="color:var(--primary); font-weight:bold; font-size:1.2rem;"></div>',
    '<div style="color:var(--primary); font-weight:bold; font-size:1.2rem;">' + "'+salary+'" + '</div>'
)

content = content.replace(
    '<span style="color:#fff; font-weight:500;"></span>',
    '<span style="color:#fff; font-weight:500;">' + "'+totalHours+'" + '</span>'
)

# Wait, the other spans also lost their variables because PowerShell evaluated ${...} as variables!
