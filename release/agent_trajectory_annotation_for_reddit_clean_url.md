# Steer, Don’t Rewrite: Annotate Agent Trajectories 2× Faster in Live Environments with onPanda

> **Dynamically connect to agent environments and annotate multi-turn SFT and preference data with `tool_calls` and `reasoning` online**

I built **onPanda**, a free and open-source agent annotation tool. Existing agent annotation tools (such as Potato and Argilla) mostly support assigning attributes or adding textual feedback to completed trajectories. However, editing trajectories to construct high-quality multi-turn agent SFT data presents two core challenges:

1. **Coupled environment state**: Agent trajectories alternate between tool calls (`tool_calls`) and environment feedback (`tool` messages). Once a tool call in a given turn is modified, the original subsequent trajectory is usually no longer valid—the corrected call must be executed in the real environment, and generation must continue from the new feedback.

2. **Complex output structure**: In the era of reasoning models and agents, a single model response contains not only `content`, but also lengthy `reasoning` chains and structured `tool_calls`. Annotators must understand and edit both the reasoning process and tool arguments, making manual rewriting costly and annotation UI design challenging.

**onPanda** is an open-source LLM alignment data annotation tool built around the paradigm of **correcting the generation process in real time** rather than rewriting outputs after the fact. onPanda dynamically connects to real agent runtime environments, allowing annotators to efficiently edit `reasoning`, `content`, and `tool_calls` at the token level and produce SFT, preference, and token-level supervision data with high on-policy fidelity through real environment interaction.

**Links (Live Demo & Video Demo inside the project page):**
- **Agent Trajectory Annotation Guide & Live Demo**: https://on-panda.github.io/agent-trajectory-annotation/
- **Source Code (GitHub)**: https://github.com/on-panda/on-panda
- **Paper (arXiv)**: https://arxiv.org/abs/2609.24983

---

## Annotation interface and interaction

In onPanda, while reading the model output, annotators simply **locate the first inappropriate token** and either select a replacement from the model's `top_logprobs` candidates or double-click to type a correction directly. onPanda then truncates everything after that position and lets the model continue generating from the corrected prefix:

[Insert Image 1: img/onPanda-token-level-correction.gif]

For multi-turn agent trajectories, onPanda seamlessly extends this "locate–correct–continue" loop to reasoning chains and tool calls:

[Insert Image 2: img/fig2_agent-v4.png]

As shown above, onPanda's agent annotation interface features three core mechanisms:

1. **Synchronized dual-view editing**: Through bidirectional conversion via the Response Template, annotators can click candidates or edit tokens directly in the structured `reasoning` and `tool_calls` panels on the right, or modify the model's native token stream on the left (even inserting special tokens such as `</think>` to truncate overly long reasoning).

2. **Pre-execution interception (Tool Call Control)**: Execution pauses before a tool modifies the environment. Annotators can fix `tool_calls` arguments before clicking **Run** to approve execution, or click **Reject** to decline the call (optionally with textual guidance so the model can replan).

3. **Automatic annotation tree branching** (`1~7` at the bottom): Every prefix edit or rejected tool call is automatically saved as a separate branch, naturally forming preference pairs under the exact same context prefix.

👉 **Interactive example**: You can inspect the `agent-annotate` trajectory directly in the live demo linked on the project page above to explore and test it yourself.

---

## Connect your own agent tools and environment

Annotating agent trajectories in onPanda relies on real environment feedback and supports two ways to connect the target environment:

1. **Native MCP integration**: onPanda natively supports MCP (Model Context Protocol). Any tool environment exposed as a Streamable HTTP MCP Server can be connected directly to the annotation workflow.

2. **Existing agent harness integration**: If your target environment is an existing agent framework (harness), the companion `harness_to_mcp` tool wraps the harness's internal tools and runtime environment into an MCP Server for onPanda. `harness_to_mcp` natively supports **Claude Code, Codex, and OpenCode**; to support another custom harness, a coding agent can quickly implement an adapter by referencing the existing ones.

To connect, simply specify the MCP server URL in `tool_configs` within your annotation data and set `"require_approval": "always"` to enable human interception and approval before tool execution:

```json
{
  "version": "2.0",
  "dialogs": {
    "1": {
      "messages": [{ "role": "user", "content": "What tools do you have available?" }],
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

Beyond environment integration, token-level correction requires an inference API that supports continuing generation from an assistant prefix (such as vLLM's `continue_final_message`), candidate selection relies on `top_logprobs`, and continuation within `reasoning` and `tool_calls` is handled automatically by built-in Response Templates (compatible with vLLM, SGLang, llama.cpp, and supported hosted APIs).

---

## Benefits of the token-level correction paradigm

Compared with traditional manual post-editing or multi-sample preference ranking, onPanda's token-level correction workflow offers several key advantages:

- **2× faster annotation**: Candidate selection and local edits steer model continuation without rewriting from scratch. In our controlled study, onPanda reduced median per-item annotation time by **52%** compared with manual post-editing.

- **SFT and preference data from a single workflow**: Final accepted responses and pre-correction/rejected branches are preserved automatically, constructing high-quality preference pairs under the exact same context prefix.

- **Fine-grained token-level supervision**: Every correction records the exact first-error position and paired positive/negative tokens, which can be used directly for fine-grained alignment or combined with task step boundaries to construct Process Reward data for PRM training.

- **High on-policy fidelity**: In real-world production deployment, **97.0% of tokens** in qualified responses are generated by the rollout model itself; in the controlled study, perplexity shift relative to the model's resampling baseline is **ΔPPL < 1%**, closely preserving the model's native distribution.

- **Significantly lower annotator workload**: In the user study, onPanda achieved an overall NASA-TLX workload score of **3.1** (substantially lower than 5.4 for preference ranking and 6.8 for manual post-editing), while token-probability color shading helps annotators quickly spot low-confidence tokens prone to errors.

- **Flexible custom attribute annotation**: Also supports turn-level and dialog-level custom rubric fields, including single-choice, multiple-choice, and free-text inputs.

Annotation results are saved in a single `.panda.json` file and can be exported into SFT, preference, and token-level correction training datasets using the companion Python library `onpanda`.

---

## Start your own agent annotation project

onPanda has been used in production to annotate hundreds of thousands of alignment data samples across vision, audio, and agent trajectory tasks. It can be used in two ways:

- **Out of the box**: Launch a local batch-annotation service with `npx @on-panda/annotate --dir {jsons dir}`, or deploy the onPanda web app via static hosting;

- **Embedded into existing platforms**: Built with a decoupled component architecture, onPanda's core annotation components can be imported as a frontend package into your team's existing annotation platform (with your platform backend handling task dispatching and collection).

Project page & documentation: [Efficient Agent Trajectory Annotation with onPanda](https://on-panda.github.io/agent-trajectory-annotation/)

Everything is self-hostable and open-source under MIT license. Happy to answer any technical questions!
