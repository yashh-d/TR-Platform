import pandas as pd
import requests
import time
from datetime import datetime
from typing import List, Dict, Any
import logging
import random

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def fetch_stablecoin_historical_data(
    stablecoins_csv_path: str = 'stablecoins.csv',
    output_csv_path: str = 'avalanche_stablecoins_historical.csv',
    delay_between_requests: float = 0.5
) -> None:
    """
    Fetch historical data for all stablecoins on Avalanche and save to CSV.
    
    Args:
        stablecoins_csv_path: Path to the CSV file containing stablecoin data (id, name, symbol)
        output_csv_path: Path where the historical data CSV will be saved
        delay_between_requests: Delay in seconds between API requests to avoid rate limiting
    """
    
    try:
        # Read the stablecoins CSV file
        logger.info(f"Reading stablecoins from {stablecoins_csv_path}")
        stablecoins_df = pd.read_csv(stablecoins_csv_path)
        
        # Validate required columns
        required_columns = ['id', 'name', 'symbol']
        missing_columns = [col for col in required_columns if col not in stablecoins_df.columns]
        if missing_columns:
            raise ValueError(f"Missing required columns in CSV: {missing_columns}")
        
        logger.info(f"Found {len(stablecoins_df)} stablecoins to process")
        
        # List to store all historical data
        all_historical_data = []
        
        # Process each stablecoin
        for index, stablecoin in stablecoins_df.iterrows():
            stablecoin_id = stablecoin['id']
            stablecoin_name = stablecoin['name']
            stablecoin_symbol = stablecoin['symbol']
            
            logger.info(f"Processing {stablecoin_symbol} (ID: {stablecoin_id}) - {index + 1}/{len(stablecoins_df)}")
            
            # Construct the API URL
            url = f"https://stablecoins.llama.fi/stablecoincharts/avalanche?stablecoin={stablecoin_id}"
            
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    response = requests.get(url, timeout=30)
                    if response.status_code == 200:
                        try:
                            data = response.json()
                            if data and isinstance(data, list):
                                break
                            else:
                                logger.warning(f"Empty or invalid JSON for {stablecoin_symbol}")
                        except Exception as e:
                            logger.warning(f"Invalid JSON for {stablecoin_symbol}: {e}")
                        time.sleep(random.uniform(1, 3))
                    elif response.status_code == 429:
                        logger.warning("Rate limited! Sleeping for 10 seconds...")
                        time.sleep(10)
                    else:
                        logger.warning(f"Failed to fetch data: HTTP {response.status_code}")
                        time.sleep(random.uniform(1, 3))
                except Exception as e:
                    logger.warning(f"Error: {e}")
                    time.sleep(random.uniform(1, 3))
            else:
                logger.error(f"Giving up on {stablecoin_symbol} after {max_retries} attempts.")
                continue
            
            if not data or len(data) == 0:
                logger.info(f"No historical data available for {stablecoin_symbol}")
                continue
            
            # Process each historical data point
            for point in data:
                try:
                    # Convert timestamp to datetime
                    timestamp = int(point['date'])
                    date = datetime.fromtimestamp(timestamp)
                    
                    # Extract USD values with fallback to 0
                    circulating_usd = 0
                    bridged_usd = 0
                    
                    if 'totalCirculatingUSD' in point and point['totalCirculatingUSD']:
                        circulating_usd = point['totalCirculatingUSD'].get('peggedUSD', 0)
                    
                    if 'totalBridgedToUSD' in point and point['totalBridgedToUSD']:
                        bridged_usd = point['totalBridgedToUSD'].get('peggedUSD', 0)
                    
                    # Create record matching the database table structure
                    record = {
                        'stablecoin_id': stablecoin_id,
                        'stablecoin_name': stablecoin_name,
                        'stablecoin_symbol': stablecoin_symbol,
                        'date': date.strftime('%Y-%m-%d %H:%M:%S'),
                        'circulating_usd': round(float(circulating_usd), 2) if circulating_usd else 0.00,
                        'bridged_usd': round(float(bridged_usd), 2) if bridged_usd else 0.00,
                        'created_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    }
                    
                    all_historical_data.append(record)
                    
                except (KeyError, ValueError, TypeError) as e:
                    logger.warning(f"Error processing data point for {stablecoin_symbol}: {e}")
                    continue
            
            logger.info(f"Successfully processed {len([p for p in data])} data points for {stablecoin_symbol}")
            
            # Add delay between requests to avoid rate limiting
            if index < len(stablecoins_df) - 1:  # Don't delay after the last request
                time.sleep(delay_between_requests)
        
        # Convert to DataFrame and save to CSV
        if all_historical_data:
            historical_df = pd.DataFrame(all_historical_data)
            
            # Sort by date and stablecoin for better organization
            historical_df = historical_df.sort_values(['date', 'stablecoin_symbol'])
            
            # Save to CSV
            historical_df.to_csv(output_csv_path, index=False)
            logger.info(f"Successfully saved {len(historical_df)} records to {output_csv_path}")
            
            # Print summary statistics
            logger.info(f"Summary:")
            logger.info(f"- Total records: {len(historical_df)}")
            logger.info(f"- Unique stablecoins: {historical_df['stablecoin_symbol'].nunique()}")
            logger.info(f"- Date range: {historical_df['date'].min()} to {historical_df['date'].max()}")
            
        else:
            logger.warning("No historical data was collected for any stablecoins")
            
    except FileNotFoundError:
        logger.error(f"Could not find the stablecoins CSV file: {stablecoins_csv_path}")
        raise
    except Exception as e:
        logger.error(f"An error occurred: {e}")
        raise

def validate_csv_structure(csv_path: str) -> bool:
    """
    Validate that the generated CSV matches the expected database table structure.
    
    Args:
        csv_path: Path to the CSV file to validate
        
    Returns:
        bool: True if structure is valid, False otherwise
    """
    try:
        df = pd.read_csv(csv_path)
        
        expected_columns = [
            'stablecoin_id', 'stablecoin_name', 'stablecoin_symbol', 
            'date', 'circulating_usd', 'bridged_usd', 'created_at'
        ]
        
        missing_columns = [col for col in expected_columns if col not in df.columns]
        
        if missing_columns:
            logger.error(f"Missing columns in generated CSV: {missing_columns}")
            return False
        
        # Check data types
        try:
            pd.to_datetime(df['date'])
            pd.to_numeric(df['circulating_usd'])
            pd.to_numeric(df['bridged_usd'])
            pd.to_datetime(df['created_at'])
        except Exception as e:
            logger.error(f"Data type validation failed: {e}")
            return False
        
        logger.info("CSV structure validation passed")
        return True
        
    except Exception as e:
        logger.error(f"Error validating CSV structure: {e}")
        return False

# Example usage
if __name__ == "__main__":
    # Fetch historical data
    fetch_stablecoin_historical_data(
        stablecoins_csv_path='/Users/yash/TR-Platform/stablecoin.csv',
        output_csv_path='avalanche_stablecoins_historical.csv',
        delay_between_requests=2.0
    )
    
    # Validate the generated CSV
    validate_csv_structure('avalanche_stablecoins_historical.csv')