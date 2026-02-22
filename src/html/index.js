import { CSS }      from './styles.js';
import { HTML_BODY } from './body.js';
import { APP_JS }    from './app.js';

export function getHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="ASM Roster">
<meta name="theme-color" content="#0a0a0f">
<title>ASM 2026 · Worship Grow Go</title>
<link rel="manifest" href="/manifest.json">
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<div class="bg-glow"></div>
${HTML_BODY}
<script>${APP_JS}</script>
</body>
</html>`;
}
