"""
Phase 3 Page Score Engine (pipeline/calculate_page.py)

Computes page-level Page Score (PS) (0-100 scale) for any given URL based on:
1. Parent Domain Authority Score (AS) loaded from verified domain_authority_scores.parquet.
2. URL Path Depth Decay (0.90^depth).
3. Query Parameter Penalty (0.95^params).
4. Direct Page Inbound Link Boost (1 + 0.1 * ln(1 + page_in_links)).
"""

import argparse
import os
import math
import urllib.parse
import duckdb
import tldextract

def get_pld(hostname):
    ext = tldextract.extract(hostname)
    pld = getattr(ext, "top_domain_under_public_suffix", None) or getattr(ext, "registered_domain", None)
    return pld if pld else hostname

def calculate_page_score(url, data_dir="pipeline/data", page_in_links=0):
    """
    Computes Page Score (PS) for a URL string.
    """
    scores_parquet = os.path.abspath(os.path.join(data_dir, "domain_authority_scores.parquet"))
    
    if not os.path.exists(scores_parquet):
        raise FileNotFoundError(f"[Data Lineage Error] Missing verified domain authority scores file at {scores_parquet}. Please run Phase 2 calculate_authority.py first.")
        
    parsed = urllib.parse.urlparse(url if "://" in url else f"https://{url}")
    hostname = parsed.netloc or parsed.path.split("/")[0]
    domain = get_pld(hostname)
    
    # 1. Fetch parent domain Authority Score from verified Parquet
    con = duckdb.connect()
    row = con.execute(f"SELECT authority_score FROM '{scores_parquet}' WHERE domain = '{domain}'").fetchone()
    
    if row:
        parent_as = float(row[0])
    else:
        # Default baseline for unknown / unindexed domains
        parent_as = 10.0
        
    # 2. Compute URL Path Depth
    path_segments = [p for p in parsed.path.split("/") if p.strip()]
    path_depth = len(path_segments)
    path_penalty = 0.90 ** path_depth
    
    # 3. Compute Query Parameter Count
    query_params = urllib.parse.parse_qs(parsed.query)
    num_params = len(query_params)
    param_penalty = 0.95 ** num_params
    
    # 4. Compute Page Inbound Link Boost
    link_boost = 1.0 + 0.1 * math.log(1.0 + max(0, page_in_links))
    
    # 5. Compute Final Page Score (PS)
    raw_ps = parent_as * path_penalty * param_penalty * link_boost
    final_ps = round(min(100.0, max(0.0, raw_ps)), 1)
    
    return {
        "url": url,
        "domain": domain,
        "page_score": final_ps,
        "parent_authority_score": parent_as,
        "path_depth": path_depth,
        "path_penalty": round(path_penalty, 4),
        "num_query_params": num_params,
        "param_penalty": round(param_penalty, 4),
        "page_in_links": page_in_links,
        "link_boost": round(link_boost, 4),
        "data_source_parquet": scores_parquet
    }

def main():
    parser = argparse.ArgumentParser(description="Calculate Page Score for a URL (Phase 3)")
    parser.add_argument("--url", type=str, default="https://google.com/search/docs/crawling-indexing/overview?ref=1", help="Target URL to score")
    parser.add_argument("--data-dir", type=str, default="pipeline/data", help="Directory containing domain_authority_scores.parquet")
    parser.add_argument("--links", type=int, default=0, help="Direct page-level inbound link count")
    args = parser.parse_args()
    
    res = calculate_page_score(url=args.url, data_dir=args.data_dir, page_in_links=args.links)
    
    print("\n" + "="*70)
    print("   PHASE 3 PAGE SCORE CALCULATION (PS)")
    print("="*70)
    print(f" URL                     : {res['url']}")
    print(f" Domain                  : {res['domain']}")
    print(f" Parent Domain AS        : {res['parent_authority_score']}")
    print(f" Path Depth ({res['path_depth']} segs)      : {res['path_penalty']} penalty factor")
    print(f" Query Params ({res['num_query_params']} params)   : {res['param_penalty']} penalty factor")
    print(f" Link Boost ({res['page_in_links']} in-links) : {res['link_boost']} boost factor")
    print("-" * 70)
    print(f" FINAL PAGE SCORE (PS)   : {res['page_score']} / 100.0")
    print("="*70 + "\n")

if __name__ == "__main__":
    main()
