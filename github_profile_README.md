# Hi there 👋

<p align="left">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=24&pause=1000&color=61DAFB&vCenter=true&random=false&width=620&lines=Full-Stack+%26+Distributed+Systems+Engineer;AI+%26+Vector+Retrieval+(RAG)+Architect;B.Tech+in+Computer+%26+Communication+Eng;Building+Scalable+Cloud+Pipelines" alt="Typing SVG" />
</p>

<p align="left">
  <a href="https://linkedin.com/in/sathyanand-s"><img src="https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn" /></a>
  <a href="mailto:sathyarsk2027@gmail.com"><img src="https://img.shields.io/badge/Gmail-EA4335?style=for-the-badge&logo=gmail&logoColor=white" alt="Email" /></a>
  <a href="https://github.com/sathyarsk2027"><img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" /></a>
  <img src="https://komarev.com/ghpvc/?username=sathyarsk2027&label=Profile%20Views&color=0e75b6&style=for-the-badge" alt="Profile Views" />
</p>

---

## 🧑‍💻 About Me

Hey there! I'm **Sathyanand S**, but around the digital block, I go by **[sathyarsk2027](https://github.com/sathyarsk2027)** 🚀  
I'm currently pursuing my **B.Tech in Computer and Communication Engineering** at *Amrita Vishwa Vidyapeetham, Chennai*.

- 💡 **Passion & Focus**: I'm deeply passionate about **Distributed Systems, Scalable Backends, AI & Vector Retrieval (RAG), and Cloud Architecture** — whether it's optimizing microservice pipelines or architecting fault-tolerant APIs.
- 🔬 **Undergraduate Researcher**: Primary author of an IEEE-standard research paper on multi-plane situational risk intelligence, vector indexing (`pgvector`), and real-time semantic analysis.
- 🛠️ **Engineering Mindset**: Strong foundation in modern **Java (Spring Boot)**, **Python (FastAPI)**, and **C/C++**, paired with hands-on expertise in cloud databases, embedded systems, and containerized deployments.
- 💬 **When I'm not writing high-concurrency microservices or tuning vector embeddings, I'm**:
  - ⚡ Prototyping IoT hardware & embedded telemetry systems (ESP32 / Arduino)
  - 📚 Reading papers on distributed systems & modern database engines
  - 🧩 Solving algorithmic puzzles & competitive programming problems
  - ☕ Exploring bleeding-edge developer tooling and open-source stacks

*Let's build something extraordinary together!*

---

## 🚀 Featured Engineering Projects (STAR Framework)

> Structured using the **STAR methodology** (*Situation, Task, Action, Result*) to highlight engineering depth, design trade-offs, and measurable outcomes.

### 🌐 1. Real-Time Supply Chain Risk Monitor & Semantic Threat Engine
*Distributed Multi-Plane Situational Intelligence Platform*

- **📌 Situation**: Global supply networks face rapid disruption from regional conflicts, extreme weather, and logistical chokepoints. Existing risk management platforms rely on historical post-mortem reports and siloed dashboards, resulting in delayed warning responses and compounding financial losses.
- **🎯 Task**: Architect a production-grade, end-to-end multi-plane platform capable of continuously ingesting multi-source global intelligence, extracting semantic threats via LLMs, indexing vector embeddings, and computing corridor-level risk scores ($S_{\text{risk}}$) in real time under strict free-tier cloud constraints (512MB RAM worker limit).
- **⚡ Action**:
  - **Decoupled Architecture**: Engineered a 5-plane distributed microservice topology separating the **Java 21 / Spring Boot** core API from a lightweight **Python / FastAPI** NLP inference microservice to strictly prevent OOM failures on resource-constrained nodes.
  - **Vector Search & RAG**: Implemented **PostgreSQL + `pgvector`** with HNSW indexing and Reciprocal Rank Fusion (RRF) for sub-100ms semantic similarity queries and hybrid reranking.
  - **Automated Intelligence**: Integrated Groq LLM inference for entity extraction, sentiment scoring, and automated daily digest generation via Spring cron schedulers and HikariCP connection pooling.
  - **Dynamic Telemetry Dashboard**: Built an interactive 3D WebGL satellite telemetry globe using React and Vite, delivering corridor threat heatmaps and live database telemetry status.
- **🏆 Result**:
  - Authored a comprehensive research paper detailing the multi-plane architecture, vector indexing algorithms, and empirical benchmarks.
  - Achieved **sub-second threat classification** across thousands of RSS and NewsAPI corridors with zero downtime across Supabase, Render, and Vercel.
  
`Java 21` • `Spring Boot` • `Python` • `FastAPI` • `PostgreSQL` • `pgvector` • `Groq LLM` • `React` • `Vite` • `Docker`

---

### 🅿️ 2. IoT Smart Urban Parking & Dynamic Allocation System
*Embedded Hardware & Real-Time Cloud Telemetry*

- **📌 Situation**: Drivers in congested urban transit zones spend an average of 15–20 minutes searching for vacant parking bays, causing severe traffic bottlenecks and elevated carbon emissions.
- **🎯 Task**: Build an automated end-to-end smart parking management platform that detects bay occupancy in real time, transmits low-latency telemetry to cloud storage, and guides drivers to available slots dynamically.
- **⚡ Action**:
  - Engineered sensor arrays (ultrasonic & IR) interfaced with embedded microcontrollers (ESP32/Arduino) configured with interrupt-driven state change detection.
  - Designed a lightweight publish-subscribe messaging pipeline to push real-time slot state changes to cloud databases.
  - Implemented dynamic slot assignment algorithms to optimize parking density and minimize transit distance within multi-story garages.
- **🏆 Result**:
  - Reduced simulated parking search time by **>60%** during peak traffic conditions.
  - Maintained **99.8% sensor event accuracy** with minimal packet drops across real-time hardware testing.

`C/C++` • `Embedded Systems` • `ESP32` • `Arduino` • `IoT Sensors` • `Cloud Telemetry`

---

### 🚗 3. Active Vehicle Blind-Spot Detection & Collision Telemetry
*Automotive Safety System & Hardware-Level Sensor Fusion*

- **📌 Situation**: Commercial vehicles and heavy trucks experience extensive blind-zone corridors that are physically invisible through standard mirrors, leading to high-consequence lane-change collisions.
- **🎯 Task**: Create a deterministic, low-latency embedded safety module that actively detects obstacles in vehicle blind spots and triggers instant multi-sensory alerts prior to driver lane changes.
- **⚡ Action**:
  - Built an embedded sensor array utilizing calibrated ultrasonic radar clusters calibrated to vehicle lateral blind zones.
  - Implemented hardware-interrupt safety routines to ensure alert signals bypass OS queuing delays and trigger visual/auditory alarms instantly.
  - Integrated dynamic distance-filtering algorithms to suppress false positives caused by stationary guardrails during high-speed highway curves.
- **🏆 Result**:
  - Achieved consistent **<50ms alert trigger latency**, expanding the effective driver collision avoidance window by critical seconds.

`Embedded C` • `Microcontrollers` • `Hardware Interrupts` • `Sensor Fusion` • `Safety Systems`

---

## 🛠️ Tech Stack

### 💻 Programming Languages
<p align="left">
  <img src="https://img.shields.io/badge/C%2B%2B-00599C?style=for-the-badge&logo=c%2B%2B&logoColor=white" alt="C++" />
  <img src="https://img.shields.io/badge/C-A8B9CC?style=for-the-badge&logo=c&logoColor=black" alt="C" />
  <img src="https://img.shields.io/badge/Java_21-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white" alt="Java" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/SQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white" alt="SQL" />
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" />
</p>

### 🧠 Frameworks & Libraries
<p align="left">
  <img src="https://img.shields.io/badge/Spring_Boot-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white" alt="Spring Boot" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/pgvector-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="pgvector" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
</p>

### ☁️ Databases, Cloud & DevOps
<p align="left">
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=black" alt="Render" />
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
  <img src="https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white" alt="Git" />
  <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" />
  <img src="https://img.shields.io/badge/Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black" alt="Linux" />
  <img src="https://img.shields.io/badge/Arduino-00979D?style=for-the-badge&logo=arduino&logoColor=white" alt="Arduino" />
  <img src="https://img.shields.io/badge/Postman-FF6C37?style=for-the-badge&logo=postman&logoColor=white" alt="Postman" />
  <img src="https://img.shields.io/badge/VS_Code-007ACC?style=for-the-badge&logo=visual-studio-code&logoColor=white" alt="VS Code" />
</p>

---

## 📊 GitHub Analytics & Activity

<p align="center">
  <img src="https://github-readme-stats.vercel.app/api?username=sathyarsk2027&show_icons=true&theme=tokyonight&hide_border=true&bg_color=0d1117" alt="GitHub Stats" width="48%" />
  <img src="https://streak-stats.demolab.com/?user=sathyarsk2027&theme=tokyonight&hide_border=true&background=0d1117" alt="GitHub Streak" width="48%" />
</p>

<p align="center">
  <img src="https://github-readme-stats.vercel.app/api/top-langs/?username=sathyarsk2027&layout=compact&theme=tokyonight&hide_border=true&bg_color=0d1117" alt="Top Languages" width="60%" />
</p>

---

## 🎓 Education

- 🏛️ **B.Tech in Computer and Communication Engineering**  
  *Amrita School of Engineering, Amrita Vishwa Vidyapeetham, Chennai* (2023 – 2027)

---

## 📫 Let's Connect!

<p align="left">
  <a href="https://linkedin.com/in/sathyanand-s">
    <img src="https://img.shields.io/badge/LinkedIn-Connect-blue?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn" />
  </a>
  <a href="mailto:sathyarsk2027@gmail.com">
    <img src="https://img.shields.io/badge/Email-Get%20in%20Touch-red?style=for-the-badge&logo=gmail&logoColor=white" alt="Email" />
  </a>
  <a href="https://github.com/sathyarsk2027">
    <img src="https://img.shields.io/badge/GitHub-Follow-black?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" />
  </a>
</p>
