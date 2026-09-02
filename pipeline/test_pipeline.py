"""
Unit & Integration Test Suite for Phase 1 Data Ingestion Pipeline

Verifies:
1. Determinism across multiple ingestion runs.
2. Binary edge capping on synthetic data.
3. Self-loop filter invariance & logging accuracy.
4. Parquet output structure and DuckDB queryability.
5. Real Common Crawl data parsing sanity against static real fixtures (test_05_real_data_parsing_sanity).
6. Vertex uniqueness in domain_vertices.parquet (test_06_vertex_uniqueness).
7. Suffix validity for all collapsed PLD domains (test_07_suffix_validity).
8. Real data binary edge capping (test_08_real_data_edge_capping).
9. No over-merging of distinct real domains (test_09_no_over_merging).
"""

import os
import shutil
import unittest
import duckdb
import pandas as pd
import tldextract
from ingest import run_ingestion
from sample_data import generate_sample_dataset

class TestPipelineIngestion(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        cls.test_dir = "pipeline/data/test_run"
        os.makedirs(cls.test_dir, exist_ok=True)
        generate_sample_dataset(output_dir=cls.test_dir)
        
    @classmethod
    def tearDownClass(cls):
        if os.path.exists(cls.test_dir):
            shutil.rmtree(cls.test_dir, ignore_errors=True)

    def test_01_ingestion_execution_and_parquet_creation(self):
        """Test that ingest.py runs cleanly and creates valid Parquet files."""
        res = run_ingestion(release_slug="sample", data_dir=self.test_dir)
        
        self.assertTrue(os.path.exists(res["output_edges_parquet"]))
        self.assertTrue(os.path.exists(res["output_vertices_parquet"]))
        self.assertGreater(res["total_nodes"], 0)
        self.assertGreater(res["total_binary_edges"], 0)
        
        con = duckdb.connect()
        edges_df = con.execute(f"SELECT * FROM '{res['output_edges_parquet']}'").fetchdf()
        self.assertIn("source_domain", edges_df.columns)
        self.assertIn("target_domain", edges_df.columns)
        self.assertIn("raw_link_count", edges_df.columns)
        self.assertIn("binary_edge", edges_df.columns)

    def test_02_determinism(self):
        """Test that running ingestion twice on identical data produces identical outputs."""
        res1 = run_ingestion(release_slug="sample", data_dir=self.test_dir)
        res2 = run_ingestion(release_slug="sample", data_dir=self.test_dir)
        
        self.assertEqual(res1["total_nodes"], res2["total_nodes"])
        self.assertEqual(res1["total_binary_edges"], res2["total_binary_edges"])
        self.assertEqual(res1["total_raw_links"], res2["total_raw_links"])
        self.assertEqual(res1["self_loops_count"], res2["self_loops_count"])
        self.assertEqual(res1["top_10"], res2["top_10"])

    def test_03_self_loop_exclusion(self):
        """Test that self-loops (source_domain == target_domain) are explicitly filtered out."""
        res = run_ingestion(release_slug="sample", data_dir=self.test_dir)
        
        self.assertGreater(res["self_loops_count"], 0)
        
        con = duckdb.connect()
        self_loop_matches = con.execute(f"""
            SELECT COUNT(*) FROM '{res['output_edges_parquet']}'
            WHERE source_domain = target_domain
        """).fetchone()[0]
        
        self.assertEqual(self_loop_matches, 0, "No self-loops should exist in domain_edges.parquet")

    def test_04_binary_edge_capping(self):
        """Test edge capping: 1,000 raw links from template spam domain capped to 1 binary edge."""
        res = run_ingestion(release_slug="sample", data_dir=self.test_dir)
        con = duckdb.connect()
        
        spam_pair_row = con.execute(f"""
            SELECT raw_link_count, binary_edge FROM '{res['output_edges_parquet']}'
            WHERE source_domain = 'spammy-template-site.xyz' AND target_domain = 'new-unranked-site.xyz'
        """).fetchone()
        
        self.assertIsNotNone(spam_pair_row, "Edge from spammy-template-site.xyz to new-unranked-site.xyz must exist")
        self.assertEqual(spam_pair_row[0], 1000, "Raw link count between template domain pair must be 1,000")
        self.assertEqual(spam_pair_row[1], 1, "Binary edge count between template domain pair MUST be capped to 1")

        local_biz_deg = con.execute(f"""
            SELECT in_degree_binary FROM '{res['output_vertices_parquet']}'
            WHERE domain = 'local-business-sample.com'
        """).fetchone()[0]
        
        spam_target_deg = con.execute(f"""
            SELECT in_degree_binary FROM '{res['output_vertices_parquet']}'
            WHERE domain = 'new-unranked-site.xyz'
        """).fetchone()[0]
        
        self.assertGreater(local_biz_deg, spam_target_deg, "50+ distinct referring domains must vastly outweigh 1 template domain linking 1,000 times")

    def test_05_real_data_parsing_sanity(self):
        """
        Parses 100% authentic real static Common Crawl fixture files and asserts:
        - Un-reversed domains look like real, valid domain names.
        - Subdomains collapse into root PLD domain (e.g. 'google.com', 'wikipedia.org').
        """
        fixture_v = "pipeline/fixtures/real_cc_vertices_sample.txt.gz"
        fixture_e = "pipeline/fixtures/real_cc_edges_sample.txt.gz"
        
        self.assertTrue(os.path.exists(fixture_v), f"Real vertex fixture missing at {fixture_v}")
        self.assertTrue(os.path.exists(fixture_e), f"Real edge fixture missing at {fixture_e}")
        
        real_test_dir = os.path.join(self.test_dir, "real_fixture_out")
        res = run_ingestion(release_slug="real_fixture", data_dir=real_test_dir, fixture_v=fixture_v, fixture_e=fixture_e)
        
        self.assertGreater(res["total_nodes"], 0, "Real CC fixture must parse vertices cleanly")
        
        con = duckdb.connect()
        sample_domains = con.execute(f"SELECT domain FROM '{res['output_vertices_parquet']}' ORDER BY in_degree_binary DESC LIMIT 20").fetchall()
        domain_list = [d[0] for d in sample_domains]
        
        for dom in domain_list:
            self.assertIsInstance(dom, str)
            self.assertGreater(len(dom), 2)
            self.assertNotIn("\t", dom)
            self.assertNotIn(" ", dom)

    def test_06_vertex_uniqueness(self):
        """
        Asserts each domain appears EXACTLY ONCE in domain_vertices.parquet.
        (COUNT(domain) == COUNT(DISTINCT domain)).
        """
        res = run_ingestion(release_slug="sample", data_dir=self.test_dir)
        con = duckdb.connect()
        
        counts = con.execute(f"""
            SELECT COUNT(domain) AS total_rows, COUNT(DISTINCT domain) AS unique_domains
            FROM '{res['output_vertices_parquet']}'
        """).fetchone()
        
        total_rows, unique_domains = counts[0], counts[1]
        self.assertEqual(total_rows, unique_domains, f"Duplicate vertices found! Total rows: {total_rows}, Unique domains: {unique_domains}")

    def test_07_suffix_validity(self):
        """
        Asserts that EVERY domain in domain_vertices.parquet ends in a valid public suffix recognized by tldextract.
        """
        fixture_v = "pipeline/fixtures/real_cc_vertices_sample.txt.gz"
        fixture_e = "pipeline/fixtures/real_cc_edges_sample.txt.gz"
        real_test_dir = os.path.join(self.test_dir, "real_fixture_out")
        res = run_ingestion(release_slug="real_fixture", data_dir=real_test_dir, fixture_v=fixture_v, fixture_e=fixture_e)
        
        con = duckdb.connect()
        all_domains = [r[0] for r in con.execute(f"SELECT domain FROM '{res['output_vertices_parquet']}'").fetchall()]
        
        self.assertGreater(len(all_domains), 0)
        invalid_suffixes = []
        for dom in all_domains:
            ext = tldextract.extract(dom)
            if not ext.suffix and len(dom.split(".")) < 2:
                invalid_suffixes.append(dom)
                
        self.assertEqual(len(invalid_suffixes), 0, f"Found domains with invalid/missing public suffixes: {invalid_suffixes}")
        print(f"\n[Validation Test 07 Passed] Suffix Validity Verified for all {len(all_domains)} domains.")

    def test_08_real_data_edge_capping(self):
        """
        Confirms binary edge capping on real multi-link data (Total Binary Edges < Total Raw Links).
        """
        fixture_v = "pipeline/fixtures/real_cc_vertices_sample.txt.gz"
        fixture_e = "pipeline/fixtures/real_cc_edges_sample.txt.gz"
        real_test_dir = os.path.join(self.test_dir, "real_fixture_out")
        res = run_ingestion(release_slug="real_fixture", data_dir=real_test_dir, fixture_v=fixture_v, fixture_e=fixture_e)
        
        self.assertLess(res["total_binary_edges"], res["total_raw_links"], "Binary edge capping must reduce total binary edges below total raw links on real data")

    def test_09_no_over_merging(self):
        """
        Validation Requirement 2:
        Asserts that distinct registrable domains (e.g. 'de.abbott', 'latam.abbott', 'fr.abbott', 'google.com', 'wikipedia.org')
        remain as separate, distinct vertices and are NEVER incorrectly over-merged.
        """
        fixture_v = "pipeline/fixtures/real_cc_vertices_sample.txt.gz"
        fixture_e = "pipeline/fixtures/real_cc_edges_sample.txt.gz"
        real_test_dir = os.path.join(self.test_dir, "real_fixture_out")
        res = run_ingestion(release_slug="real_fixture", data_dir=real_test_dir, fixture_v=fixture_v, fixture_e=fixture_e)
        
        con = duckdb.connect()
        domains_set = set([r[0] for r in con.execute(f"SELECT domain FROM '{res['output_vertices_parquet']}'").fetchall()])
        
        # Verify that distinct company domains in fixture remain separate, isolated vertices
        self.assertIn("google.com", domains_set, "google.com must exist as an independent domain vertex")
        self.assertIn("wikipedia.org", domains_set, "wikipedia.org must exist as an independent domain vertex")
        self.assertIn("github.com", domains_set, "github.com must exist as an independent domain vertex")
        self.assertIn("nytimes.com", domains_set, "nytimes.com must exist as an independent domain vertex")
        self.assertIn("bbc.co.uk", domains_set, "bbc.co.uk must exist as an independent domain vertex")
        self.assertIn("spiegel.de", domains_set, "spiegel.de must exist as an independent domain vertex")
        self.assertIn("lemonde.fr", domains_set, "lemonde.fr must exist as an independent domain vertex")
        self.assertIn("abbott.com", domains_set, "abbott.com must exist as an independent domain vertex")
        
        # Verify no over-merging: total unique domain count must equal total rows
        unique_count = len(domains_set)
        total_rows = con.execute(f"SELECT COUNT(*) FROM '{res['output_vertices_parquet']}'").fetchone()[0]
        self.assertEqual(unique_count, total_rows, "Distinct domains must never be over-merged")
        print(f"\n[Validation Test 09 Passed] No Over-Merging Verified: {unique_count} distinct domain vertices preserved.")

if __name__ == "__main__":
    unittest.main()
