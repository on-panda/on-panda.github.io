# onPanda GitHub Pages

站点：<https://on-panda.github.io/research/>

## 一键构建

只需要 **Node.js 18+** 和 **make**，不需要 npm install、Chrome 扩展、Pandoc 或其他依赖；构建过程不访问网络。

```sh
make
```

也可以直接运行：

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

## Markdown 支持范围

[scripts/markdown.mjs](scripts/markdown.mjs) 是面向本站内容的轻量渲染器，不是完整 CommonMark 实现：

- 支持标题及稳定 ID、段落、粗体/斜体、内联代码、链接/图片、围栏代码块、有序/无序及嵌套列表、分割线、显式引用和简单 GFM 风格表格。
- 支持行尾两个空格或反斜杠换行。
- `<div>` 等容器内，以空行分隔即可继续写 Markdown；HTML 注释、脚本、iframe 及原始 HTML 内容保持原样。
- 不支持引用式链接、脚注、任务列表、缩进代码块、裸 URL 自动链接、LaTeX/MathJax 或完整的 CommonMark 边界规则。代码块输出语言 class，但不额外加载语法高亮 JavaScript。
- **仅用于仓库作者撰写的可信内容**：不会清洗 HTML，不要用它直接发布不可信用户输入。

## 检查

```sh
make test   # Node 内置测试：Markdown、元信息、SEO、站内资源链接
make check  # 先跑测试，再检查所有生成文件是否最新；不会改写产物
```

如果提示生成文件过期，先执行 `make` 再检查。产物是确定性的：输入不变时重复 `make` 不会改写文件或制造时间戳 diff。
