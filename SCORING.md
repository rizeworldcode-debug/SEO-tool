# Independent SEO Metrics — Scoring Methodology Specification (`SCORING.md`)

This document defines the mathematical models, formulas, sub-signal weights, graph pre-processing rules, and calibration mechanisms used by our independent SEO metrics engine.

---

## 1. Authority Score (AS) — 0 to 100 Scale

Authority Score measures the overall link equity and reputational strength of a domain across the web graph.

### 1.1 Graph Pre-Processing Rules & Domain Granularity

1. **Host-to-Domain & PLD Roll-Up (Granularity)**:
   - Common Crawl hyperlink graphs are released in both `host/` and `domain/` directories.
   - To guarantee complete immunity against same-site subdomain link inflation, all vertex domain strings are parsed through `tldextract` to extract the **Pay-Level Domain (PLD) / Registered Domain**:
     - `www.google.com` $\to$ `google.com`
     - `blog.bbc.co.uk` $\to$ `bbc.co.uk`
     - `deutschland.abbott` $\to$ `deutschland.abbott`
   - Cross-subdomain links (e.g. `www.google.com` $\to$ `google.com`) roll up to `google.com` $\to$ `google.com` and are eliminated by the self-loop filter.
   - **Vertex Uniqueness**: All domain vertices are grouped by PLD root domain, guaranteeing that every domain appears **exactly once** in `domain_vertices.parquet`.

2. **Binary Edge Capping (Anti-Spam Filter)**:
   - Aggregating raw link counts between domain pairs directly into PageRank allows template/footer link spam to inflate authority.
   - **Rule**: For authority graph computation, edges are **binary**:
     $$W(u, v) = \begin{cases} 1 & \text{if domain } u \text{ links to domain } v \text{ (1 or more times)} \\ 0 & \text{otherwise} \end{cases}$$
   - Raw link counts are stored as a separate diagnostic field (`raw_link_count`) and are **never** fed directly into PageRank.

3. **Self-Loop Exclusion**:
   - Internal linking between subdomains (e.g. `blog.example.com` $\to$ `example.com`) aggregates to `example.com` $\to$ `example.com`.
   - **Rule**: All self-loops where $\text{source\_domain} == \text{target\_domain}$ are explicitly stripped during ingestion. The total count of dropped self-loops is logged as `dropped_self_loops`.

---

### 1.2 PageRank & Anchor Calibration Normalization

To prevent score drift across Common Crawl releases (where $\text{PR}_{min}$ and $\text{PR}_{max}$ shift naturally), scores are anchored to a fixed reference set of domains.

1. **Raw PageRank Computation**:
   - Damping factor $\alpha = 0.85$, convergence threshold $\epsilon = 10^{-6}$.
   - Output: $PR(d)$ for each domain $d$.

2. **Fixed Reference Calibration Anchors**:
   - We fit a monotonic log-transform curve $f_{\text{anchor}}(\ln(PR(d)))$ against a fixed calibration table of reference domains:

| Reference Domain | Tier | Target Calibration AS |
| :--- | :--- | :--- |
| `google.com` | Tier 1 (Global Super-Authority) | **99** |
| `wikipedia.org` | Tier 1 (Global Reference) | **96** |
| `github.com` | Tier 1 (High Authority Developer Hub) | **93** |
| `nytimes.com` | Tier 2 (Major News Media) | **87** |
| `stackoverflow.com` | Tier 2 (Established Knowledge Base) | **82** |
| `medium.com` | Tier 2 (Content Platform) | **75** |
| `niche-established-blog.org` | Tier 3 (Mid-tier Niche Domain) | **45** |
| `local-business-sample.com` | Tier 4 (Small / Local Site) | **20** |
| `new-unranked-site.xyz` | Tier 5 (New / Single Link Site) | **3** |

3. **Normalization Formula**:
   - For domain $d$ with log PageRank $x_d = \ln(PR(d))$:
     $$PR_{\text{comp}}(d) = \text{PiecewiseMonotonicInterpolation}(x_d, A_{\text{ref}})$$
   - Bound result: $PR_{\text{comp}}(d) \in [0, 100]$.

---

### 1.3 Sub-Signal Blend (No Double Counting)

> [!IMPORTANT]
> **Signal Deduplication**: Inbound referring domain count is strongly correlated with PageRank. Adding referring domain count as an independent additive term double-counts the link graph. Therefore, inbound domain count is treated as already captured by $PR_{\text{comp}}(d)$.

The final Authority Score $AS(d)$ is composed of:

$$AS(d) = 0.70 \times PR_{\text{comp}}(d) + 0.15 \times Age_{\text{comp}}(d) + 0.15 \times SecurityDiversity_{\text{comp}}(d)$$

Where:
- **$PR_{\text{comp}}(d)$** (70%): Calibrated PageRank score component.
Page Score evaluates the authority of a specific URL.

1. **Homepage / Root URL**:
   $$PS(\text{https://domain.com/}) = AS(\text{domain.com})$$

2. **Internal Page URL (Heuristic Model)**:
   When URL-level graph data is unavailable, $PS(url)$ decays based on URL path depth and query parameter complexity:
   $$PS(url) = AS(\text{domain}) \times (0.90^{\text{path\_depth}}) \times (0.95^{\text{query\_param\_count}})$$

## 3. Spam Score (SS) — 0 to 100 Scale (Phase 4)

Spam Score measures the likelihood that a domain is spammy, toxic, or low-quality (0 = clean, 100 = toxic/spam).

### 3.1 Two-Tier Evaluation Model

Spam Score uses a two-tier evaluation structure:

#### Tier 1: Blocklist Hit Short-Circuit Override
If a domain matches a Safe Browsing, Spamhaus, or SURBL blocklist:
$$\text{If } BlocklistHit(d) == \text{True} \implies SS(d) = \mathbf{100.0}$$
*(Blocklist hits override all lower sub-signal components).*

#### Tier 2: Weighted Evaluated Sub-Signal Blend
If $BlocklistHit(d) == \text{False}$, the score is calculated by normalizing evaluated risk signals:

$$SS(d) = \min\left(100.0, \frac{0.50 \cdot BlocklistPts(d) + 0.20 \cdot TLDRisk(d) + 0.15 \cdot SpamAge_{\text{risk}}(d)}{0.85}\right)$$

Where:
1. **Blocklist Signal ($Weight = 0.50$, Max $100.0$ pts)**: $100.0$ if blocked, $0.0$ otherwise.
2. **High-Risk TLD Signal ($Weight = 0.20$, Max $100.0$ pts)**:
   - High-risk TLD list (`.xyz`, `.top`, `.work`, `.click`, `.loan`, `.zip`, `.country`, `.stream`, `.download`, `.gdn`, `.racing`, `.win`, `.bid`, `.party`, `.trade`, `.science`).
   - High-risk TLD $\implies 80.0$ points; standard TLD $\implies 0.0$ points.
3. **Domain Age Spam Risk Signal ($Weight = 0.15$, Max $100.0$ pts)**:
   - Graduated inverse age curve ($5$-year ceiling):
     $$SpamAge_{\text{risk}}(\text{days}) = \max\left(0.0, 100.0 \times \left(1.0 - \sqrt{\frac{\text{domain\_age\_days}}{365.0 \times 5.0}}\right)\right)$$
     - 0 Days Old (Brand New): **100.0** risk points
     - 1 Year Old ($365$ days): **55.3** risk points
     - 3 Years Old ($1,095$ days): **22.5** risk points
     - 5+ Years Old ($\ge 1,825$ days): **0.0** risk points
4. **Explicitly Un-Evaluated Signals (v1 Transparency Standards)**:
   - `"anchor_text_signal": {"not_evaluated": true, "reason": "Requires WAT anchor-text Common Crawl release"}`
   - `"link_velocity_signal": {"not_evaluated": true, "reason": "Requires multi-release time-series crawl comparison"}`
   - `"pbn_footprint_signal": {"not_evaluated": true, "reason": "Requires full WHOIS registrant & IP C-block cluster analysis"}`

---

## 4. Graph Engine Scale-Out Architecture

To handle both lightweight development and production Common Crawl releases:

### 4.1 Milestone A: Dev / Sample Engine (`NetworkX` / `igraph`)
- **Target**: Datasets up to 100,000 nodes.
- **Engine**: In-memory Python `igraph` or `NetworkX`.
- **Purpose**: Rapid unit testing, local verification, and algorithm tuning.

### 4.2 Milestone B: Production Scale Engine (`DuckDB SQL Iterative PageRank`)
- **Target**: Full Common Crawl web graphs (100M+ domains, 2B+ edges).
- **Engine**: **DuckDB out-of-core SQL execution**.
- **Algorithm**: SQL Power Iteration:
  ```sql
  -- Iterative PageRank step in DuckDB without loading full graph into Python RAM
  CREATE OR REPLACE TABLE pr_next AS
  SELECT 
    target_id AS domain_id,
    (1.0 - 0.85) / :total_nodes + 0.85 * SUM(pr_current.score / out_degree.cnt) AS score
  FROM edges
  JOIN pr_current ON edges.source_id = pr_current.domain_id
  JOIN out_degree ON edges.source_id = out_degree.domain_id
  GROUP BY target_id;
  ```
- **Scale Guarantee**: Disk-backed out-of-core execution without RAM overflow.

---

## 5. Verification & Determinism Protocol

All metric computations must pass the following 4 deterministic regression tests:

1. **Determinism Test**: Running `ingest.py` + `calculate_authority.py` twice on identical graph data yields 100% identical Authority Scores.
2. **Edge Capping Test**: A target domain with 1,000 links from **1** single domain scores significantly lower than a target domain with 50 links from **50** distinct referring domains.
3. **Self-Loop Invariant Test**: Adding or removing self-loop edges (`example.com` $\to$ `example.com`) produces 0 change in Authority Score, and self-loops are logged in `dropped_self_loops`.
4. **Transparent Spam Signal Test**: The Spam Score response payload explicitly contains `"anchor_text": {"not_evaluated": true}` for v1.
