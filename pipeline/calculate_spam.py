"""
Phase 4 Spam Score Calculation Engine (pipeline/calculate_spam.py)

Computes Spam Score (SS) (0-100 scale, higher = toxic/spammy) for all domains in web graph.
Integrates:
1. Safe Browsing / Spamhaus Blocklist hits (dominate score when present).
2. Configurable High-Risk TLD list (.xyz, .top, .work, .click, .loan, .zip, etc.).
3. Graduated Domain Age Spam Risk (reusing WHOIS age from Phase 2).
4. Explicitly un-evaluated signal transparency tags for anchor text, link velocity, and PBN footprints.
"""

import argparse
import os
import time
import math
import duckdb
import pandas as pd
import tldextract

# Configurable High-Risk TLD list
HIGH_RISK_TLDS = {
    "xyz", "top", "work", "click", "loan", "zip", "country",
    "stream", "download", "gdn", "racing", "win", "bid", "party", "trade", "science"
}

# Configurable Blocklist Set (Safe Browsing / Spamhaus / SURBL simulated or real DNSBL lookup)
KNOWN_BLOCKLIST_DOMAINS = {
    "spam-test-domain.xyz",
    "malware-phishing-example.com",
    "bad-actor-site.top",
}

def get_tld(domain):
    ext = tldextract.extract(domain)
    return ext.suffix.lower() if ext.suffix else domain.split(".")[-1].lower()

def run_spam_calculation(data_dir="pipeline/data", mock_blocklist=None):
    start_time = time.time()
    vertices_parquet = os.path.abspath(os.path.join(data_dir, "domain_vertices.parquet"))
    metadata_parquet = os.path.abspath(os.path.join(data_dir, "domain_metadata.parquet"))
    output_scores_parquet = os.path.abspath(os.path.join(data_dir, "domain_spam_scores.parquet"))
    
    print(f"=== Starting Phase 4 Spam Score Calculation Engine ===")
    print(f" Data Lineage Check:")
    print(f"  Vertices Input File : {vertices_parquet}")
    print(f"  Metadata Input File : {metadata_parquet}")
    
    if not (os.path.exists(vertices_parquet) and os.path.exists(metadata_parquet)):
        raise FileNotFoundError(f"[Data Lineage Error] Missing required input files at {data_dir}. Please run Phase 1 ingest.py and Phase 2 calculate_authority.py first.")
        
    con = duckdb.connect()
    df_domains = con.execute(f"""
        SELECT v.domain, v.in_degree_binary,
               COALESCE(m.domain_age_days, 730) AS age_days
        FROM '{vertices_parquet}' v
        LEFT JOIN '{metadata_parquet}' m ON v.domain = m.domain
    """).fetchdf()
    
    active_blocklist = set(KNOWN_BLOCKLIST_DOMAINS)
    if mock_blocklist:
        active_blocklist.update(mock_blocklist)
        
    records = []
    for idx, row in df_domains.iterrows():
        dom = row["domain"]
        age_days = int(row["age_days"])
        tld = get_tld(dom)
        
        # 1. Blocklist Hit Signal (Weight 0.50)
        is_blocked = dom in active_blocklist
        blocklist_pts = 100.0 if is_blocked else 0.0
        
        # 2. High-Risk TLD Signal (Weight 0.20)
        is_high_risk_tld = tld in HIGH_RISK_TLDS
        tld_risk_pts = 80.0 if is_high_risk_tld else 0.0
        
        # 3. Domain Age Spam Risk Signal (Weight 0.15)
        # Graduated inverse age curve (5-year ceiling): SpamAge = max(0, 100 * (1 - sqrt(age_days / 1825)))
        age_risk_ratio = math.sqrt(max(0, age_days) / (365.0 * 5.0))
        age_risk_pts = round(max(0.0, 100.0 * (1.0 - age_risk_ratio)), 1)
        
        # 4. Combination Formula
        if is_blocked:
            final_ss = 100.0  # Blocklist hits dominate score!
        else:
            weighted_sum = (0.50 * blocklist_pts) + (0.20 * tld_risk_pts) + (0.15 * age_risk_pts)
            final_ss = round(min(100.0, max(0.0, weighted_sum / 0.85)), 1)
            
        # Un-evaluated signal transparency objects
        unevaluated_signals = {
            "anchor_text_signal": {"not_evaluated": True, "reason": "Requires WAT anchor-text Common Crawl release"},
            "link_velocity_signal": {"not_evaluated": True, "reason": "Requires multi-release time-series crawl comparison"},
            "pbn_footprint_signal": {"not_evaluated": True, "reason": "Requires full WHOIS registrant & IP C-block cluster analysis"}
        }
        
        records.append({
            "domain": dom,
            "spam_score": final_ss,
            "blocklist_hit": is_blocked,
            "blocklist_signal_pts": blocklist_pts,
            "tld": tld,
            "high_risk_tld": is_high_risk_tld,
            "tld_signal_pts": tld_risk_pts,
            "domain_age_days": age_days,
            "age_spam_risk_pts": age_risk_pts,
            "calculated_at": int(time.time()),
            "anchor_text_not_evaluated": True,
            "link_velocity_not_evaluated": True,
            "pbn_footprint_not_evaluated": True
        })
        
    df_out = pd.DataFrame(records)
    con.execute("CREATE TABLE domain_spam_scores AS SELECT * FROM df_out")
    con.execute(f"COPY domain_spam_scores TO '{output_scores_parquet}' (FORMAT PARQUET)")
    
    top_spam = con.execute("""
        SELECT domain, spam_score, blocklist_hit, high_risk_tld, age_spam_risk_pts
        FROM domain_spam_scores
        ORDER BY spam_score DESC, domain_age_days ASC
        LIMIT 10
    """).fetchall()
    
    elapsed = time.time() - start_time
    
    print("\n" + "="*85)
    print("   PHASE 4 SPAM SCORE CALCULATION SUMMARY (SS)")
    print("="*85)
    print(f" Execution Time      : {elapsed:.2f} seconds")
    print(f" Total Scored Domains: {len(df_out):,}")
    print(f" Output Parquet File : {output_scores_parquet}")
    print("-" * 85)
    print(" Top 10 Domains by Spam Risk Score (SS):")
    print("-" * 85)
    print(f" {'Rank':<5} | {'Domain':<28} | {'SS (0-100)':<10} | {'Blocked?':<9} | {'Risk TLD?':<9} | {'Age Risk Pts':<12}")
    print("-" * 85)
    for idx, (dom, ss_val, blocked, risk_tld, age_pts) in enumerate(top_spam, 1):
        print(f" {idx:<5} | {dom:<28} | {ss_val:<10.1f} | {str(blocked):<9} | {str(risk_tld):<9} | {age_pts:<12.1f}")
    print("="*85 + "\n")
    
    return {
        "total_scored": len(df_out),
        "output_parquet": output_scores_parquet,
        "top_spam": top_spam
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Calculate Independent Spam Score (Phase 4)")
    parser.add_argument("--data-dir", type=str, default="pipeline/data", help="Directory containing input Parquet files")
    args = parser.parse_args()
    run_spam_calculation(data_dir=args.data_dir)
