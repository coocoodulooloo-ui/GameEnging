// Combines the parts into one single-file app: ../index.html
const fs = require('fs'), path = require('path');
const r = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Doodle Studio</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎨</text></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>
${r('style.css')}
</style>
</head>
<body>
${r('body.html')}
<script id="engine-src">
${r('engine.js')}
</script>
<script>
${r('art.js')}
${r('app.js')}
${r('paint.js')}
${r('lessons.js')}
</script>
</body>
</html>
`;
if (/<\/script/i.test(r('app.js') + r('paint.js') + r('lessons.js') + r('art.js') + r('engine.js'))) throw new Error('a script contains </script');
const out = path.join(__dirname, '..', 'index.html');
fs.mkdirSync(path.dirname(out), { recursive:true });
fs.writeFileSync(out, html);
console.log('built', out, (html.length / 1024).toFixed(0) + ' KB');
