# Overleaf Research Paper Package: Supply Chain Risk Monitor (7-Page Edition)

This directory contains the complete, publication-ready research paper package for the **Supply Chain Risk Monitor** project, formatted according to official IEEE conference standards (`IEEEtran`), calibrated to **7 pages** with high-resolution pipeline and system visualization figures.

---

## 👥 Authors and Affiliations

- **Primary Author**: Sathyanand S
  - Department: Department of Computer and Communication Engineering
  - Institution: Amrita School of Engineering, Chennai, Tamil Nadu, India
  - Email: `ch.en.u4cce23044@ch.students.amrita.edu`
- **Faculty Advisor**: Dr. Thenmozhi V
  - Department: Department of Computer and Communication Engineering
  - Institution: Amrita School of Engineering, Chennai, Tamil Nadu, India
  - Email: `v_thenmozhi@ch.amrita.edu`

---

## 📁 Files Included

| File | Type | Description |
| :--- | :--- | :--- |
| [`main.tex`](./main.tex) | LaTeX Source | Complete IEEEtran LaTeX source code calibrated to **7 pages**, featuring the 5-plane architecture pipeline, Algorithm 1, 5 tables, 2 embedded system figures, and balanced references. |
| [`references.bib`](./references.bib) | BibTeX | Verified BibTeX bibliography including all **16 reference papers** with DOIs, venues, and sanitized author diacritics (`Gallofr\'{e} Oca\~{n}a`). |
| [`architecture_pipeline.png`](./architecture_pipeline.png) | Image (PNG) | **Fig. 1**: End-to-end multi-plane system architecture pipeline illustrating data flow from ingestion through NLP extraction, HNSW vector indexing, hybrid reranking, and grounded RAG synthesis. |
| [`dashboard_ui.png`](./dashboard_ui.png) | Image (PNG) | **Fig. 2**: Real-time operational situational dashboard of the Supply Chain Risk Monitor, showing the interactive 3D WebGL satellite globe, corridor risk factor telemetry ($S_{\text{risk}} = 62/100$ for India), multi-dimensional threat breakdown, and live PostgreSQL ingestion status. |
| [`README.md`](./README.md) | Guide | Setup, compilation, and structure guide. |

---

## 🚀 How to Import and Compile in Overleaf (Step-by-Step)

### Option 1: Upload as ZIP Archive (Recommended — 20 Seconds)
1. In Windows Explorer, navigate to either:
   - `C:\Users\sathy\Documents\supply-chain-risk-monitor\paper\` OR
   - `C:\Users\sathy\Desktop\supply-chain-risk-monitor\paper\`
2. Select all files (`main.tex`, `references.bib`, and all `.jpg` image files), right-click, and choose **Compress to ZIP file** (e.g., `Supply_Chain_Paper_7Pages.zip`).
3. Log in to [Overleaf](https://www.overleaf.com/).
4. Click **New Project** > **Upload Project**.
5. Drag and drop the `.zip` archive.
6. Overleaf will unpack all files and compile automatically using `pdfLaTeX`.

### Option 2: Upload Files to Existing Overleaf Project
1. Open your existing Overleaf project.
2. In the left file tree panel, upload `architecture_pipeline.png` and `dashboard_ui.png`.
3. Replace `main.tex` and `references.bib` with the updated files from this directory.
4. Click **Recompile** (or press `Ctrl + Enter` / `Cmd + Enter`).
5. Your 2-column, IEEE-formatted research paper will render cleanly in **exactly 7 pages**.

---

## ⚙️ Overleaf Recommended Settings
- **Compiler**: `pdfLaTeX` (Overleaf default).
- **TeX Live Version**: `2024` or `2023`.
- **Main document**: `main.tex`.

> [!NOTE]
> `IEEEtran.cls` and all required packages (`fontenc`, `tikz`, `graphicx`, `booktabs`, `amsmath`, `cite`, etc.) are pre-installed in Overleaf's standard TeX Live distribution.

---

## 📊 7-Page Paper Architecture & Layout Breakdown

- **Page 1**: Title, Side-by-Side Author Affiliations, Abstract, Keywords, **Section I: Introduction** (industrial fragility, ERP limitations, digital commons intelligence, 4 core challenges).
- **Page 2**: **Section I-A: Key Contributions** (5 technical contributions) and **Section II: Related Work** (SCRM resilience, NLP/NER, dense sentence embeddings).
- **Page 3**: **Section II-D–E** (RAG reasoning, architectural gap), **Section III: System Architecture**, **Fig. 1: End-to-End Multi-Plane Architectural Pipeline (`architecture_pipeline.png`)**, and **Table I: Ingestion Pipeline Throughput & Deduplication Statistics**.
- **Page 4**: **Section IV: Methodology and Mathematical Formulation** (SpaCy NER, 4-class taxonomy, SBERT MiniLM dense vectors, PostgreSQL HNSW cosine indexing with $M=16, ef_{\text{construction}}=64$, **Algorithm 1: Hybrid Reranking and Cutoff**).
- **Page 5**: **Section IV-D–E** (Logarithmic risk scoring model $S_{\text{risk}} \in [15, 100]$, Groq Llama-3.3-70B zero-hallucination RAG), **Section V: Implementation and Cloud Deployment**, and **Fig. 2: Real-Time Operational Situational Dashboard (`dashboard_ui.png`)**.
- **Page 6**: **Section VI: Empirical Evaluation and Benchmarks** (Benchmark corpus, **Table II: Retrieval Performance Comparison**, **Table III: Mathematical Formulations of Evaluation Metrics**, **Table IV: End-to-End Latency Breakdown**, **Table V: Taxonomy Classification Evaluation**).
- **Page 7**: **Section VII: Discussion, Case Studies, and Operational Considerations** (Guardrails, distractor rejection, deduplication, **Section VII-C: Three Real-World Disruption Case Studies**, Section VII-D: Limitations), **Section VIII: Conclusion and Future Work** (with public GitHub repository URL), and **Balanced References** (`\balance`).
