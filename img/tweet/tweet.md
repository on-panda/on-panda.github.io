https://x.com/diyerxx/status/2101020854922416131

I spent two years building this interactive tool to let you **steer LLMs and agents at the token level**.

Introducing onPanda — a web app for token visualization & control, model inspection, data annotation, and more.

Try it online (works on mobile): https://onpanda.diyer22.com/


-----

2. onPanda is fully open source on GitHub: https://github.com/on-panda/on-panda

And supports one-click self-hosting with npm: npx -y @on-panda/serve@latest

----
3. Designed for geeks, power users, curious minds, and engineers, onPanda's UI is built for deep exploration and efficient data annotation.

The core loop is simple: hover over a token → choose an alternative or edit freely → continue generation. You can modify and control everything the model outputs, including reasoning and tool_calls.

With its flexible, full-featured interface, onPanda makes model inspection, prompt engineering, and related work easier.

-----

4. Using the prompt_logprobs option, onPanda can recompute token probabilities for any trajectory. If the model that generated the trajectory differs from the model used for inspection, many tokens turn red (low probability), giving you a quick visual sense of how similar their output distributions are.

Open "Full prompt visualization 🪄" to see the token sequence as the model actually receives it, including hidden system prompts and the chat template.

---
5. onPanda can connect to popular agent harnesses such as Claude Code, Codex, and OpenCode. Easily explore and compare their internal toolsets, system prompts, skills, and memory mechanisms.

---

6. onPanda also includes a browser agent that runs directly in your browser—no installation required. Using the browser as its harness, it combines JavaScript execution, information gathering, UI interaction, multimedia I/O, local file access, and persistent memory in one agent environment.

A typical example shown here: the agent gets location data via the browser API, queries the weather online, and dynamically modifies the onPanda webpage to render a weather card.

---

7. onPanda stands for **On-Policy Alignment Data Annotator**.

As an annotation tool, onPanda efficiently labels on-policy data. Its token-level correction format also provides fine-grained supervision with precise positions and naturally paired positive–negative samples.

We believe these unique properties will make token-level correction a highly efficient and practical paradigm for future LLM alignment.

Read our paper: **onPanda: Efficient Annotation of On-Policy Alignment Data for LLMs and Agents via Token-Level Correction**
Paper page: https://on-panda.github.io/research/

And the dataset and benchmark for token-level correction:
Can LLMs Locate and Correct Errors at the Token Level? Panda-CVL: A Dataset and Benchmark for Token-Level Correction
Project page: https://on-panda.github.io/Panda-CVL/