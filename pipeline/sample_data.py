"""
Sample Data Generator for Common Crawl Hyperlink Graph (Phase 1 Testing)

Generates gzipped tab-separated vertex and edge files matching Common Crawl's
domain-level web graph format.
Vertices format (3 columns): vertex_id \t reverse_domain_name \t num_hosts
Edges format (2 or 3 columns): source_vertex_id \t target_vertex_id [\t count]
"""

import gzip
import os
import random

def generate_sample_dataset(output_dir="pipeline/data/sample", seed=42):
    if seed is not None:
        random.seed(seed)
    os.makedirs(output_dir, exist_ok=True)
    
    vertices_file = os.path.join(output_dir, "sample-domain-vertices.txt.gz")
    edges_file = os.path.join(output_dir, "sample-domain-edges.txt.gz")
    
    # 1. Define domains in reverse-domain notation (matching Common Crawl's format)
    # List of (vertex_id, reverse_domain, normal_domain, num_hosts)
    known_domains = [
        (0, "com.google", "google.com", 1500),
        (1, "org.wikipedia", "wikipedia.org", 800),
        (2, "com.github", "github.com", 450),
        (3, "com.nytimes", "nytimes.com", 300),
        (4, "com.stackoverflow", "stackoverflow.com", 250),
        (5, "com.medium", "medium.com", 180),
        (6, "org.niche-established-blog", "niche-established-blog.org", 5),
        (7, "com.local-business-sample", "local-business-sample.com", 2),
        (8, "xyz.new-unranked-site", "new-unranked-site.xyz", 1),
        (9, "xyz.spammy-template-site", "spammy-template-site.xyz", 1),
        (10, "xyz.toxic-pbn-hub", "toxic-pbn-hub.xyz", 1),
        # Add host/subdomain entries to test host-to-domain rollup:
        (11, "com.google.www", "www.google.com", 1),
        (12, "com.google.blog", "blog.google.com", 1),
        (13, "org.wikipedia.en", "en.wikipedia.org", 1),
    ]
    
    # Add synthetic domains up to 500 nodes
    domain_pool = list(known_domains)
    for i in range(14, 500):
        tld = random.choice(["com", "org", "net", "io", "xyz", "info"])
        name = f"site-sample-{i}"
        rev_domain = f"{tld}.{name}"
        norm_domain = f"{name}.{tld}"
        domain_pool.append((i, rev_domain, norm_domain, 1))
        
    # Write Vertices File (3 columns: vertex_id \t rev_domain \t num_hosts)
    with gzip.open(vertices_file, "wt", encoding="utf-8") as f:
        for vid, rev_domain, _, hosts in domain_pool:
            f.write(f"{vid}\t{rev_domain}\t{hosts}\n")
            
    # 2. Generate Directed Edges (source_id \t target_id \t count)
    edges = []
    
    # Self-loops (MUST BE FILTERED BY INGEST.PY)
    edges.append((0, 0, 15))  # google.com -> google.com
    edges.append((1, 1, 42))  # wikipedia.org -> wikipedia.org
    edges.append((9, 9, 100)) # spammy site self-loop
    
    # Cross-subdomain self-loops (e.g. www.google.com -> google.com)
    edges.append((11, 0, 10)) # www.google.com -> google.com (rolls up to google.com -> google.com self-loop!)
    
    # Template/Footer Spam (1,000 links from ONE domain -> target 8)
    edges.append((9, 8, 1000))
    
    # Diverse Organic Links (50 distinct domains linking once each -> target 7)
    for src in range(20, 70):
        edges.append((src, 7, 1))
        
    # Heavy authority incoming links to Tier 1 anchors (nodes 0, 1, 2)
    for src in range(1, len(domain_pool)):
        if src not in (0, 11, 12):
            edges.append((src, 0, random.randint(1, 5))) # Links to google.com
        if src % 2 == 0 and src not in (1, 13):
            edges.append((src, 1, random.randint(1, 3))) # Links to wikipedia.org
        if src % 3 == 0 and src != 2:
            edges.append((src, 2, random.randint(1, 2))) # Links to github.com
        if src % 5 == 0 and src != 3:
            edges.append((src, 3, 1)) # Links to nytimes.com
            
    # Random organic background links
    for _ in range(2000):
        src = random.randint(0, len(domain_pool) - 1)
        tgt = random.randint(0, len(domain_pool) - 1)
        if src != tgt:
            edges.append((src, tgt, random.randint(1, 3)))
            
    with gzip.open(edges_file, "wt", encoding="utf-8") as f:
        for src, tgt, cnt in edges:
            f.write(f"{src}\t{tgt}\t{cnt}\n")
            
    return vertices_file, edges_file

if __name__ == "__main__":
    generate_sample_dataset()
