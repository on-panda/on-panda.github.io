<head>
    <meta charset="UTF-8">
    <title>onPanda: Efficient Annotation of On-Policy Alignment Data for LLMs and Agents via Token-Level Correction</title>
    <meta name="description" content="An interactive tool that efficiently annotates on-policy alignment data for LLMs and agent trajectories via a token-level locate--correct--continue loop, automatically capturing fine-grained supervision.">
    <meta name="keywords" content="onPanda, annotation tool, on-policy data, token-level correction, agent trajectory annotation, agent annotation">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="image" content="https://on-panda.github.io/img/fig1_UI-v4.png">
    <meta property="og:title" content="onPanda: Efficient Annotation of On-Policy Alignment Data" />
    <meta property="og:description" content="Efficient Annotation of On-Policy Alignment Data for LLMs and Agents via Token-Level Correction" />
    <meta property="og:image" content="https://on-panda.github.io/img/fig1_UI-v4.png" />
    <meta name="twitter:card" content="summary_large_image">
    <meta property="twitter:domain" content="on-panda.github.io">
    <meta property="twitter:url" content="https://on-panda.github.io/research">
    <meta name="twitter:title" content="onPanda: Efficient Annotation of On-Policy Alignment Data">
    <meta name="twitter:description" content="Efficient Annotation of On-Policy Alignment Data for LLMs and Agents via Token-Level Correction">
    <meta name="twitter:image" content="https://on-panda.github.io/img/fig1_UI-v4.png">
</head>

<div align="center">

# onPanda: Efficient Annotation of On-Policy Alignment Data for LLMs and Agents via Token-Level Correction

Lei Yang<sup>1</sup> &nbsp;&nbsp;&nbsp; Mengyin Liu<sup>1,2</sup> &nbsp;&nbsp;&nbsp; Jia Wang<sup>1</sup> &nbsp;&nbsp;&nbsp; Hangyu Guo<sup>1</sup> &nbsp;&nbsp;&nbsp; Liang Zhao<sup>1</sup> &nbsp;&nbsp;&nbsp; Zheng Ge<sup>1</sup>   
Kang An<sup>1</sup> &nbsp;&nbsp;&nbsp; Binxing Jiao<sup>1</sup> &nbsp;&nbsp;&nbsp; Qi Han<sup>1</sup> &nbsp;&nbsp;&nbsp; Daxin Jiang<sup>1</sup> &nbsp;&nbsp;&nbsp; Siqi Shen<sup>2</sup> &nbsp;&nbsp;&nbsp; Xiangyu Zhang<sup>1</sup>



<div>
  <sup>1</sup>
  <a target="_blank" href="https://www.stepfun.com/">
    <img src="../img/logo-StepFun.png" alt="StepFun" style="max-height:20px"><span class="sr-only">StepFun</span>
  </a>
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <sup>2</sup>
  <a target="_blank" href="https://asc.xmu.edu.cn/t/shensiqi">
    <img src="../img/logo-xiamen-university.png" alt="Xiamen University" style="max-height:26px"><span class="sr-only">Xiamen University</span>
  </a>
</div>

<br>



<!-- Paper 📄 | Code 👨‍💻 | Demo 🎮 | Blog 📝 | Tweet 💬/🐦 | Poster 🖼️ -->

### [Paper 📄](https://arxiv.org/abs/2609.24983) | [Demo 🎮](https://onpanda.diyer22.com/) | [Video ▶️](https://youtu.be/0T4h4IUIZCM) | [Tweet 💬](https://x.com/StepFun_ai/status/2102454115473510643) | [Dataset 📁](https://on-panda.github.io/Panda-CVL/) | [Code 👨‍💻](https://github.com/on-panda/on-panda)

</div>


<div align="center">

<!-- ### Token-Level Correction -->

<br>
<a href="../img/onPanda-token-level-correction.gif">
  <img src="../img/onPanda-token-level-correction.gif" alt="onPanda token-level correction interface: locate an inappropriate token, select a candidate or edit freely, and continue generation" style="max-width:500px; box-shadow: rgba(0, 0, 0, 0.5) 0px 0px 8px;">
</a>
<br>

onPanda's token-level correction interface. Try the <b><a href="https://onpanda.diyer22.com/" target="_blank">live demo</a></b>.
<!-- <p style="width:90%; text-align: justify"><b>The token-level correction interface of onPanda.</b> The annotator locates an inappropriate token, selects a better candidate or enters a free-form edit, and lets the model continue from the corrected prefix. Intermediate versions are retained automatically.</p> -->

</div>


<br>

**TL;DR:** An interactive tool that efficiently annotates on-policy alignment data for LLMs and agents via a token-level locate--correct--continue loop, automatically capturing fine-grained supervision.


***Contributions of this paper:***
- We propose onPanda, an annotation tool centered on token-level correction for efficiently annotating LLM alignment data and agent trajectories that stay close to the rollout model's distribution.
- We experimentally validate onPanda's annotation efficiency and the on-policy fidelity of the produced data, and demonstrate its support for multimodal and agent-trajectory annotation.
- We release the multimodal Panda-CVL dataset with an accompanying benchmark, providing public resources for research on token-level correction data.

---
<div align="center">

### Abstract

<p style="text-align: justify;text-indent: 2em; width:90%; ">
We present onPanda, an interactive tool for efficiently annotating LLM alignment data and agent trajectories. onPanda adopts token-level correction as its core interaction: while reading a model response, the annotator locates the first inappropriate token and either picks a substitute from the model's candidate tokens or types the correct text via free-form editing. The system then truncates everything after that position and continues generation from the corrected prefix, repeating this locate-correct-continue loop until a satisfactory response is obtained. This mechanism lets annotators precisely steer model outputs at low cost: a small controlled study suggests that onPanda reduces median annotation time by 52% over manual post-editing. Since the vast majority of tokens in the final response are generated by the model itself, the resulting data largely preserves the model's sampling distribution and is well suited for constructing on-policy SFT and preference data. Furthermore, the token-level corrections recorded during annotation provide fine-grained supervision with precise positions and naturally paired positive--negative samples. onPanda also connects to external tools and harnesses, enabling interactive trajectory annotation in realistic environments. In addition, we release Panda-CVL, a dataset annotated with onPanda, together with a benchmark for token-level correction.
</p>

</div>

---
<div align="center">

### Agent Trajectory Annotation

<a href="../img/fig2_agent-v4.png">
  <img src="../img/fig2_agent-v4.png" alt="Annotating an agent trajectory with onPanda: synchronized dual-view editing of reasoning and tool_calls with environment execution" style="max-width:600px" loading="lazy">
</a>

<p style="width:90%; text-align: justify"><b>Annotating an agent trajectory with onPanda.</b> Reasoning and tool-call arguments remain editable at token level. Corrected tool calls can be executed in the connected environment, and the resulting trajectory continues from the corrected context. 
Try <code>agent-annotate</code> example in the <a href="https://onpanda.diyer22.com/" target="_blank">live demo</a>, or see our blog <a href="https://on-panda.github.io/agent-trajectory-annotation/">onPanda is Efficient Agent Trajectory Annotation Tool</a> for details.</p>
</div>


---
<div align="center">

### Comparison of Annotation Paradigms

<a href="../img/table1-annotaion-compare.png">
  <img src="../img/table1-annotaion-compare.png" alt="Table 1: Comparison of annotation paradigms (Argilla, POTATO, and onPanda) in the controlled study" style="max-width:800px" loading="lazy">
</a>

</div>

<div class="sr-only">

| Tool | Paradigm | Time (s) ↓ | Win rate ↑ | PPL | Δ PPL | SFT Cov. ↑ | Pref. pairs ↑ | NASA-TLX ↓ |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Argilla | rank 4 candidates | 336 (684) | 28.6% | 1.161 | **- 0.83%** | 11/21 (52%) | 6.00 | 5.4 |
| POTATO | post-editing | 681 (711) | 54.8% | 1.596 | + 36.31% | 21/21 (**100%**) | 0.95 | 6.8 |
| **onPanda** | token-level correction | **330 (516)** | **66.7%** | 1.181 | + 0.86% | 21/21 (**100%**) | **7.43** | **3.1** |

Table 1: Comparison of annotation paradigms in the controlled study. Time is reported in seconds as the median annotation time over the 21 prompts, with the mean in parentheses. Win rate is the fraction of LLM-judged pairwise comparisons each method wins against the other two. PPL is scored by the rollout model; ΔPPL is the relative change from the re-sampling baseline (1.171); smaller absolute values indicate higher on-policy fidelity. SFT Cov. is the fraction of prompts yielding a valid SFT response, and Pref. pairs is the mean number of derivable preference pairs per prompt. NASA-TLX, from the user study, is on our adapted 0–10 scale (lower is better).

</div>


---

### Resources

- [Paper (arXiv)](https://arxiv.org/abs/2609.24983)
- [Source code](https://github.com/on-panda/on-panda)
- [Python library](https://github.com/on-panda/on-panda-python)
<!-- - [`panda.json` example](https://github.com/on-panda/on-panda-example-data/tree/main/panda_json) -->
- [Demo video](https://x.com/StepFun_ai/status/2102454115473510643)
- [Live demo](https://onpanda.diyer22.com/)
- [Panda-CVL](https://on-panda.github.io/Panda-CVL/): Dataset and Benchmark for Token-Level Correction
    <!-- - [Panda-CVL-test](https://huggingface.co/datasets/diyer22/Panda-CVL-test)
    - [Panda-CVL-train](https://huggingface.co/datasets/diyer22/Panda-CVL-train) -->
- [Panda-MultiRef-21](https://github.com/on-panda/Panda-MultiRef-21): A Small Dataset for Studying the Distribution of Token-Level Corrections
    - [**Browse dataset & try annotation online**](http://121.36.40.207:5190/on-panda-annotate/)
- [Efficient Agent Trajectory Annotation with onPanda](https://on-panda.github.io/agent-trajectory-annotation/) - Blog
  - Dynamically connect to agent environments and annotate multi-turn SFT and preference data with `tool_calls` and `reasoning` online

<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-16K331E76Z"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-16K331E76Z');
</script>
