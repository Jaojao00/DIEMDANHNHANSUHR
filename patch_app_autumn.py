import re
with open("app.js", "r", encoding="utf-8") as f:
    content = f.read()

autumn_logic = """
// ------------------------------------------------------------------
// AUTUMN THEME DYNAMIC LOGIC
// ------------------------------------------------------------------
(function initAutumnTheme() {
    const banner = document.getElementById('dynamicBanner');
    if (!banner) return;
    
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const year = now.getFullYear();
    
    let subtitle = "HÀNH TRÌNH MỚI";
    let title = `THÁNG ${month}/${year}`;
    let message = "Chúc bạn một ngày làm việc tràn đầy năng lượng và hiệu quả!";
    
    if (month === 10) {
        subtitle = "🍂 AUTUMN GOLD 🍂";
    } else if (month === 11) {
        subtitle = "🍁 LATE AUTUMN 🍁";
        // Optionally add a slight style change for November
        banner.style.background = "linear-gradient(135deg, rgba(10, 15, 29, 0.5) 0%, rgba(200, 150, 50, 0.15) 100%)";
    }
    
    banner.innerHTML = `
        <div style="font-size: 0.85rem; font-weight: 700; color: #FFD75A; margin-bottom: 6px; letter-spacing: 1px; text-transform: uppercase;">${subtitle}</div>
        <h2 style="font-size: clamp(1.8rem, 6vw, 2.4rem); letter-spacing: 1px; line-height: 1.2; text-transform: uppercase; margin-bottom: 10px; color: #fff;">${title}</h2>
        <p style="font-size: 0.9rem; line-height: 1.4; color: #eee;">${message}</p>
    `;
    
    // Falling leaves animation
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const leafChars = ['🍂', '🍁', '🍃'];
        const numLeaves = 15; // Limit number of elements
        
        for (let i = 0; i < numLeaves; i++) {
            setTimeout(() => {
                const leaf = document.createElement('div');
                leaf.className = 'autumn-leaf';
                leaf.innerText = leafChars[Math.floor(Math.random() * leafChars.length)];
                
                // Random position & animation
                leaf.style.left = Math.random() * 100 + 'vw';
                const duration = 10 + Math.random() * 15; // 10-25s
                const delay = Math.random() * 10;
                leaf.style.animationDuration = `${duration}s`;
                leaf.style.animationDelay = `${delay}s`;
                
                document.body.appendChild(leaf);
            }, i * 300);
        }
    }
})();
"""

if "initAutumnTheme" not in content:
    content += "\n" + autumn_logic

with open("app.js", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated app.js with Autumn logic")
