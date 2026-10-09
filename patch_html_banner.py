import re
with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

# First, let's fix the botched replacement by grabbing everything between <div class="emp-welcome"> and <div class="shift-cards"
welcome_start = '<div class="emp-welcome">'
cards_start = '<div class="shift-cards" id="shiftCards">'

new_welcome = """<div class="emp-welcome">
            <div class="emp-welcome-icon" style="font-size: 2rem; margin-bottom: 5px;">👋</div>
            <h1>Xin chào!</h1>
            <p>Chọn ca làm việc của bạn để bắt đầu điểm danh</p>
          </div>
          
          <!-- Autumn Banner -->
          <div class="autumn-banner" id="dynamicBanner">
            <!-- Rendered by JS -->
          </div>

          """

# Perform replacement
content = re.sub(r'<div class="emp-welcome">[\s\S]*?<div class="shift-cards" id="shiftCards">', new_welcome + '<div class="shift-cards" id="shiftCards">', content)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed banner replacement")
