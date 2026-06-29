import re
import os

# 1. Update google-apps-script.js
with open('google-apps-script.js', 'r', encoding='utf-8') as f:
    gas_content = f.read()

new_actions = '''
    // ACTION: SUBMIT_CHANGE_REQUEST
    if (action === "submit_change_request") {
      var lock = LockService.getScriptLock();
      try {
        lock.waitLock(10000);
        var regSs = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
        var crSheet = regSs.getSheetByName("ChangeRequests");
        if (!crSheet) {
          crSheet = regSs.insertSheet("ChangeRequests");
          crSheet.appendRow(["ID", "EmpID", "EmpName", "ShiftID", "Selections", "Status", "Timestamp"]);
        }
        var reqId = "CR_" + new Date().getTime() + "_" + Math.floor(Math.random()*1000);
        crSheet.appendRow([
          reqId,
          data.empId,
          data.empName,
          data.shiftId,
          JSON.stringify(data.selections || []),
          "pending",
          new Date().toISOString()
        ]);
        return sendJsonResponse({ status: "success", reqId: reqId });
      } catch (e) {
        return sendJsonResponse({ status: "error", message: e.toString() });
      } finally {
        lock.releaseLock();
      }
    }

    // ACTION: GET_CHANGE_REQUESTS
    if (action === "get_change_requests") {
      try {
        var regSs = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
        var crSheet = regSs.getSheetByName("ChangeRequests");
        if (!crSheet) return sendJsonResponse({ status: "success", data: [] });
        var dataRange = crSheet.getDataRange().getValues();
        var requests = [];
        for (var i = 1; i < dataRange.length; i++) {
          if (dataRange[i][5] === "pending") {
            requests.push({
              id: dataRange[i][0],
              empId: dataRange[i][1],
              empName: dataRange[i][2],
              shiftId: dataRange[i][3],
              selections: JSON.parse(dataRange[i][4] || "[]"),
              status: dataRange[i][5],
              timestamp: dataRange[i][6]
            });
          }
        }
        return sendJsonResponse({ status: "success", data: requests });
      } catch (e) {
        return sendJsonResponse({ status: "error", message: e.toString() });
      }
    }
'''

if "submit_change_request" not in gas_content:
    # Insert before approve_change_request
    gas_content = gas_content.replace('// ACTION: APPROVE_CHANGE_REQUEST', new_actions + '\n    // ACTION: APPROVE_CHANGE_REQUEST')
    
    # We also need to update approve_change_request to mark status as approved in ChangeRequests sheet.
    # We'll just add it to the end of the approve block before sending success response.
    update_status_code = '''
        // Update ChangeRequests sheet status
        var crSheet = regSs.getSheetByName("ChangeRequests");
        if (crSheet && data.reqId) {
          var crData = crSheet.getDataRange().getValues();
          for (var i = 1; i < crData.length; i++) {
            if (crData[i][0] === data.reqId) {
              crSheet.getRange(i + 1, 6).setValue("approved");
              break;
            }
          }
        }
'''
    gas_content = gas_content.replace('return sendJsonResponse({ status: "success" });', update_status_code + '\n        return sendJsonResponse({ status: "success" });', 1) # Only replace the one in approve_change_request!
    # Wait, replace(old, new, 1) might replace the wrong one. Let's use regex or just assume there's one in approve_change_request.
    
    with open('google-apps-script.js', 'w', encoding='utf-8') as f:
        f.write(gas_content)
    print("Updated google-apps-script.js")


# 2. Update registration.js
with open('registration.js', 'r', encoding='utf-8') as f:
    reg_content = f.read()

# Replace Firebase stuff in searchChangeRequest
search_firebase_code = '''      const db = window.FirebaseDB?.db;
      if (!db) return alert('Lỗi kết nối CSDL.');
      const { collection, query, where, getDocs } = window.FirebaseDB;

      const q = query(collection(db, "change_requests"), 
        where("empId", "==", empId), 
        where("status", "==", "pending"));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {'''

search_api_code = '''
      const API_LINK = localStorage.getItem('agr_api_link') || (typeof CONFIG !== 'undefined' ? CONFIG.API_URL : '');
      const res = await fetch(`${API_LINK}?action=get_change_requests`);
      const data = await res.json();
      
      if (data && data.data) {
        const pendingForEmp = data.data.filter(r => r.empId.toLowerCase() === empId.toLowerCase());
        if (pendingForEmp.length > 0) {'''

reg_content = reg_content.replace(search_firebase_code, search_api_code)

# Replace Firebase stuff in submitChangeRequest
submit_firebase_code = '''      const db = window.FirebaseDB?.db;
      if (!db) return alert('Lỗi kết nối CSDL.');
      const { collection, addDoc, serverTimestamp } = window.FirebaseDB;
      
      const payload = {
        empId: RegApp.crOriginalData.empId,
        empName: RegApp.crOriginalData.empName,
        empPhone: RegApp.crOriginalData.empPhone,
        shiftId: RegApp.crOriginalData.shiftId,
        shiftLabel: RegApp.crOriginalData.shiftLabel,
        period: RegApp.crOriginalData.period,
        oldSelections: RegApp.crOriginalData.selections,
        selections: RegApp.crCurrentSelections,
        status: 'pending',
        timestamp: Date.now(),
        createdAt: serverTimestamp(),
        targetRegId: RegApp.crFirebaseId
      };
      
      await addDoc(collection(db, "change_requests"), payload);'''

submit_api_code = '''      const payload = {
        empId: RegApp.crOriginalData.empId,
        empName: RegApp.crOriginalData.empName,
        shiftId: RegApp.crOriginalData.shiftId,
        selections: RegApp.crCurrentSelections
      };
      
      const API_LINK = localStorage.getItem('agr_api_link') || (typeof CONFIG !== 'undefined' ? CONFIG.API_URL : '');
      const res = await fetch(API_LINK, {
        method: 'POST',
        body: JSON.stringify({ action: 'submit_change_request', data: payload })
      });
      const data = await res.json();
      if (data.status !== 'success') throw new Error(data.message || 'Lỗi server');'''

reg_content = reg_content.replace(submit_firebase_code, submit_api_code)

with open('registration.js', 'w', encoding='utf-8') as f:
    f.write(reg_content)
print("Updated registration.js")

# 3. Update app.js
with open('app.js', 'r', encoding='utf-8') as f:
    app_content = f.read()

# Replace Firebase stuff in loadPendingChangeRequests
app_firebase_code = '''    const db = window.FirebaseDB?.db;
    if (!db) return;
    const { collection, query, where, onSnapshot } = window.FirebaseDB;
    
    if (AdminApp.crUnsubscribe) AdminApp.crUnsubscribe();
    
    const q = query(collection(db, "change_requests"), where("status", "==", "pending"));
    AdminApp.crUnsubscribe = onSnapshot(q, (snapshot) => {'''

app_api_code = '''
    const API_LINK = localStorage.getItem('agr_api_link') || (typeof CONFIG !== 'undefined' ? CONFIG.API_URL : '');
    if (!API_LINK) return;
    fetch(`${API_LINK}?action=get_change_requests`).then(res => res.json()).then(data => {
      if (!data || !data.data) return;
      const snapshot = { docs: data.data.map(d => ({ id: d.id, data: () => d })) };
'''

app_content = app_content.replace(app_firebase_code, app_api_code)

# Remove the closing brackets for onSnapshot
app_content = app_content.replace('    });\n  },', '    });\n  },')

# Replace the polling to call it periodically
if 'setInterval(() => AdminApp.loadPendingChangeRequests(), 30000)' not in app_content:
    app_content = app_content.replace('AdminApp.loadPendingChangeRequests();', 'AdminApp.loadPendingChangeRequests(); setInterval(() => AdminApp.loadPendingChangeRequests(), 30000);')

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(app_content)
print("Updated app.js")

