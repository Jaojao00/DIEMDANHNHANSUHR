const fs = require('fs');
const files = ['backend/handlers.js', 'backend/main.js', 'backend/triggers.js'];
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/06:00-10:00/g, '06:00-11:00');
    content = content.replace(/15:00-22:00/g, '13:00-22:00');
    fs.writeFileSync(f, content, 'utf8');
    console.log('Updated ' + f);
});
