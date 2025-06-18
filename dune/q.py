import pandas as pd
import csv
from dune_client.client import DuneClient
from dune_modular import execute_query, get_execution_status, get_execution_results
import time 

API_KEY = "oZQPxOB7TgG9pmz6YQAtUaJXPqBLxLov"
QUERY_ID = 5236192  # Updated to the new query ID

# Configuration: Set to True to get latest cached results, False to execute fresh query
USE_LATEST_RESULT = True  # Change this to False if you want to execute a fresh query

if USE_LATEST_RESULT:
    # Method 1: Get latest cached results using official dune-client
    print("Fetching latest cached results...")
    dune = DuneClient(API_KEY)
    query_result = dune.get_latest_result(QUERY_ID)
    
    # Extract the actual data from the result
    if hasattr(query_result, 'result') and hasattr(query_result.result, 'rows'):
        query_results = query_result.result.rows
    else:
        query_results = query_result
        
else:
    # Method 2: Execute fresh query using dune_modular
    print("Executing fresh query...")
    
    # Execute the query
    execution_id = execute_query(QUERY_ID, API_KEY)
    
    # Wait for the query to complete
    while True:
        status = get_execution_status(execution_id, API_KEY)
        if status["state"] == "QUERY_STATE_COMPLETED":
            break
        time.sleep(5)
    
    # Fetch results
    query_results = get_execution_results(execution_id, API_KEY)

# After getting query_results, convert to DataFrame first
df = pd.DataFrame(query_results)

# Check column names
print("Columns in data:", df.columns.tolist())

# Make sure the blockchain column is properly formatted
if 'blockchain' in df.columns:
    # Ensure it's a string type
    df['blockchain'] = df['blockchain'].astype(str)
    # Replace 'None' strings with actual blockchain names if needed
    if df['blockchain'].eq('None').any() or df['blockchain'].isna().any():
        print("Warning: Found None values in blockchain column")

# Save to CSV with proper encoding
df.to_csv("bitt.csv", index=False, encoding='utf-8-sig')

print("Results saved to bitt.csv")