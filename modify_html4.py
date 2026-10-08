with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Add radio button for "Dư về"
import re
content = re.sub(
    r'(<input type="radio" name="itemReqType" value="Đổi Thẻ" onchange="ItemRequestModule.toggleFields\(\)"> Đổi Thẻ\s*</label>)',
    r'\1\n                <label style="cursor:pointer; display:flex; align-items:center; gap:6px;">\n                  <input type="radio" name="itemReqType" value="Dư về" onchange="ItemRequestModule.toggleFields()"> Dư về\n                </label>',
    content
)

# Add a separate Date field for Dư Về, or just use the same one and change the label via JS. 
# It's better to change label text via JS. I will give the label an ID.
content = re.sub(
    r'<label class="form-label" for="itemReqDate">Ngày Lấy <span class="required-star">\*</span></label>',
    r'<label class="form-label" id="itemReqDateLabel" for="itemReqDate">Ngày Lấy <span class="required-star">*</span></label>',
    content
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated index.html")
