# onPanda GitHub Pages

站点：<https://on-panda.github.io/research/>

## 一键构建

需要 **Node.js 18+（含 npm）** 和 **make**。首次 `make` 会通过 `npm ci` 自动安装锁定版本的 Markdown Viewer 渲染依赖；之后输入不变就不会重新安装。无需浏览器扩展、Python 或 Pandoc，安装完成后的编译不访问网络。

```sh
make
```

依赖安装完成后，也可以直接运行：

```sh
node scripts/build.mjs
```

构建器会递归发现站点目录下的 `index.md`，生成同目录的 `index.html`。目前包括：

- [research](research/index.md)：论文与项目介绍。
- [Panda-CVL](Panda-CVL/index.md)：数据集与 benchmark。
- [agent-trajectory-annotation](agent-trajectory-annotation/index.md)：Agent 轨迹标注指南。

同时生成：

- [首页](index.html)：保留跳转到 `/research/` 的行为。
- [sitemap.xml](sitemap.xml)：可索引内容页的规范 URL，不收录首页或 introduction 等重定向，不伪造修改时间。
- [robots.txt](robots.txt)：允许抓取并声明 sitemap 位置。
- [llms.txt](llms.txt)：站点说明、页面和 Markdown 源文件入口、项目资源。

[README](README.md)、图片目录里的 tweet 草稿和其他非 `index.md` 文件不会被编译。隐藏目录、`node_modules`、`scripts` 和 `templates` 也会跳过。[introduction 的独立跳转](introduction/index.html)保持不变。

## 编辑和新增页面

1. 编辑相应的 Markdown，**不要直接编辑生成的 HTML**。
2. 页面开头保留一个 `<head>...</head>`，至少提供标题和描述：

   ```html
   <head>
     <title>Page title</title>
     <meta name="description" content="A short description of this page.">
   </head>
   ```

3. 在 `</head>` 后正常写 Markdown，也可以保留图片、视频、居中容器等内嵌 HTML。
4. 执行 `make`，然后执行 `make check` 验证。
5. 将 Markdown、构建脚本/模板和生成的 HTML、SEO 文件一同提交、推送到 GitHub Pages 使用的分支。

新增页面只需创建新目录及其中的 `index.md`，不需要手工登记页面列表。新页也会进入 sitemap 和 llms；`robots` 中带 `noindex` 或 `none` 的页面不进入这两个文件。删除页面时，应一并删除旧的生成 HTML；构建器不会自动删除其他文件。

## 模板、样式与元信息

- [templates/page.html](templates/page.html) 是所有内容页共用的 HTML 模板，统一布局样式直接放在模板里，不再复制到 Markdown。
- 直接引用已有的 [GitHub CSS](research/themes/github.css) 和 [Prism CSS](research/vendor/prism.min.css)，不下载、不重写这些资源。保留白底、边框、1024px 最大内容宽度、45px 内边距和原有标题锚点；窄屏下缩小内边距，视频宽度随容器调整。
- 正文中的局部 `style` 属性（图像尺寸等）仍可使用。Markdown 中的 Google Analytics 脚本和 iframe 保留；这些第三方资源只在访问页面时加载，构建不需要它们。
- 编译器从 Markdown 提取 `<head>`，把标题和 meta 放入真正的 HTML `<head>`，补齐 canonical、Open Graph、Twitter Card、JSON-LD WebPage、图标和 Markdown 源文件入口。
- 标题、描述、关键词和自定义分享文案仍以 Markdown 为准。canonical、`og:url`、`twitter:url` 按页面路径统一生成带末尾 `/` 的地址，避免重复或错位。
- 站点域名在 [scripts/build.mjs](scripts/build.mjs) 的 `SITE_URL` 中配置；首页跳转模板为 [templates/redirect.html](templates/redirect.html)。

## 渲染技术栈

不自行实现 Markdown 语法。[scripts/markdown.mjs](scripts/markdown.mjs) 只负责配置上游库和接入代码高亮，采用 Markdown Viewer 官方支持的 **Marked** 编译链路：

- `marked@12.0.1`：Markdown / GFM；`gfm: true`、`breaks: false`、`pedantic: false`，保留作者 HTML。
- `marked-gfm-heading-id@3.1.3`：GitHub 风格的标题 ID，与旧页面锚点兼容。
- `marked-linkify-it@3.1.9`：自动识别链接；不启用 smartypants，避免改变论文标点。
- `prismjs@1.29.0`：构建时生成语法高亮 token，复用原有 Prism CSS，不需要浏览器再次执行高亮脚本。

版本和配置对应 Markdown Viewer 的 [Marked 依赖](https://github.com/simov/markdown-viewer/blob/main/build/marked/package.json)、[编译器配置](https://github.com/simov/markdown-viewer/blob/main/background/compilers/marked.js) 和 [Prism 依赖](https://github.com/simov/markdown-viewer/blob/main/build/prism/package.json)。Markdown Viewer 可选择多种编译器；这里固定使用 Marked，避免不同环境产生不同结果。

依赖版本由 [package.json](package.json) 和 [package-lock.json](package-lock.json) 固定。Markdown、GFM 表格、列表、引用式链接、代码块等行为直接交给上游库；当前页面不含公式或 Mermaid 图，未额外引入这些可选渲染器。

**仅用于仓库作者撰写的可信内容**：保留 HTML 和脚本，不要直接发布不可信用户输入。

## 检查

```sh
make test   # Node 内置测试：Markdown、元信息、SEO、站内资源链接
make check  # 先跑测试，再检查所有生成文件是否最新；不会改写产物
```

如果提示生成文件过期，先执行 `make` 再检查。产物是确定性的：输入不变时重复 `make` 不会改写文件或制造时间戳 diff。
