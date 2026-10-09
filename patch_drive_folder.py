with open("backend/handlers.js", "r", encoding="utf-8") as f:
    content = f.read()

old_code = """        try {
          var folderIterator = DriveApp.getFoldersByName("KhieuNaiImages");
          var folder;
          if (folderIterator.hasNext()) {
            folder = folderIterator.next();
          } else {
            folder = DriveApp.createFolder("KhieuNaiImages");
            folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          }"""

new_code = """        try {
          // Luu vao thu muc Google Drive chi dinh
          var folder = DriveApp.getFolderById("18JlzPq70UtlMv0LijpvoftCiQ_qLkpgu");"""

if old_code in content:
    content = content.replace(old_code, new_code)
    with open("backend/handlers.js", "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated handlers.js with specific Folder ID")
else:
    print("Could not find the old code to replace.")
