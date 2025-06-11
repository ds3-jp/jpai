import { useState, useRef, useEffect } from 'react'

interface UseAudioPlayerProps {
  src?: string
  onLoadedData?: () => void
  onError?: (error: string) => void
}

export const useAudioPlayer = ({ src, onLoadedData, onError }: UseAudioPlayerProps = {}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!src) {
      // Clean up existing audio
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
        audioRef.current = null
      }
      setIsPlaying(false)
      setCurrentTime(0)
      setDuration(0)
      setIsLoading(false)
      setError(null)
      return
    }

    console.log('Loading audio from URL:', src)
    console.log('URL type:', src.startsWith('blob:') ? 'blob' : 'regular')

    // Create audio element
    const audio = new Audio()
    audioRef.current = audio

    const handleLoadedData = () => {
      console.log('Audio loaded successfully, duration:', audio.duration)
      setDuration(audio.duration)
      setIsLoading(false)
      setError(null)
      onLoadedData?.()
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    const handleError = (event: any) => {
      console.error('Audio error event:', event)
      console.error('Audio error details:', {
        error: audio.error,
        networkState: audio.networkState,
        readyState: audio.readyState,
        src: audio.src
      })
      
      let errorMsg = 'Failed to load audio'
      
      if (audio.error) {
        switch (audio.error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMsg = 'Audio loading was aborted'
            break
          case MediaError.MEDIA_ERR_NETWORK:
            errorMsg = 'Network error while loading audio'
            break
          case MediaError.MEDIA_ERR_DECODE:
            errorMsg = 'Audio format not supported or corrupted'
            break
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMsg = 'Audio source not supported'
            break
          default:
            errorMsg = `Audio error: ${audio.error.message || 'Unknown error'}`
        }
      }
      
      setError(errorMsg)
      setIsLoading(false)
      setIsPlaying(false)
      onError?.(errorMsg)
    }

    const handleLoadStart = () => {
      console.log('Audio loading started')
      setIsLoading(true)
      setError(null)
    }

    const handleCanPlay = () => {
      console.log('Audio can start playing')
    }

    const handleLoadedMetadata = () => {
      console.log('Audio metadata loaded, duration:', audio.duration)
    }

    const handleProgress = () => {
      console.log('Audio loading progress')
    }

    const handleSuspend = () => {
      console.log('Audio loading suspended')
    }

    const handleStalled = () => {
      console.log('Audio loading stalled')
    }

    // Add event listeners before setting src
    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('loadeddata', handleLoadedData)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('progress', handleProgress)
    audio.addEventListener('suspend', handleSuspend)
    audio.addEventListener('stalled', handleStalled)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    // Set properties for better compatibility
    audio.preload = 'metadata'
    audio.crossOrigin = 'anonymous'
    
    // Set source and start loading
    audio.src = src
    console.log('Audio src set, calling load()')
    audio.load()

    return () => {
      console.log('Cleaning up audio')
      // Cleanup
      audio.removeEventListener('loadstart', handleLoadStart)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('loadeddata', handleLoadedData)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('progress', handleProgress)
      audio.removeEventListener('suspend', handleSuspend)
      audio.removeEventListener('stalled', handleStalled)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      
      audio.pause()
      audio.src = ''
    }
  }, [src, onLoadedData, onError])

  const play = () => {
    if (audioRef.current) {
      console.log('Attempting to play audio')
      console.log('Audio ready state:', audioRef.current.readyState)
      console.log('Audio network state:', audioRef.current.networkState)
      
      audioRef.current.play()
        .then(() => {
          console.log('Audio playback started successfully')
          setIsPlaying(true)
        })
        .catch((error) => {
          console.error('Error playing audio:', error)
          const errorMsg = `Failed to play audio: ${error.message}`
          setError(errorMsg)
          onError?.(errorMsg)
        })
    }
  }

  const pause = () => {
    if (audioRef.current) {
      console.log('Pausing audio')
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const seek = (time: number) => {
    if (audioRef.current && !isNaN(time) && time >= 0 && time <= duration) {
      console.log('Seeking to time:', time)
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00'
    
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return {
    isPlaying,
    currentTime,
    duration,
    isLoading,
    error,
    play,
    pause,
    seek,
    formatTime,
    progress: duration > 0 ? (currentTime / duration) * 100 : 0
  }
}