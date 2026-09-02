"""
Unit Test Suite for Phase 4 Spam Score Engine (pipeline/test_spam.py)

Verifies:
1. Spam Scores bounded strictly in [0, 100].
2. Blocklist domination (domain on blocklist scores SS = 100.0).
3. Domain age spam risk scaling (brand-new domain > 10-year domain risk).
4. Un-evaluated signal transparency tags (anchor_text, link_velocity, pbn_footprint).
5. Data Lineage Guard (test_05_spam_data_lineage_guard).
6. Row-Level Formula Consistency (test_06_row_level_formula_consistency): Asserts every row's SS matches formula on stored row inputs.
"""

import os
import shutil
import unittest
import duckdb
import pandas as pd
from calculate_spam import run_spam_calculation

class TestSpamCalculation(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        cls.data_dir = "pipeline/data"
        
    def test_01_spam_score_bounds_and_parquet_creation(self):
        """Test that Spam Scores are generated and bounded in [0, 100]."""
        res = run_spam_calculation(data_dir=self.data_dir)
        self.assertTrue(os.path.exists(res["output_parquet"]))
        self.assertGreater(res["total_scored"], 0)
        
        con = duckdb.connect()
        scores = con.execute(f"SELECT spam_score FROM '{res['output_parquet']}'").fetchall()
        for (ss_val,) in scores:
            self.assertGreaterEqual(ss_val, 0.0)
            self.assertLessEqual(ss_val, 100.0)

    def test_02_blocklist_domination(self):
        """
        Validation Test:
        Asserts that a domain on a blocklist receives SS = 100.0 regardless of domain age or TLD.
        """
        test_dir = "pipeline/data/test_run/spam_blocklist_guard"
        os.makedirs(test_dir, exist_ok=True)
        
        v_df = pd.DataFrame([
            {"domain": "malicious-phishing-site.xyz", "in_degree_binary": 0, "in_degree_raw": 0},
            {"domain": "clean-old-site.com", "in_degree_binary": 50, "in_degree_raw": 50},
        ])
        m_df = pd.DataFrame([
            {"domain": "malicious-phishing-site.xyz", "creation_date": "1995-01-01", "domain_age_days": 10000, "age_component": 100.0, "https_score": 50.0, "enriched_at": 1},
            {"domain": "clean-old-site.com", "creation_date": "1997-09-15", "domain_age_days": 10000, "age_component": 100.0, "https_score": 50.0, "enriched_at": 1},
        ])
        
        con = duckdb.connect()
        v_path = os.path.join(test_dir, "domain_vertices.parquet")
        m_path = os.path.join(test_dir, "domain_metadata.parquet")
        con.execute("CREATE TABLE v AS SELECT * FROM v_df")
        con.execute(f"COPY v TO '{v_path}' (FORMAT PARQUET)")
        con.execute("CREATE TABLE m AS SELECT * FROM m_df")
        con.execute(f"COPY m TO '{m_path}' (FORMAT PARQUET)")
        
        # Run spam calculation with mock blocklist containing malicious-phishing-site.xyz
        res = run_spam_calculation(data_dir=test_dir, mock_blocklist={"malicious-phishing-site.xyz"})
        
        blocked_ss = con.execute(f"SELECT spam_score FROM '{res['output_parquet']}' WHERE domain = 'malicious-phishing-site.xyz'").fetchone()[0]
        clean_ss = con.execute(f"SELECT spam_score FROM '{res['output_parquet']}' WHERE domain = 'clean-old-site.com'").fetchone()[0]
        
        self.assertEqual(blocked_ss, 100.0, "Blocklist hit domain MUST receive maximum Spam Score 100.0")
        self.assertLess(clean_ss, 10.0, "Clean old domain MUST receive low Spam Score (< 10.0)")
        
        shutil.rmtree(test_dir, ignore_errors=True)
        print(f"\n[Validation Test 02 Passed] Blocklist Domination Verified: Blocked site SS = {blocked_ss}, Clean site SS = {clean_ss}.")

    def test_03_domain_age_spam_risk(self):
        """
        Validation Test:
        Asserts that a brand-new domain (0 days old) receives higher spam risk than an old established domain (10+ yrs old).
        """
        test_dir = "pipeline/data/test_run/spam_age_risk_guard"
        os.makedirs(test_dir, exist_ok=True)
        
        v_df = pd.DataFrame([
            {"domain": "brand-new-registered-domain.com", "in_degree_binary": 0, "in_degree_raw": 0},
            {"domain": "old-established-domain.com", "in_degree_binary": 0, "in_degree_raw": 0},
        ])
        m_df = pd.DataFrame([
            {"domain": "brand-new-registered-domain.com", "creation_date": "2026-08-18", "domain_age_days": 0, "age_component": 0.0, "https_score": 50.0, "enriched_at": 1},
            {"domain": "old-established-domain.com", "creation_date": "2010-01-01", "domain_age_days": 6000, "age_component": 90.6, "https_score": 50.0, "enriched_at": 1},
        ])
        
        con = duckdb.connect()
        v_path = os.path.join(test_dir, "domain_vertices.parquet")
        m_path = os.path.join(test_dir, "domain_metadata.parquet")
        con.execute("CREATE TABLE v AS SELECT * FROM v_df")
        con.execute(f"COPY v TO '{v_path}' (FORMAT PARQUET)")
        con.execute("CREATE TABLE m AS SELECT * FROM m_df")
        con.execute(f"COPY m TO '{m_path}' (FORMAT PARQUET)")
        
        res = run_spam_calculation(data_dir=test_dir)
        
        new_ss = con.execute(f"SELECT spam_score FROM '{res['output_parquet']}' WHERE domain = 'brand-new-registered-domain.com'").fetchone()[0]
        old_ss = con.execute(f"SELECT spam_score FROM '{res['output_parquet']}' WHERE domain = 'old-established-domain.com'").fetchone()[0]
        
        self.assertGreater(new_ss, old_ss, "Brand-new domain must receive higher spam risk than 10-year old domain")
        self.assertGreater(new_ss - old_ss, 15.0, "Age spam risk gap must be meaningful (> 15 points)")
        
        shutil.rmtree(test_dir, ignore_errors=True)
        print(f"\n[Validation Test 03 Passed] Domain Age Spam Risk Verified: Brand-new site SS ({new_ss}) > Old site SS ({old_ss}).")

    def test_04_unevaluated_signal_transparency(self):
        """
        Validation Test:
        Asserts that anchor_text_not_evaluated, link_velocity_not_evaluated, and pbn_footprint_not_evaluated are explicitly set to True.
        """
        res = run_spam_calculation(data_dir=self.data_dir)
        con = duckdb.connect()
        
        tags = con.execute(f"""
            SELECT anchor_text_not_evaluated, link_velocity_not_evaluated, pbn_footprint_not_evaluated
            FROM '{res['output_parquet']}' LIMIT 1
        """).fetchone()
        
        self.assertTrue(tags[0], "anchor_text_not_evaluated must be True")
        self.assertTrue(tags[1], "link_velocity_not_evaluated must be True")
        self.assertTrue(tags[2], "pbn_footprint_not_evaluated must be True")
        print("\n[Validation Test 04 Passed] Un-evaluated Signal Transparency Tags Verified.")

    def test_05_spam_data_lineage_guard(self):
        """
        Regression Guard Test:
        Asserts FileNotFoundError is raised if domain_vertices.parquet or domain_metadata.parquet is missing.
        """
        with self.assertRaises(FileNotFoundError):
            run_spam_calculation(data_dir="invalid/non_existent_path")
        print("\n[Regression Guard Test 05 Passed] Spam Data Lineage Guard verified.")

    def test_06_row_level_formula_consistency(self):
        """
        Regression Guard Test 06:
        Asserts that for EVERY row in domain_spam_scores.parquet, stored spam_score matches
        the two-tier formula applied to that SAME row's own sub-signal inputs.
        """
        res = run_spam_calculation(data_dir=self.data_dir)
        con = duckdb.connect()
        
        df_all = con.execute(f"""
            SELECT domain, spam_score, blocklist_hit, blocklist_signal_pts, tld_signal_pts, age_spam_risk_pts
            FROM '{res['output_parquet']}'
        """).fetchdf()
        
        self.assertGreater(len(df_all), 0)
        
        mismatch_count = 0
        for idx, row in df_all.iterrows():
            dom = row["domain"]
            stored_ss = float(row["spam_score"])
            is_blocked = bool(row["blocklist_hit"])
            b_pts = float(row["blocklist_signal_pts"])
            t_pts = float(row["tld_signal_pts"])
            a_pts = float(row["age_spam_risk_pts"])
            
            if is_blocked:
                expected_ss = 100.0
            else:
                weighted_sum = (0.50 * b_pts) + (0.20 * t_pts) + (0.15 * a_pts)
                expected_ss = round(min(100.0, max(0.0, weighted_sum / 0.85)), 1)
                
            self.assertEqual(stored_ss, expected_ss, f"Row formula mismatch for {dom}: stored {stored_ss} != expected {expected_ss}")
            
        print(f"\n[Regression Guard Test 06 Passed] Row-Level Formula Consistency Verified for all {len(df_all)} scored rows.")

if __name__ == "__main__":
    unittest.main()
