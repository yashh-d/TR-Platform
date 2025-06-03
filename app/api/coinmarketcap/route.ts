import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    
    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Slug parameter is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.COINMARKETCAP_API
    console.log('API Key exists:', !!apiKey)
    console.log('API Key length:', apiKey?.length || 0)
    
    if (!apiKey) {
      console.log('No API key found in environment variables')
      return NextResponse.json(
        { success: false, error: 'CoinMarketCap API key not configured' },
        { status: 500 }
      )
    }

    // Use production API endpoint with slug parameter
    const url = `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?slug=${slug}&aux=circulating_supply,total_supply,max_supply`
    
    const response = await fetch(url, {
      headers: {
        'X-CMC_PRO_API_KEY': apiKey,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`CoinMarketCap API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('CoinMarketCap API response:', JSON.stringify(data, null, 2))
    
    // V2 endpoint with slug returns data as an object with slug keys
    if (data && data.data && data.data[slug]) {
      const coinData = data.data[slug]
      console.log('Coin data found:', coinData.name, coinData.symbol)
      return NextResponse.json({
        success: true,
        data: [coinData] // Wrap in array to match expected format
      })
    }
    
    console.log('No valid data found in response')
    return NextResponse.json(
      { success: false, error: 'No data found for slug', receivedData: data },
      { status: 404 }
    )

  } catch (error) {
    console.error('CoinMarketCap API error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch data from CoinMarketCap',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 