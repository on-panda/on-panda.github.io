<head>
    <meta charset="UTF-8">
    <title>Panda-CVL: Can LLMs Locate and Correct Erroneous Tokens?</title>
    <meta name="description" content="Panda-CVL: Can LLMs Locate and Correct Erroneous Tokens? A Vision-Language Dataset and Benchmark for Token-Level Correction">
    <meta name="keywords" content="onPanda, Panda-CVL, on-policy data, token-level correction, process reward">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="image" content="https://on-panda.github.io/img/fig1_UI-v4.png">
    <meta property="og:title" content="Panda-CVL: Can LLMs Locate and Correct Erroneous Tokens?" />
    <meta property="og:description" content="Panda-CVL: Can LLMs Locate and Correct Erroneous Tokens? A Vision-Language Dataset and Benchmark for Token-Level Correction" />
    <meta property="og:image" content="https://on-panda.github.io/img/fig1_UI-v4.png" />
    <meta name="twitter:card" content="summary_large_image">
    <meta property="twitter:domain" content="on-panda.github.io">
    <meta property="twitter:url" content="https://on-panda.github.io/Panda-CVL">
    <meta name="twitter:title" content="Panda-CVL: Can LLMs Locate and Correct Erroneous Tokens?">
    <meta name="twitter:description" content="Panda-CVL: Can LLMs Locate and Correct Erroneous Tokens? A Vision-Language Dataset and Benchmark for Token-Level Correction">
    <meta name="twitter:image" content="https://on-panda.github.io/img/fig1_UI-v4.png">
</head>

<div align="center">

<span style="font-size:32px;font-weight:555">Can LLMs Locate and Correct Erroneous Tokens? </span>
<br>
<span style="font-size:24px;font-weight:550; border-bottom-color:rgb(216, 222, 228);border-bottom-style:solid;border-bottom-width:1px;margin-bottom:16px;padding-bottom:9.6px; display:block">Panda-CVL: A Vision-Language Dataset for Token-Level Correction</span>

<!-- Lei Yang<sup>1</sup> &nbsp;&nbsp;&nbsp; Mengyin Liu<sup>1,2</sup> &nbsp;&nbsp;&nbsp; Jia Wang<sup>1</sup> &nbsp;&nbsp;&nbsp; Hangyu Guo<sup>1</sup> &nbsp;&nbsp;&nbsp; Liang Zhao<sup>1</sup> &nbsp;&nbsp;&nbsp; Zheng Ge<sup>1</sup>   
Kang an<sup>1</sup> &nbsp;&nbsp;&nbsp; Binxing Jiao<sup>1</sup> &nbsp;&nbsp;&nbsp; Qi Han<sup>1</sup> &nbsp;&nbsp;&nbsp; Daxin Jiang<sup>1</sup> &nbsp;&nbsp;&nbsp; Siqi Shen<sup>2</sup> &nbsp;&nbsp;&nbsp; Xiangyu Zhang<sup>1</sup> -->



<div style="margin-top:px;font-size:">
  <sup>1</sup>
  <a target="_blank" href="https://www.stepfun.com/">
    <img src="../img/logo-StepFun.png" style="max-height:20px">
  </a>
    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <sup>2</sup>
  <a target="_blank" href="https://asc.xmu.edu.cn/t/shensiqi">
    <img src="../img/logo-xiamen-university.png" style="max-height:26px">
  </a>
</div>

<br>



<!-- Paper 📄 | Code 👨‍💻 | Demo 🎮 | Blog 📝 | Tweet 💬 | Poster 🖼️ -->

<!-- ### Paper 📄 | [Code 👨‍💻](https://github.com/on-panda/on-panda) | [Video ▶️](https://wvixbzgc0u7.feishu.cn/wiki/Zurxw3nX4iulXRk6Ze2c7RZ3nQp#share-XdTjdn9B4oxvgSxS0F3c4rAcn8b) | [Demo 🐼](https://on-panda.diyer22.com/) | Dataset 📁 -->

</div>


<div align="center">

<!-- ### Token-Level Correction -->

<a href="../img/fig1_UI-v4.png">
  <img src="../img/fig1_UI-v4.png" style="max-width:350px" loading="lazy">
</a>

The token-level correction interface used for annotating Panda-CVL   
For details about the annotation tool, see [onPanda](https://on-panda.github.io/research/)

</div>


<br>

**TL;DR:** We release the multimodal Panda-CVL dataset with an accompanying benchmark, providing public resources for research on token-level correction data.

---
<div align="center">

<!-- 
### Abstract 中文

我们发布 Panda-CVL----一个用于评测模型的 token-level correction 能力的数据集及配套 benchmark：给定一个问题与回答对，模型首先须判断该回答是否合格；若判定需要纠正，则须定位回答中首个不恰当的 token，并将其更正为合适的 token----如此，policy model 便可基于“正确前缀 + 修正 token”继续生成，最终产出合格的回答。相比以往仅定位错误出现在哪个 step 的数据，Panda-CVL 带来两点改进：(1) 将错误定位的细粒度提升至 token-level；(2) 模型不仅要指出哪个 token 不恰当，还须给出应改为的正确 token，从而提供位置与修正方向均精确的监督信号。Panda-CVL 由标注员使用 onPanda 标注工具标注，共包含 7,491 个标注会话，划分为训练集 6,839 个与测试集 652 个；训练集可直接用于强化模型的 token-level correction 能力。Panda-CVL 主要在中文 vision-language 数据上标注，我们另提供纯英文的子集 Panda-MultiRef-21，可用于单独评测模型的英文 token-level correction 能力。对最新的 LLM 的评测表明，该任务仍具挑战性----最优模型的 F1 仅为 17.09。我们还通过受控实验分析了 token-level correction 在不同标注员之间的一致性，为研究这一新型数据提供公开资源与实证参考。

 -->

### Abstract

<p style="text-align: justify;text-indent: 2em; width:90%; ">
We release Panda-CVL, a dataset and accompanying benchmark for evaluating models' token-level correction capability: given a question-response pair, the model must first judge whether the response is acceptable; if it decides a correction is needed, it must locate the first inappropriate token in the response and correct it to an appropriate one--so that the policy model can continue generating from the "correct prefix + corrected token" and ultimately produce an acceptable response. Compared with prior data that only identifies which step an error occurs in, Panda-CVL brings two improvements: (1) it refines error localization to the token level; (2) the model must not only point out which token is inappropriate but also provide the correct token it should be changed to, yielding supervision signals that are precise in both position and correction direction. Panda-CVL was annotated by human annotators using the onPanda annotation tool and contains 7,491 annotation sessions, split into a training set of 6,839 and a test set of 652; the training set can be directly used to strengthen models' token-level correction capability. Panda-CVL is annotated mainly on Chinese vision-language data; we additionally provide an English-only subset, Panda-MultiRef-21, which can be used to separately evaluate models' token-level correction capability in English. Evaluation of recent LLMs shows that this task remains challenging--the best model achieves an F1 of only 17.09. We further analyze the inter-annotator consistency of token-level correction through a controlled experiment, providing public resources and empirical references for research on this new type of data.
</p>




</div>


<!-- 
TODO
### Leaderboard of Panda-CVL-test


### Leaderboard of Panda-MultiRef-21 (English)


 -->


---
### Common Questions

<!-- 
Q1: 为什么选择 Vision-Language 数据，而不是纯文本？  
A1:
- 模型在纯文本任务上已足够强，只有聚集领域专家在高难度问题上做大规模标注，才能提供有效的监督信号，成本高、难以规模化
- 而在许多 Vision-Language 任务上，模型仍明显不如人类----普通标注员即可胜任标注，并提供有效的监督信号

Q2: 为什么 Panda-CVL 大多数都是中文数据？  
A2: 
- Panda-CVL 是从内部生产标注数据中筛选出的适合公开的子集，而我们标注员的母语均为中文
- 针对英文场景，我们另提供了纯英文子集 [Panda-MultiRef-21](https://github.com/on-panda/Panda-MultiRef-21)：由擅长英文的标注员标注，共包含 506 次 token-level correction 操作，可用于评测模型在英文上的 token-level correction 能力
 -->

Q1: Why vision-language data instead of pure text?  
A1:
- On pure-text tasks, models are already strong enough that effective supervision signals can only come from large-scale annotation by domain experts on highly difficult problems--costly and hard to scale
- On many vision-language tasks, however, models still clearly fall short of humans--ordinary annotators are fully capable of doing the annotation and providing effective supervision signals

Q2: Why is most of Panda-CVL in Chinese?  
A2: 
- Panda-CVL is a publicly releasable subset filtered from our in-house production annotation data, and our annotators are all native Chinese speakers
- For English scenarios, we additionally provide an English-only subset, [Panda-MultiRef-21](https://github.com/on-panda/Panda-MultiRef-21): annotated by annotators proficient in English, it contains 506 token-level correction operations and can be used to evaluate models' token-level correction capability in English

Q3: Is there a standalone Panda-CVL paper?  
A3: No -- Panda-CVL is introduced in the [onPanda paper](https://on-panda.github.io/research).

---

### Resources

- Paper: coming soon
- [Python library](https://github.com/on-panda/on-panda-python): Including benchmark code
- [`panda.json` example](https://github.com/on-panda/on-panda-example-data/tree/main/panda_json)
- [Live demo](https://on-panda.diyer22.com/): To load `panda.json`
- Panda-CVL dataset and benchmark: coming soon
- [Panda-MultiRef-21](https://github.com/on-panda/Panda-MultiRef-21): A Small Dataset for Studying the Distribution of Token-Level Corrections


<style>
    html,
    body {
        width: auto !important;
        max-width: 100% !important;
        padding: 0px !important;
        margin: 0px !important;
    }

    ._theme-github {
        background-color: rgb(255, 255, 255);
    }

    .markdown-body {
        min-width: 468px;
        max-width: 1024px;
        background-color: rgb(255, 255, 255);
        overflow: auto;
        border-width: 1px;
        border-style: solid;
        border-color: rgb(221, 221, 221);
        border-image: initial;
        padding: 45px;
        margin: 20px auto;
    }
</style>
<!-- Google tag (gtag.js) for Panda-CVL -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-MQ38G3YVBQ"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-MQ38G3YVBQ');
</script>
