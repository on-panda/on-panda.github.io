# onPanda：在真实环境中标注 Agent 轨迹，效率翻倍！同步产出 On-Policy SFT 与偏好数据

<!-- **告别事后重写：动态接入 MCP 与 Agent 运行环境，以 Token 级精度实时修正并引导多轮 `reasoning` 与 `tool_calls` 生成** -->

现有的 Agent 标注工具（如 [Potato](https://github.com/davidjurgens/potato)、[Argilla](https://github.com/argilla-io/argilla) 等）大多支持对已完成的固定轨迹进行属性打标或添加文字反馈；但若要进一步修改轨迹、构造高质量的多轮 Agent SFT 数据，则面临两个核心难点：

1. **环境状态耦合**：Agent 轨迹由工具调用（`tool_calls`）和环境反馈（`tool` 消息）交替组成。一旦修改某一轮的工具调用，原有的后续轨迹通常不再适用，必须在真实环境中执行修正后的调用，并基于新的环境反馈继续生成后续轨迹。
2. **输出结构复杂**：在 Reasoning 与 Agent 时代，模型单轮输出不仅包含 `content`，还包含冗长的思维链 `reasoning` 以及结构化的 `tool_calls`。这要求标注员同时理解和修改推理过程与工具参数，人工重写成本极高，标注界面的交互设计也变得棘手。

[**onPanda**](https://github.com/on-panda/on-panda)（[论文主页](https://on-panda.github.io/research/)）作为开源的 LLM 对齐数据标注工具，提出了「**在生成过程中实时纠错**」而非「事后重写结果」的标注范式。onPanda 支持动态接入现有 Agent 的真实运行环境，让标注员以 token 级精度修正模型响应中的 `reasoning`、`content` 和 `tool_calls` 并引导模型续写——**在实现标注效率翻倍的同时**，于真实环境交互中同步产出高 On-Policy 保真度的 SFT、Preference 及 Token-level 监督数据。

🎬 观看 onPanda 实际标注 Agent 轨迹数据的[录屏演示（从 00:52 开始）](https://www.bilibili.com/video/BV1vpJ26kEef/?t=52)

**更多资源：[在线 Demo 🎮](https://onpanda.diyer22.com/?example=agent-annotate) | [视频演示 ▶️](https://www.bilibili.com/video/BV1vpJ26kEef/) | [技术论文 📄](https://arxiv.org/abs/2609.24983) | [开源代码 👨‍💻](https://github.com/on-panda/on-panda)**

## 标注界面与交互机制展示

在 onPanda 中，标注员阅读模型输出时只需**定位首个不恰当的 token**，从模型自带的 `top_logprobs` 候选中点选替代项，或双击直接输入修正文本；onPanda 随即截断该位置之后的内容，让模型基于修正后的前缀继续生成：

![onPanda 的 token 级纠错交互：悬停选词与前缀续写](https://on-panda.github.io/img/onPanda-token-level-correction.gif)

针对多轮 Agent 轨迹，onPanda 将这一「定位—修正—续写」循环无缝扩展到了思维链与工具调用中：

![使用 onPanda 标注 Agent 轨迹的界面](https://on-panda.github.io/img/fig2_agent-v4.png)

如上图所示，onPanda 的 Agent 标注界面包含三个核心机制：

1. **双视图同步可编辑**：通过 Response Template 双向转换，标注员既可以在右侧结构化的 `reasoning` 和 `tool_calls` 面板中直接点选/编辑 token，也可以在左侧模型原生 token 流中修改（甚至直接插入 `</think>` 等特殊 token 截断冗长思考）。
2. **工具执行前拦截（Tool Call Control）**：在工具真正改变环境前暂停，标注员可先修正 `tool_calls` 参数再点击 **Run** 批准执行，或点击 **Reject** 拒绝调用（可附带文字引导让模型重新规划）。
3. **自动构建标注树分支（底部 `1~7`）**：每次修改前缀或拒绝工具调用都会自动保存为独立分支，修正前后的分支天然构成相同上下文下的 Preference 偏好对。

👉 **立即体验**：访问[在线 Demo](https://onpanda.diyer22.com/?example=agent-annotate) 的 `agent-annotate` 例子进行实际体验和测试。Demo 拥有移动端友好的 UI，手机上也能完整体验。

## 接入你自己的 Agent 工具和运行环境

onPanda 标注 Agent 轨迹依赖真实的环境反馈，支持通过两种方式接入目标环境：

1. **原生 MCP 协议接入**：onPanda 原生支持 MCP（Model Context Protocol），任何暴露为 Streamable HTTP MCP Server 的工具环境均可直接接入标注流程。
2. **现有 Agent Harness 接入**：若目标环境是一个现成的 Agent 框架（Harness），可通过配套的 [**harness_to_mcp**](https://github.com/on-panda/harness_to_mcp) 工具，将 Harness 内部的工具和运行环境包装成 MCP Server 接入 onPanda。
    - `harness_to_mcp` 已原生支持 **Claude Code、Codex、OpenCode**；若需适配其他自定义 Harness，可让 Coding Agent 参考现有适配器快速完成接入。

接入时，只需在待标注数据的 `tool_configs` 中填入 MCP 地址，并开启 `"require_approval": "always"` 即可激活人工拦截审批（详见 [`.panda.json` 数据格式规范](https://github.com/on-panda/on-panda-docs/blob/main/content/zh-cn/panda_json_format.md)）：

```json
{
  "version": "2.0",
  "dialogs": {
    "1": {
      "messages": [{ "role": "user", "content": "你有哪些可以调用的工具？" }],
      "tool_configs": [
        {
          "type": "mcp",
          "server_url": "http://127.0.0.1:9330/mcp",
          "server_label": "claude-code",
          "require_approval": "always"
        }
      ]
    }
  }
}
```

环境接入之外，Token-level Correction 还需要推理 API 支持从 assistant 前缀继续生成（如 vLLM 的 `continue_final_message`），候选点选依赖 `top_logprobs`，对 `reasoning` 和 `tool_calls` 的续写则由内置的 Response Template 自动处理。主流推理框架（vLLM、SGLang、llama.cpp）及多家在线 API 的支持列表详见 [API 兼容性说明](https://github.com/on-panda/on-panda-docs/blob/main/content/zh-cn/API_compatibility.md)。

## 标注范式革新带来多重优势

相比传统的事后人工重写（Post-editing）或多采样偏好排序（Preference Ranking），onPanda 的 Token-level Correction 范式具备显著优势：

- **标注效率翻倍**：通过候选点选和局部编辑引导模型续写，避免通篇重写。受控实验表明，onPanda 单题标注耗时中位数较人工后编辑**降低 52%**。
- **一次标注同时产出 SFT 与 Preference 数据**：自动保留最终合格回答及修正/拒绝前的历史分支，在完全相同的上下文前缀下构造高质量偏好对。
- **细粒度 Token-level 监督信号**：精确记录每次修正的首错位置与正负替代 token，既可直接用于细粒度对齐训练，也可结合任务的 step 边界构造 Process Reward 数据（用于 PRM 训练）。
- **极高的 On-Policy 保真度**：生产环境统计中，合格回答里 **97.0% 的 tokens 由 rollout 模型自身生成**；受控实验中产出数据的困惑度相对模型重采样基线偏移 **ΔPPL < 1%**，最大程度保留模型原有分布。
- **显著降低标注员认知负担**：用户研究显示，onPanda 的 NASA-TLX 综合工作负荷评分仅为 **3.1**（显著低于偏好排序的 5.4 与人工后编辑的 6.8），token 概率染色还能辅助标注员快速定位模型不自信的潜在错误点。
- **灵活的自定义属性标注**：同样支持 Turn-level / Dialog-level 的单选、多选、文本等自定义 Rubric 评价项。

标注结果统一保存为单文件 `.panda.json`，可通过配套 [Python 库 `onpanda`](https://github.com/on-panda/on-panda-python) 一键解析导出 SFT、Preference 和 Token-level Correction 训练数据（另见 [Panda-CVL 数据集和 benchmark](https://on-panda.github.io/Panda-CVL/)）。完整的受控实验设计与数据分析欢迎查阅我们的论文：[onPanda: Efficient Annotation of On-Policy Alignment Data for LLMs and Agents via Token-Level Correction](https://arxiv.org/abs/2609.24983)。

## 开始你自己的 Agent 标注任务

onPanda 已在阶跃星辰内部生产了数十万条对齐数据，覆盖图像、音频和 Agent 轨迹等任务。有两种使用方法：

- **开箱即用**：可通过 [`@on-panda/annotate`](https://github.com/on-panda/on-panda/tree/main/packages/annotate)（`npx @on-panda/annotate --dir {jsons dir}`）在本地一键启动批量标注服务，或直接静态托管部署 [onPanda Web 应用](https://github.com/on-panda/on-panda)；
- **嵌入现有平台**：onPanda 采用高度解耦的组件化设计，核心标注组件可直接作为前端包导入并嵌入团队现有的数据标注平台（由平台后端负责任务分发与回收），具体用法参见 [onPanda Integration Examples](https://github.com/on-panda/on-panda/tree/main/apps/integration-example)。

项目介绍页：[使用 onPanda 高效地标注 Agent 轨迹数据](https://on-panda.github.io/agent-trajectory-annotation/)
