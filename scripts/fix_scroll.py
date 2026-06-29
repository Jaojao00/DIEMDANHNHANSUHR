import os

with open('style.css', 'r', encoding='utf-8') as f:
    css = f.read()

old_block = '''.reg-table-wrap {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-bottom: 20px;
}'''

new_block = '''.reg-table-wrap {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow-x: auto;
  overflow-y: hidden;
  margin-bottom: 20px;
}'''

if old_block in css:
    css = css.replace(old_block, new_block)
    with open('style.css', 'w', encoding='utf-8') as f:
        f.write(css)
    print("Fixed style.css")
else:
    print("Block not found in style.css. Let's try replacing just the overflow part.")
    import re
    css = re.sub(r'\.reg-table-wrap\s*\{([^}]+)overflow:\s*hidden;', r'.reg-table-wrap {\g<1>overflow-x: auto; overflow-y: hidden;', css)
    with open('style.css', 'w', encoding='utf-8') as f:
        f.write(css)
    print("Fixed style.css with regex")

