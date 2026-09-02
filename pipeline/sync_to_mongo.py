"""
Parquet to MongoDB Sync Engine (pipeline/sync_to_mongo.py)

Reads verified Parquet outputs (domain_authority_scores.parquet, domain_spam_scores.parquet,
domain_metadata.parquet) and syncs them into MongoDB collection domain_scores.
Also exports production domain_scores_mongo.json for Express API fallback.
"""

import os
import sys
import json
import duckdb
import pandas as pd

try:
    from .config import FRONTEND_URL, BACKEND_API_URL
except ImportError:
    from config import FRONTEND_URL, BACKEND_API_URL

def sync_parquet_to_mongo(data_dir="pipeline/data", mongo_uri=None):
    authority_parquet = os.path.abspath(os.path.join(data_dir, "domain_authority_scores.parquet"))
    spam_parquet = os.path.abspath(os.path.join(data_dir, "domain_spam_scores.parquet"))
    metadata_parquet = os.path.abspath(os.path.join(data_dir, "domain_metadata.parquet"))
    output_json = os.path.abspath(os.path.join(data_dir, "domain_scores_mongo.json"))
    
    print(f"=== Starting MongoDB Sync Engine ===")
    print(f" Data Lineage Check:")
    print(f"  Authority File : {authority_parquet}")
    print(f"  Spam File      : {spam_parquet}")
    
    if not (os.path.exists(authority_parquet) and os.path.exists(spam_parquet)):
        raise FileNotFoundError(f"[Data Lineage Error] Missing required Parquet files at {data_dir}. Please run Phase 2 and Phase 4 first.")
        
    con = duckdb.connect()
    merged_df = con.execute(f"""
        SELECT a.domain,
               a.authority_score AS authorityScore,
               a.authority_score AS pageScore,
               s.spam_score AS spamScore,
               a.referring_domains_binary AS referringDomainsBinary,
               a.raw_links_total AS rawLinksTotal,
               a.pagerank_component AS pagerankComponent,
               a.age_component AS ageComponent,
               a.security_diversity_component AS securityDiversityComponent,
               a.domain_age_days AS domainAgeDays,
               s.blocklist_hit AS blocklistHit,
               s.high_risk_tld AS highRiskTLD,
               s.age_spam_risk_pts AS ageSpamRiskPts,
               s.anchor_text_not_evaluated AS anchorTextNotEvaluated,
               s.link_velocity_not_evaluated AS linkVelocityNotEvaluated,
               s.pbn_footprint_not_evaluated AS pbnFootprintNotEvaluated,
               a.calculated_at AS lastCalculatedAt
        FROM '{authority_parquet}' a
        JOIN '{spam_parquet}' s ON a.domain = s.domain
    """).fetchdf()
    
    records = []
    for idx, row in merged_df.iterrows():
        records.append({
            "domain": row["domain"],
            "authorityScore": float(row["authorityScore"]),
            "pageScore": float(row["pageScore"]),
            "spamScore": float(row["spamScore"]),
            "referringDomainsBinary": int(row["referringDomainsBinary"]),
            "rawLinksTotal": int(row["rawLinksTotal"]),
            "subSignals": {
                "pagerankComponent": float(row["pagerankComponent"]),
                "ageComponent": float(row["ageComponent"]),
                "securityDiversityComponent": float(row["securityDiversityComponent"]),
                "domainAgeDays": int(row["domainAgeDays"]),
                "blocklistHit": bool(row["blocklistHit"]),
                "highRiskTLD": bool(row["highRiskTLD"]),
                "ageSpamRiskPts": float(row["ageSpamRiskPts"]),
                "anchorTextNotEvaluated": bool(row["anchorTextNotEvaluated"]),
                "linkVelocityNotEvaluated": bool(row["linkVelocityNotEvaluated"]),
                "pbnFootprintNotEvaluated": bool(row["pbnFootprintNotEvaluated"]),
            },
            "disclaimer": "These SEO metrics (Authority Score, Page Score, Spam Score) are independently calculated and computed by our self-hosted SEO metrics engine. They are NOT Moz's proprietary DA, PA, or Spam Score metrics.",
            "lastCalculatedAt": int(row["lastCalculatedAt"])
        })
        
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2)
        
    print(f" Synced {len(records):,} domain records into {output_json}")
    
    # Try MongoDB PyMongo Sync if pymongo installed & mongo_uri provided
    mongo_synced = False
    try:
        import pymongo
        uri = mongo_uri or os.getenv("MONGO_URI", "mongodb://localhost:27017/seo_tool_db")
        client = pymongo.MongoClient(uri, serverSelectionTimeoutMS=2000)
        client.admin.command('ping')
        db = client.get_database()
        collection = db["domain_scores"]
        
        for r in records:
            collection.update_one({"domain": r["domain"]}, {"$set": r}, upsert=True)
            
        print(f" Successfully synced {len(records):,} domain records directly into MongoDB ({uri})")
        mongo_synced = True
    except Exception as e:
        print(f" MongoDB Connection Notice: {e}. Output saved cleanly to JSON file {output_json}.")
        
    return {
        "synced_records": len(records),
        "json_path": output_json,
        "mongo_synced": mongo_synced
    }

if __name__ == "__main__":
    sync_parquet_to_mongo()
