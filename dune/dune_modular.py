import requests
import json
import time
import os

p_map = {'avalanche' : [4488181, 4520939], 
'aptos' : [4525896, 4513061, 4513114],
'polygon' : [4429367, 4522117,1480029],
'polygon gaming': [1273879,1480029,3613078],
'pos': [4547776],
'polygon dapps': [2261160],
'optimism' : [4488197],
'injective' : [4521597], 
'sei' : [4488192,4522139],
'injective': [4521597],
'matchain': [4497195],
'core': [4497145, 4524092, 4524322, 4497658]}

def execute_query(query_id, api_key):
    """Executes a query using the Dune API."""
    url = f"https://api.dune.com/api/v1/query/{query_id}/execute"
    headers = {"X-DUNE-API-KEY": api_key}

    response = requests.request("POST", url, headers=headers)
    response_data = response.json()

    if response.status_code == 200:
        print("Query executed:")
        print(json.dumps(response_data, indent=4))
        return response_data["execution_id"]
    else:
        raise Exception(f"Failed to execute query: {json.dumps(response_data, indent=4)}")

def get_execution_status(execution_id, api_key):
    """Fetches the execution status of a query."""
    url = f"https://api.dune.com/api/v1/execution/{execution_id}/status"
    headers = {"X-DUNE-API-KEY": api_key}

    response = requests.request("GET", url, headers=headers)
    response_data = response.json()

    if response.status_code == 200:
        print("Execution status:")
        print(json.dumps(response_data, indent=4))
        return response_data
    else:
        raise Exception(f"Failed to get execution status: {json.dumps(response_data, indent=4)}")

def get_execution_results(execution_id, api_key):
    """Fetches the results of a query execution."""
    url = f"https://api.dune.com/api/v1/execution/{execution_id}/results"
    headers = {"X-DUNE-API-KEY": api_key}

    response = requests.request("GET", url, headers=headers)
    response_data = response.json()

    if response.status_code == 200:
        print("Execution results:")
        print(json.dumps(response_data, indent=4))
        return response_data["result"]["rows"]
    else:
        raise Exception(f"Failed to get execution results: {json.dumps(response_data, indent=4)}")

from datetime import datetime

def pick_query(protocol):
    p = protocol.lower()
    if p in p_map:
        return p_map[p]
    else:
        print("Not a valid ecosystem :(")
        return None
