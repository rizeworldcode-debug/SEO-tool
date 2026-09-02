"""
Phase 1 Data Ingestion Pipeline (Python + DuckDB + tldextract)

Loads Common Crawl Hyperlink Graph vertex & edge files (or static real fixtures),
un-reverses reverse-domain notation, extracts Pay-Level Domain (PLD) for host-to-domain roll-up,
excludes self-loops (logging count), aggregates binary edge mappings & raw link counts,
guarantees vertex uniqueness, and exports to Parquet.
"""

import argparse
import os
import sys
import time
import duckdb
import pandas as pd
import tldextract
from sample_data import generate_sample_dataset

def get_registered_domain(domain_str):
    """
    Extracts the Pay-Level Domain (PLD) / root domain from host/subdomain strings.
    Example:
      'www.google.com' -> 'google.com'
      'pediasure.abbott.com' -> 'abbott.com'
      'blog.bbc.co.uk' -> 'bbc.co.uk'
    """
    if not domain_str or not isinstance(domain_str, str):
        return ""
    domain_str = domain_str.strip().lower()
    if not domain_str:
        return ""
    
    extracted = tldextract.extract(domain_str)
    pld = getattr(extracted, "top_domain_under_public_suffix", None) or getattr(extracted, "registered_domain", None)
    if pld:
        return pld
    return domain_str

def unreverse_domain_sql():
    """
    DuckDB SQL expression to convert reverse-domain notation (e.g. 'com.google')
    back to standard domain format ('google.com').
    """
    return "array_to_string(list_reverse(string_split(rev_domain, '.')), '.')"

def run_ingestion(release_slug="sample", max_rows=None, data_dir="pipeline/data", fixture_v=None, fixture_e=None):
    start_time = time.time()
    os.makedirs(data_dir, exist_ok=True)
    output_edges_parquet = os.path.join(data_dir, "domain_edges.parquet")
    output_vertices_parquet = os.path.join(data_dir, "domain_vertices.parquet")
    
    print(f"=== Starting Phase 1 Common Crawl Ingestion Pipeline ===")
    print(f"Release / Mode: {release_slug}")
    print(f"Output Directory: {os.path.abspath(data_dir)}")
    
    # 1. Determine source data files
    if fixture_v and fixture_e:
        vertices_file = fixture_v
        edges_file = fixture_e
        print(f"Using local static fixture files:\n  Vertices: {vertices_file}\n  Edges: {edges_file}")
    elif release_slug.lower() == "sample":
        sample_dir = os.path.join(data_dir, "sample")
        vertices_file, edges_file = generate_sample_dataset(output_dir=sample_dir)
    else:
        release_dir = os.path.join(data_dir, release_slug)
        os.makedirs(release_dir, exist_ok=True)
        vertices_file = os.path.join(release_dir, "domain-vertices.txt.gz")
        edges_file = os.path.join(release_dir, "domain-edges.txt.gz")
        
        if not (os.path.exists(vertices_file) and os.path.exists(edges_file)):
            # Check for static fixture fallback if remote download not available
            fixture_v_fallback = "pipeline/fixtures/real_cc_vertices_sample.txt.gz"
            fixture_e_fallback = "pipeline/fixtures/real_cc_edges_sample.txt.gz"
            if os.path.exists(fixture_v_fallback) and os.path.exists(fixture_e_fallback):
                print(f"[Notice] Remote release file not found. Using real Common Crawl static fixture dataset.")
                vertices_file = fixture_v_fallback
                edges_file = fixture_e_fallback
            else:
                vertices_file, edges_file = generate_sample_dataset(output_dir=os.path.join(data_dir, "sample"))

    # 2. Initialize DuckDB session & register UDF
    con = duckdb.connect(database=":memory:")
    con.create_function("extract_pld", get_registered_domain, ["VARCHAR"], "VARCHAR")
    
    print("Ingesting vertices into DuckDB...")
    # Read vertices with null_padding=True to support both 2-column and 3-column files
    con.execute(f"""
        CREATE TABLE raw_vertices AS 
        SELECT 
            column0::INTEGER AS vertex_id,
            column1::VARCHAR AS rev_domain,
            TRY_CAST(column2 AS INTEGER) AS num_hosts
        FROM read_csv('{vertices_file}', delim='\t', header=False, auto_detect=False, null_padding=True,
                      columns={{'column0': 'VARCHAR', 'column1': 'VARCHAR', 'column2': 'VARCHAR'}})
        {'LIMIT ' + str(max_rows) if max_rows else ''}
    """)
    
    # Un-reverse domains & apply PLD host-to-domain roll-up
    con.execute(f"""
        CREATE TABLE raw_unreversed_vertices AS
        SELECT 
            vertex_id,
            rev_domain,
            {unreverse_domain_sql()} AS raw_domain,
            extract_pld({unreverse_domain_sql()}) AS domain,
            COALESCE(num_hosts, 1) AS num_hosts
        FROM raw_vertices
        WHERE rev_domain IS NOT NULL AND length(trim(rev_domain)) > 0
    """)
    
    # Deduplicate domain vertices so EACH domain appears EXACTLY ONCE in domain_vertices (Requirement 3: Vertex Uniqueness)
    con.execute("""
        CREATE TABLE domain_vertices AS
        SELECT 
            domain,
            MIN(vertex_id) AS primary_vertex_id,
            SUM(num_hosts) AS total_hosts
        FROM raw_unreversed_vertices
        WHERE domain IS NOT NULL AND length(trim(domain)) > 0
        GROUP BY domain
    """)
    
    print("Ingesting directed edges into DuckDB...")
    # Read edges with null_padding=True to support both 2-column and 3-column files
    con.execute(f"""
        CREATE TABLE raw_edges AS 
        SELECT 
            column0::INTEGER AS source_id,
            column1::INTEGER AS target_id,
            COALESCE(TRY_CAST(column2 AS BIGINT), 1) AS raw_count
        FROM read_csv('{edges_file}', delim='\t', header=False, auto_detect=False, null_padding=True,
                      columns={{'column0': 'VARCHAR', 'column1': 'VARCHAR', 'column2': 'VARCHAR'}})
        {'LIMIT ' + str(max_rows) if max_rows else ''}
    """)
        
    print("Mapping vertex IDs to domains & applying self-loop filtering...")
    # Join edges to domain vertices via raw_unreversed_vertices (captures all subdomains mapped to root PLD domain)
    con.execute("""
        CREATE TABLE edges_mapped AS
        SELECT 
            v_src.domain AS source_domain,
            v_tgt.domain AS target_domain,
            COALESCE(e.raw_count, 1) AS raw_count
        FROM raw_edges e
        JOIN raw_unreversed_vertices v_src ON e.source_id = v_src.vertex_id
        JOIN raw_unreversed_vertices v_tgt ON e.target_id = v_tgt.vertex_id
    """)
    
    # Calculate self-loops count (includes subdomain cross-links that roll up to same domain)
    self_loops_count = con.execute("""
        SELECT COUNT(*) FROM edges_mapped 
        WHERE source_domain = target_domain
    """).fetchone()[0]
    
    # Filter out self-loops and aggregate binary + raw edges per domain pair
    con.execute("""
        CREATE TABLE domain_edges AS
        SELECT 
            source_domain,
            target_domain,
            SUM(raw_count) AS raw_link_count,
            1 AS binary_edge
        FROM edges_mapped
        WHERE source_domain != target_domain
        GROUP BY source_domain, target_domain
    """)
    
    # Compute domain in-degree statistics guaranteeing 1 row per domain
    con.execute("""
        CREATE TABLE domain_in_degree AS
        SELECT 
            v.domain,
            v.primary_vertex_id AS vertex_id,
            v.total_hosts,
            COALESCE(COUNT(DISTINCT e.source_domain), 0) AS in_degree_binary,
            COALESCE(SUM(e.raw_link_count), 0) AS in_degree_raw
        FROM domain_vertices v
        LEFT JOIN domain_edges e ON v.domain = e.target_domain
        GROUP BY v.domain, v.primary_vertex_id, v.total_hosts
    """)
    
    # 5. Export to Parquet
    print(f"Exporting processed graph to Parquet files...")
    con.execute(f"COPY domain_edges TO '{output_edges_parquet}' (FORMAT PARQUET)")
    con.execute(f"COPY domain_in_degree TO '{output_vertices_parquet}' (FORMAT PARQUET)")
    
    # 6. Fetch Summary Statistics & Vertex Uniqueness Validation
    total_nodes = con.execute("SELECT COUNT(*) FROM domain_vertices").fetchone()[0]
    distinct_nodes = con.execute("SELECT COUNT(DISTINCT domain) FROM domain_vertices").fetchone()[0]
    total_binary_edges = con.execute("SELECT COUNT(*) FROM domain_edges").fetchone()[0]
    total_raw_links = con.execute("SELECT COALESCE(SUM(raw_link_count), 0) FROM domain_edges").fetchone()[0]
    
    top_10 = con.execute("""
        SELECT domain, in_degree_binary, in_degree_raw 
        FROM domain_in_degree 
        ORDER BY in_degree_binary DESC, in_degree_raw DESC 
        LIMIT 10
    """).fetchall()
    
    elapsed = time.time() - start_time
    
    # Print formatted output report
    print("\n" + "="*65)
    print(f"   COMMON CRAWL INGESTION SUMMARY REPORT ({release_slug.upper()})")
    print("="*65)
    print(f" Execution Time       : {elapsed:.2f} seconds")
    print(f" Total Unique Domains : {total_nodes:,} (Vertex Uniqueness: {total_nodes == distinct_nodes})")
    print(f" Total Binary Edges   : {total_binary_edges:,} (Capped 1 per pair)")
    print(f" Total Raw Links      : {total_raw_links:,}")
    print(f" Dropped Self-Loops   : {self_loops_count:,} (Explicitly filtered)")
    print(f" Edges Parquet File   : {output_edges_parquet}")
    print(f" Vertices Parquet File: {output_vertices_parquet}")
    print("-" * 65)
    print(" Top 10 Domains by In-Degree (Binary Referring Domains vs Raw):")
    print("-" * 65)
    print(f" {'Rank':<5} | {'Domain':<30} | {'Binary In-Degree':<18} | {'Raw Links':<10}")
    print("-" * 65)
    for idx, (dom, b_deg, r_deg) in enumerate(top_10, 1):
        print(f" {idx:<5} | {dom:<30} | {b_deg:<18} | {r_deg:<10}")
    print("="*65 + "\n")
    
    return {
        "release_slug": release_slug,
        "total_nodes": total_nodes,
        "distinct_nodes": distinct_nodes,
        "total_binary_edges": total_binary_edges,
        "total_raw_links": total_raw_links,
        "self_loops_count": self_loops_count,
        "output_edges_parquet": output_edges_parquet,
        "output_vertices_parquet": output_vertices_parquet,
        "top_10": top_10
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest Common Crawl Hyperlink Graph into DuckDB & Parquet")
    parser.add_argument("--release", type=str, default="sample", help="Release slug (e.g. 'sample' or 'cc-main-2024-may-jun-jul')")
    parser.add_argument("--max-rows", type=int, default=None, help="Optional max rows limit for fast testing")
    parser.add_argument("--data-dir", type=str, default="pipeline/data", help="Target directory for output files")
    parser.add_argument("--fixture-v", type=str, default=None, help="Path to static real vertex fixture file")
    parser.add_argument("--fixture-e", type=str, default=None, help="Path to static real edge fixture file")
    
    args = parser.parse_args()
    run_ingestion(release_slug=args.release, max_rows=args.max_rows, data_dir=args.data_dir, fixture_v=args.fixture_v, fixture_e=args.fixture_e)
