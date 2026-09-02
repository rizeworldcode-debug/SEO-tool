"""
Stage 2 Single Segment Generator (pipeline/fixtures/generate_stage2_segment.py)

Generates a realistic 500,000 PLD domain single-segment Common Crawl graph shard (~2.5 million edges)
to benchmark peak memory usage, WHOIS batching, and DuckDB Parquet write performance at 500k scale.
"""

import os
import gzip

def generate_stage2_segment(output_dir="pipeline/fixtures"):
    os.makedirs(output_dir, exist_ok=True)
    
    vertices_gz = os.path.join(output_dir, "real_cc_vertices_stage2.txt.gz")
    edges_gz = os.path.join(output_dir, "real_cc_edges_stage2.txt.gz")
    
    if os.path.exists(vertices_gz) and os.path.exists(edges_gz):
        print(f"[Stage 2] Single segment fixture already exists at {vertices_gz}. Skipping generation.")
        return
        
    tlds = ["com", "org", "net", "io", "de", "fr", "co.uk", "xyz", "top", "work", "info", "online", "store", "tech", "site"]
    
    anchors = ["google.com", "abbott.com", "wikipedia.org", "nytimes.com", "lemonde.fr", "github.com", "stackoverflow.com", "archive.org", "bbc.co.uk", "spiegel.de"]
    
    total_domains_count = 500000
    print(f"Generating Stage 2 single segment with {total_domains_count:,} unique PLD domains...")
    
    with gzip.open(vertices_gz, "wt", encoding="utf-8") as f_v:
        # Write anchors
        for idx, dom in enumerate(anchors):
            parts = dom.split(".")
            rev = ".".join(reversed(parts))
            f_v.write(f"{idx}\t{rev}\n")
            
        for i in range(len(anchors), total_domains_count):
            tld = tlds[i % len(tlds)]
            dom = f"domain-shard-{i}.{tld}"
            parts = dom.split(".")
            rev = ".".join(reversed(parts))
            f_v.write(f"{i}\t{rev}\n")
            
    print(f" Vertices GZ created at {vertices_gz}")
    
    print(f"Generating ~2.5 Million binary edges...")
    with gzip.open(edges_gz, "wt", encoding="utf-8") as f_e:
        edge_count = 0
        for src in range(total_domains_count):
            num_links = 5 if src < 1000 else ((src % 7) + 1)
            for k in range(num_links):
                if (src + k) % 2 == 0:
                    tgt = (k % len(anchors))  # Heavy links into top authority anchors
                else:
                    tgt = (src + k * 101) % total_domains_count
                    
                if src != tgt:
                    f_e.write(f"{src}\t{tgt}\n")
                    edge_count += 1
                    
    print(f" Successfully generated Stage 2 single segment: {total_domains_count:,} vertices, {edge_count:,} edges.")

if __name__ == "__main__":
    generate_stage2_segment()
