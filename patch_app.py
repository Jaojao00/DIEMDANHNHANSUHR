with open("app.js", "r", encoding="utf-8") as f:
    content = f.read()

# Append the button to the HTML string after the table ends
# The table ends at:
#                           </tbody>
#                       </table>
#                   </div>

table_end = """                        </tbody>
                    </table>
                </div>"""

# Ensure we do not add it multiple times
if "Gửi Phiếu Khiếu Nại" not in content:
    new_html = """                        </tbody>
                    </table>
                </div>
                
                <div style="text-align: center; margin-top: 25px; padding-bottom: 20px;">
                    <button class="btn btn-outline" style="width: 100%; max-width: 350px; background: rgba(230, 60, 30, 0.1); border-color: #E63C1E; color: #E63C1E;" onclick="window.openComplaintModal()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px; vertical-align:middle;">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            <path d="M12 8v4"/>
                            <path d="M12 16h.01"/>
                        </svg>
                        Gửi Phiếu Khiếu Nại
                    </button>
                </div>"""
    content = content.replace(table_end, new_html, 1)
    print("Injected button")

# Add the JS logic at the end of app.js
if "function openComplaintModal" not in content:
    logic = """
window.openComplaintModal = function() {
    const modal = document.getElementById('complaintModal');
    if (modal) modal.classList.remove('hidden');
}

window.closeComplaintModal = function() {
    const modal = document.getElementById('complaintModal');
    if (modal) {
        modal.classList.add('hidden');
        document.getElementById('compType').value = 'Thiếu ngày công';
        document.getElementById('compDesc').value = '';
        document.getElementById('compImage').value = '';
    }
}

window.submitComplaint = async function() {
    const type = document.getElementById('compType').value;
    const content = document.getElementById('compDesc').value;
    const fileInput = document.getElementById('compImage');
    const empId = document.getElementById('salaryEmpId').value.trim();
    
    if (!content) {
        Swal.fire({ title: "Thiếu thông tin", text: "Vui lòng nhập nội dung chi tiết!", icon: "warning", background: "var(--surface)", color: "var(--text)"});
        return;
    }
    
    // Resize image logic
    let base64 = "";
    let mime = "";
    let filename = "";
    
    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        mime = file.type;
        filename = file.name;
        
        // Return a promise that resolves with the base64 string
        const getBase64 = (file) => new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const img = new Image();
                img.src = reader.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1200;
                    const MAX_HEIGHT = 1200;
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL(mime, 0.7)); // Compress to 70%
                };
            };
        });
        
        try {
            Swal.fire({
                title: "Đang xử lý ảnh...",
                allowOutsideClick: false,
                background: "var(--surface)", color: "var(--text)",
                didOpen: () => Swal.showLoading()
            });
            const dataUrl = await getBase64(file);
            base64 = dataUrl.split(',')[1];
        } catch(e) {
            console.error(e);
        }
    }
    
    Swal.fire({
        title: "Đang gửi phiếu...",
        text: "Vui lòng chờ giây lát",
        allowOutsideClick: false,
        background: "var(--surface)", color: "var(--text)",
        didOpen: () => Swal.showLoading()
    });
    
    const payload = {
        action: 'submit_complaint',
        empId: empId,
        empName: window._currentEmpName || 'Không rõ',
        type: type,
        content: content,
        imageBase64: base64,
        imageMimeType: mime,
        imageFilename: filename
    };
    
    try {
        let urlToUse = (typeof State !== 'undefined' && State.apiLink) ? State.apiLink : (typeof CONFIG !== 'undefined' ? CONFIG.APPS_SCRIPT_URL : '');
        const res = await fetch(urlToUse, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        
        if (result.success) {
            Swal.fire({
                title: "Thành công!",
                text: "Đã gửi phiếu khiếu nại. Quản lý sẽ kiểm tra và phản hồi lại.",
                icon: "success",
                background: "var(--surface)", color: "var(--text)"
            });
            window.closeComplaintModal();
        } else {
            throw new Error(result.error || "Có lỗi xảy ra");
        }
    } catch (error) {
        Swal.fire({
            title: "Lỗi",
            text: error.message || "Không thể gửi. Vui lòng thử lại sau.",
            icon: "error",
            background: "var(--surface)", color: "var(--text)"
        });
    }
}
"""
    content += "\n" + logic

# Also inject window._currentEmpName so we know who is sending
content = content.replace(
    "const empName = firstRec['H? Tn'] || firstRec['H? v Tn'] || 'Khng ro';",
    "const empName = firstRec['H? Tn'] || firstRec['H? v Tn'] || 'Khng ro';\n              window._currentEmpName = empName;"
)
# Make sure we don't duplicate it. Let's just blindly replace it once.

with open("app.js", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated app.js")
