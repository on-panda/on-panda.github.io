# onPanda GitHub Pages

https://on-panda.github.io/research


### Features
- Write in markdown with HTML supported
- Responsive Web Design for mobile device
- [Open Graph](https://www.opengraph.xyz/url/https%3A%2F%2Fon-panda.github.io%2Fresearch) for sharing with detial info
- [Google Analytics](https://analytics.google.com/) for statisticing visits

### How to render `.md` to `.html` and release to github page

1. Install `Markdown Viewer` extension in Chrome, and allow `Markdown Viewer` to access local file in Chrome setting

2. Press F12 , and click Elements tab in debug panel. Right click on `<html><h....` , click `edit As HTML`, copy the raw HTML code

3. Paste HTML code in `./research/index.html`, remove all `chrome-extension://.../`, e.g. `href="chrome-extension://.../github.css"` to `href="../themes/github.css"`

4. `git add *;git commit;git push`

### How to apply update from `.md` to `.html`

1. Press F12 in chrome and click Elements tab in debug panel. Right click on `<body><h1....` , click `edit As HTML`, copy the raw HTML code

2. Replace body in `research/index.html`, remove all `chrome-extension://.../`.

3. `git add *;git commit -m 'update';git push`
