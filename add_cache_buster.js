const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');
const v = '?v=' + Date.now();
content = content.replace(/src="js\/([^"]+)\.js(\?v=\d+)?"/g, 'src="js/$1.js' + v + '"');
content = content.replace(/href="css\/([^"]+)\.css(\?v=\d+)?"/g, 'href="css/$1.css' + v + '"');
fs.writeFileSync('index.html', content);
