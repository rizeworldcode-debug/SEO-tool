"""
Stage 2 Rollout Execution Script (pipeline/run_stage2.py)

Executes Phase 1 - Phase 4 pipeline over 500,000-domain single Common Crawl segment.
Measures peak RAM (RSS), execution time, and tests igraph vs DuckDB memory pressure.
"""

import os
import sys
import time
import resource
import duckdb

sys.path.append(os.path.dirname(__file__))

from fixtures.generate_stage2_segment import generate_stage2_segment
from ingest import run_ingestion
from enrich_domain import enrich_domain_metadata
from calculate_authority import run_authority_calculation
from calculate_spam import run_spam_calculation
from sync_to_mongo import sync_parquet_to_mongo

def run_stage2_rollout():
    stage2_data_dir = os.path.abspath("pipeline/data/stage2_segment")
    os.makedirs(stage2_data_dir, exist_ok=True)
    
    print("\n" + "="*80)
    print("   STAGE 2 ROLLOUT BENCHMARK — 500,000 DOMAIN SINGLE SEGMENT")
    print("="*80)
    
    # 1. Generate Stage 2 Segment
    generate_stage2_segment(output_dir="pipeline/fixtures")
    
    vertices_gz = os.path.abspath("pipeline/fixtures/real_cc_vertices_stage2.txt.gz")
    edges_gz = os.path.abspath("pipeline/fixtures/real_cc_edges_stage2.txt.gz")
    
    start_time = time.time()
    
    # 2. Ingest
    print("\n--> Step 1: Running Ingestion (DuckDB PLD roll-up)...")
    t0 = time.time()
    run_ingestion(fixture_v=vertices_gz, fixture_e=edges_gz, data_dir=stage2_data_dir)
    t_ingest = time.time() - t0
    
    # 3. Enrich
    print("\n--> Step 2: Running Metadata Enrichment (WHOIS / HTTPS)...")
    t0 = time.time()
    enrich_domain_metadata(data_dir=stage2_data_dir)
    t_enrich = time.time() - t0
    
    # 4. Authority
    print("\n--> Step 3: Running Authority Score Calculation (igraph PageRank)...")
    t0 = time.time()
    run_authority_calculation(data_dir=stage2_data_dir)
    t_authority = time.time() - t0
    
    # 5. Spam
    print("\n--> Step 4: Running Spam Score Calculation...")
    t0 = time.time()
    run_spam_calculation(data_dir=stage2_data_dir)
    t_spam = time.time() - t0
    
    # 6. Mongo Sync
    print("\n--> Step 5: Running Mongo Sync...")
    t0 = time.time()
    sync_parquet_to_mongo(data_dir=stage2_data_dir)
    t_sync = time.time() - t0
    
    total_time = time.time() - start_time
    max_rss_mb = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / (1024 * 1024)
    
    print("\n" + "="*80)
    print("   STAGE 2 ROLLOUT BENCHMARK SUMMARY (500,000 DOMAINS)")
    print("="*80)
    print(f" Ingest Runtime    : {t_ingest:.3f} s")
    print(f" Enrich Runtime    : {t_enrich:.3f} s")
    print(f" Authority Runtime : {t_authority:.3f} s")
    print(f" Spam Runtime      : {t_spam:.3f} s")
    print(f" Sync Runtime      : {t_sync:.3f} s")
    print(f" Total Execution   : {total_time:.3f} s")
    print(f" Peak Memory (RSS) : {max_rss_mb:.2f} MB")
    print("="*80 + "\n")
    
    return {
        "total_time": total_time,
        "peak_rss_mb": max_rss_mb
    }

if __name__ == "__main__":
    run_stage2_rollout()
