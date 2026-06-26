import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

old_span = '<span id="mainScheduleDateInput" style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: var(--primary); padding: 4px 10px; border-radius: 4px; font-weight: bold; font-family: monospace; font-size: 1.05rem; letter-spacing: 1px;"></span>'

new_span = old_span + '''
          <button id="btnCopySelected" style="display: none; margin-left: 15px; background: #28a745; color: white; border: none; padding: 4px 12px; border-radius: 4px; font-size: 0.85rem; font-weight: 600; cursor: pointer; align-items: center; gap: 5px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            Copy <span id="copySelectedCount">0</span> NV
          </button>'''

if old_span in html:
    html = html.replace(old_span, new_span)
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("Replaced index.html successfully")
else:
    print("Could not find old span in index.html")
