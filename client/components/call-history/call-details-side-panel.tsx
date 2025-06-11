'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Phone, 
  Clock, 
  User, 
  FileText, 
  Play, 
  Pause,
  Volume2,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Database,
  Settings
} from 'lucide-react'
import { CallRecord } from '@/app/types/call-history'
import { CallHistoryService } from '@/app/services/call-history-service'
import { useToast } from '@/hooks/use-toast'
import { useAudioPlayer } from '@/hooks/use-audio-player'

interface CallDetailsSidePanelProps {
  conversationId: string | null
  isOpen: boolean
  onClose: () => void
}

export const CallDetailsSidePanel: React.FC<CallDetailsSidePanelProps> = ({
  conversationId,
  isOpen,
  onClose,
}) => {
  const [callDetails, setCallDetails] = useState<CallRecord | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioAvailable, setAudioAvailable] = useState<boolean | null>(null)
  const [isClient, setIsClient] = useState(false)
  const { toast } = useToast()

  // Ensure we're on the client side to prevent hydration issues
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Memoize audio player configuration to prevent unnecessary recreations
  const audioPlayerConfig = useMemo(() => {
    if (!isClient) return {} // Prevent audio loading during SSR
    
    return {
      src: audioUrl || undefined,
      onError: (error: string) => {
        console.error('Audio player error:', error)
        toast({
          title: 'Audio Error',
          description: 'Failed to play audio recording',
          variant: 'destructive',
        })
      },
      onLoadedData: () => {
        console.log('Audio loaded successfully')
      }
    }
  }, [audioUrl, toast, isClient])

  // Audio player hook
  const {
    isPlaying,
    currentTime,
    duration,
    isLoading: isAudioLoading,
    error: audioError,
    play,
    pause,
    seek,
    formatTime,
    progress
  } = useAudioPlayer(audioPlayerConfig)

  // Load call details and audio when conversation ID changes
  useEffect(() => {
    if (!conversationId || !isOpen || !isClient) {
      setCallDetails(null)
      // Clean up existing audio URL
      if (audioUrl && audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl)
      }
      setAudioUrl(null)
      setAudioAvailable(null)
      return
    }

    const loadCallDetails = async () => {
      setIsLoading(true)
      try {
        // Load call details
        const details = await CallHistoryService.getCallDetails(conversationId)
        setCallDetails(details)
        
        // Only try to load audio if we have a valid conversation_id (not just recipient_id)
        if (details?.conversation_id) {
          try {
            console.log('Checking audio availability for:', details.conversation_id)
            const isAvailable = await CallHistoryService.isAudioAvailable(details.conversation_id)
            setAudioAvailable(isAvailable)
            
            if (isAvailable) {
              console.log('Audio is available, loading...')
              const newAudioUrl = await CallHistoryService.getCallAudioUrl(details.conversation_id)
              setAudioUrl(newAudioUrl)
              console.log('Audio URL created successfully')
            } else {
              console.log('Audio is not available for this conversation')
              setAudioUrl(null)
            }
          } catch (audioError) {
            console.error('Error loading audio:', audioError)
            setAudioAvailable(false)
            setAudioUrl(null)
            // Don't show error toast for audio - it's optional
          }
        } else {
          // No conversation_id available, so no audio
          setAudioAvailable(false)
          setAudioUrl(null)
        }
      } catch (error) {
        console.error('Error loading call details:', error)
        toast({
          title: 'Error',
          description: 'Failed to load call details. Please try again.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadCallDetails()
  }, [conversationId, isOpen, toast, isClient]) // Added isClient to dependencies

  // Clean up audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl && audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return 'N/A'
    
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    
    if (mins > 0) {
      return `${mins}m ${secs}s`
    }
    return `${secs}s`
  }

  const formatTimestamp = (unixTimestamp: number): string => {
    if (!isClient) return 'Loading...' // Prevent hydration mismatch
    
    try {
      const date = new Date(unixTimestamp * 1000)
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    } catch {
      return 'Invalid date'
    }
  }

  const handlePlayAudio = useCallback(() => {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }, [isPlaying, play, pause])

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    const newTime = percentage * duration
    seek(newTime)
  }, [duration, seek])

  const getStatusBadge = (callSuccess: string | null) => {
    const isSuccessful = callSuccess === 'success'
    return isSuccessful ? (
      <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">
        <CheckCircle className="w-3 h-3 mr-1" />
        Success
      </Badge>
    ) : (
      <Badge variant="destructive">
        <XCircle className="w-3 h-3 mr-1" />
        Failed
      </Badge>
    )
  }

  const renderAudioPlayer = () => {
    // Show message if no conversation_id (early call failure)
    if (!callDetails?.conversation_id) {
      return (
        <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Audio not available - call did not connect</span>
          </div>
        </div>
      )
    }

    if (audioAvailable === null || isLoading) {
      // Still checking audio availability or loading call details
      return (
        <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-3 w-full">
            {/* Play button skeleton */}
            <div className="w-16 h-8 bg-gray-300 rounded animate-pulse"></div>
            
            {/* Progress bar skeleton */}
            <div className="flex-1 h-2 bg-gray-300 rounded-full animate-pulse"></div>
            
            {/* Time display skeleton */}
            <div className="w-20 h-4 bg-gray-300 rounded animate-pulse"></div>
          </div>
        </div>
      )
    }

    if (!audioAvailable || !audioUrl) {
      // Audio not available
      return (
        <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Audio recording not available</span>
          </div>
        </div>
      )
    }

    // Audio available and loaded
    return (
      <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePlayAudio}
          disabled={isAudioLoading}
          className="flex items-center gap-2"
        >
          {isAudioLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {isAudioLoading ? 'Loading...' : isPlaying ? 'Pause' : 'Play'}
        </Button>
        
        <div 
          className="flex-1 h-2 bg-gray-200 rounded-full cursor-pointer"
          onClick={handleSeek}
        >
          <div 
            className="h-2 bg-blue-500 rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        <span className="text-sm text-muted-foreground">
          {formatTime(currentTime)} / {formatTime(duration || callDetails?.call_duration || 0)}
        </span>
      </div>
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[700px] sm:max-w-[900px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Call Details
          </SheetTitle>
          <SheetDescription>
            {conversationId ? (
              callDetails?.conversation_id 
                ? `Conversation ID: ${callDetails.conversation_id}` 
                : `Recipient ID: ${conversationId}`
            ) : 'Loading call details...'}
          </SheetDescription>
        </SheetHeader>

        <div className="h-[calc(100vh-120px)] overflow-y-auto">
          <div className="flex flex-col space-y-4 pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading call details...</span>
                </div>
              </div>
            ) : callDetails ? (
              <>
                {/* Audio Player Section */}
                <Card className='ml-4'>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Volume2 className="h-4 w-4" />
                      Call Audio
                    </CardTitle>
                    <CardDescription>
                      {audioAvailable ? 'Call recording playback' : 'Audio recording status'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {renderAudioPlayer()}
                  </CardContent>
                </Card>

                {/* Tabs Section */}
                <Tabs defaultValue="overview" className="flex-1 pl-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="overview">Overview & Data</TabsTrigger>
                    <TabsTrigger value="transcript">Transcript</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="mt-4">
                    <div className="space-y-6">
                      {/* Call Overview */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            Call Overview
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Agent ID</p>
                              <p className="font-medium">{callDetails.agent_id || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Status</p>
                              {getStatusBadge(callDetails.call_success)}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Call Time</p>
                              <p className="font-medium text-sm">{formatTimestamp(callDetails.event_timestamp)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Duration</p>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span className="font-medium">{formatDuration(callDetails.call_duration)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Add Twilio Status */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Twilio Status</p>
                              <p className="font-medium">{callDetails.call_status || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Twilio ID</p>
                              <p className="font-medium">{callDetails.twilio_id || 'N/A'}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Customer Information */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Customer Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div>
                            <p className="text-sm text-muted-foreground">Full Name</p>
                            <p className="font-medium">{callDetails.dynamic_variables?.FullName || 'N/A'}</p>
                          </div>
                          <div className="mt-4">
                            <p className="text-sm text-muted-foreground">Recipient ID</p>
                            <p className="font-medium">{callDetails.recipient_id}</p>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Data Collection Results - Only show if data exists */}
                      {callDetails.data_collection_results && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Database className="h-4 w-4" />
                              Data Collection Results
                            </CardTitle>
                            <CardDescription>
                              Extracted data from the call
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {/* Name Verification */}
                              {callDetails.data_collection_results.nameVerified && (
                                <div>
                                  <p className="text-sm font-medium mb-2">Name Verification</p>
                                  <div className="bg-muted p-3 rounded-md">
                                    <p className="text-sm"><strong>Result:</strong> {callDetails.data_collection_results.nameVerified.value}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{callDetails.data_collection_results.nameVerified.rationale}</p>
                                  </div>
                                </div>
                              )}

                              {/* IC Verification */}
                              {callDetails.data_collection_results.icVerified && (
                                <div>
                                  <p className="text-sm font-medium mb-2">IC Verification</p>
                                  <div className="bg-muted p-3 rounded-md">
                                    <p className="text-sm"><strong>Result:</strong> {callDetails.data_collection_results.icVerified.value}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{callDetails.data_collection_results.icVerified.rationale}</p>
                                  </div>
                                </div>
                              )}

                              {/* Call Outcome */}
                              {callDetails.data_collection_results.callOutcome && (
                                <div>
                                  <p className="text-sm font-medium mb-2">Call Outcome</p>
                                  <div className="bg-muted p-3 rounded-md">
                                    <p className="text-sm"><strong>Result:</strong> {callDetails.data_collection_results.callOutcome.value}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{callDetails.data_collection_results.callOutcome.rationale}</p>
                                  </div>
                                </div>
                              )}

                              {/* Other Data Collection Results */}
                              {Object.entries(callDetails.data_collection_results)
                                .filter(([key]) => !['nameVerified', 'icVerified', 'callOutcome'].includes(key))
                                .map(([key, value]: [string, any]) => (
                                  <div key={key}>
                                    <p className="text-sm font-medium mb-2 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                                    <div className="bg-muted p-3 rounded-md">
                                      <p className="text-sm"><strong>Result:</strong> {value.value || 'N/A'}</p>
                                      {value.rationale && (
                                        <p className="text-xs text-muted-foreground mt-1">{value.rationale}</p>
                                      )}
                                    </div>
                                  </div>
                                ))
                              }
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Dynamic Variables - Only show if data exists */}
                      {callDetails.dynamic_variables && Object.keys(callDetails.dynamic_variables).length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Settings className="h-4 w-4" />
                              Dynamic Variables
                            </CardTitle>
                            <CardDescription>
                              Variables extracted during the call
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="bg-muted p-4 rounded-md">
                              <pre className="text-sm whitespace-pre-wrap overflow-x-auto">
                                {JSON.stringify(callDetails.dynamic_variables, null, 2)}
                              </pre>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="transcript" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Call Transcript
                        </CardTitle>
                        <CardDescription>
                          Complete conversation transcript
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {!callDetails.transcript ? (
                          <div className="text-center text-muted-foreground py-8">
                            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <p>No transcript available</p>
                            <p className="text-sm mt-2">Call may not have connected or transcript was not recorded</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {(() => {
                              // Parse transcript data
                              let transcriptData = [];
                              
                              if (Array.isArray(callDetails.transcript)) {
                                transcriptData = callDetails.transcript;
                              } else if (typeof callDetails.transcript === 'string') {
                                try {
                                  transcriptData = JSON.parse(callDetails.transcript);
                                } catch {
                                  return (
                                    <div className="bg-muted p-4 rounded-md">
                                      <pre className="text-sm whitespace-pre-wrap font-mono">
                                        {callDetails.transcript}
                                      </pre>
                                    </div>
                                  );
                                }
                              }

                              if (!Array.isArray(transcriptData) || transcriptData.length === 0) {
                                return (
                                  <div className="text-center text-muted-foreground py-8">
                                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                    <p>No transcript content available</p>
                                  </div>
                                );
                              }

                              return transcriptData
                                .filter(item => item.role && item.message && (item.role === 'agent' || item.role === 'user'))
                                .map((item, index) => (
                                  <div key={index} className={`p-3 rounded-lg ${
                                    item.role === 'agent' 
                                      ? 'border-r-8 border-1 border-blue-500' 
                                      : 'border-l-8 border-1 border-yellow-500'
                                  }`}>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge variant={item.role === 'agent' ? 'default' : 'secondary'}>
                                        {item.role === 'agent' ? 'Agent' : 'Customer'}
                                      </Badge>
                                      {item.time_in_call_secs && (
                                        <span className="text-xs text-muted-foreground">
                                          {Math.floor(item.time_in_call_secs / 60)}:{String(item.time_in_call_secs % 60).padStart(2, '0')}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm leading-relaxed">{item.message}</p>
                                  </div>
                                ));
                            })()}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">
                    Failed to Load Details
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Unable to load call details. Please try again.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}