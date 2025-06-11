import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params
    
    // Get the API key from environment variables
    const elevenKey = process.env.ELEVEN_LABS_API_KEY
    
    if (!elevenKey) {
      console.error('ELEVEN_LABS_API_KEY is not configured')
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      )
    }

    console.log(`Fetching audio for conversation: ${conversationId}`)
    
    const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`, {
      method: 'GET',
      headers: {
        'Xi-Api-Key': elevenKey,
      },
    })

    console.log(`ElevenLabs response status: ${response.status}`)
    console.log(`ElevenLabs response headers:`, Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`ElevenLabs API error: ${response.status} - ${errorText}`)
      return NextResponse.json(
        { error: `Audio not available: ${response.status} - ${errorText}` },
        { status: response.status }
      )
    }

    const contentType = response.headers.get('Content-Type')
    const contentLength = response.headers.get('Content-Length')
    
    console.log(`Audio content type: ${contentType}`)
    console.log(`Audio content length: ${contentLength}`)

    const audioBuffer = await response.arrayBuffer()
    console.log(`Audio buffer size: ${audioBuffer.byteLength} bytes`)
    
    if (audioBuffer.byteLength === 0) {
      console.error('Received empty audio buffer')
      return NextResponse.json(
        { error: 'Empty audio file received' },
        { status: 204 }
      )
    }
    
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': contentType || 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600',
        'Accept-Ranges': 'bytes',
      },
    })
  } catch (error) {
    console.error('Error fetching audio:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audio' },
      { status: 500 }
    )
  }
}