import os
import re

with open('registration.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Add spinner to searchChangeRequest
old_search_start = """  searchChangeRequest: async () => {
    const empId = document.getElementById('crEmpId').value.trim().toLowerCase();
    const shiftId = RegApp.crSelectedShift;
    if (!empId) return alert('Vui lòng nhập Mã nhân viên!');
    
    try {
      const API_LINK = localStorage.getItem('agr_api_link') || (typeof CONFIG !== 'undefined' ? CONFIG.API_URL : '');
      if (!API_LINK) return alert('Lỗi kết nối máy chủ!');"""

new_search_start = """  searchChangeRequest: async () => {
    const empId = document.getElementById('crEmpId').value.trim().toLowerCase();
    const shiftId = RegApp.crSelectedShift;
    if (!empId) return alert('Vui lòng nhập Mã nhân viên!');
    
    const searchBtn = document.querySelector('button[onclick="RegApp.searchChangeRequest()"]');
    if (searchBtn) {
      searchBtn.disabled = true;
      searchBtn.innerHTML = '<svg class="spinner" width="16" height="16" viewBox="0 0 50 50" style="vertical-align:middle; margin-right:5px;"><circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="5" stroke-dasharray="31.4 1000" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite"/></circle></svg> Đang tra cứu...';
    }
    
    try {
      const API_LINK = localStorage.getItem('agr_api_link') || (typeof CONFIG !== 'undefined' ? CONFIG.API_URL : '');
      if (!API_LINK) throw new Error('Lỗi kết nối máy chủ!');"""

content = content.replace(old_search_start, new_search_start)

old_search_catch = """    } catch (e) {
      console.error(e);
      alert('Lỗi tra cứu: ' + e.message);
    }
  },"""

new_search_catch = """    } catch (e) {
      console.error(e);
      alert('Lỗi tra cứu: ' + e.message);
    } finally {
      if (searchBtn) {
        searchBtn.disabled = false;
        searchBtn.innerHTML = '🔍 Tra cứu lịch';
      }
    }
  },"""

content = content.replace(old_search_catch, new_search_catch)

with open('registration.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Added spinner to searchChangeRequest")
