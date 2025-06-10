"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, X, ArrowRight, RefreshCw, Phone } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"


// API configuration
const API_TOKEN = "66fbc9e9d6345ec186da95b2:DyRnA7LIMEdLMTuEy9UColX8RnWTTqU2"

// Type definitions based on API documentation
type CallStatus = 3 | 4 | 5 | 6 | 7 | 8 // InProgress, Completed, Busy, Failed, NoAnswer, Canceled
type ConversationStatus = 10 | 20 | 70 | 100 | 110 | 130 | 150 | 500 // NeedRetry, InCallQueue, VoiceMailLeft, Success, NotSuccessful, Complete, Unreachable, Error
type Sentiment = 1 | 2 | 3 | 4 | 5 // Negative, SlightlyNegative, Neutral, SlightlyPositive, Positive

interface TranscriptMessage {
  role: number
  content: string
  startTime: number
  endTime: number
}

interface CollectedInfo {
  id: string
  name: string
  value: string | number | boolean | null
}

interface CallDetails {
  id: string
  relatedId: string | null
  startTime: string | null
  conversationStatus: ConversationStatus
  status: CallStatus
  from: string | null
  to: string | null
  name: string | null
  duration: number
  recording: string | null
  transcript: TranscriptMessage[] | null
  summary: string | null
  collectedInfo: CollectedInfo[] | null
  tags: string[] | null
  isCallTransferred: boolean
  overallSentiment: Sentiment
}

interface CallRequestResponse {
  id: string
  status: number
  outboundId: string
  created: string
  errors?: string[]
  callId?: string
}

interface StoredCall {
  id: string
  requestId: string
  from: string
  to: string
  leadName: string
  startTime: string
  status: string
  conversationStatus: string
  queuePosition?: number
}

export default function CallsPage() {
  const [calls, setCalls] = useState<StoredCall[]>([])
  const [selectedCall, setSelectedCall] = useState<StoredCall | null>(null)
  const [callDetails, setCallDetails] = useState<CallDetails | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Load calls from localStorage on component mount
  useEffect(() => {
    const loadCalls = () => {
      const storedCalls = JSON.parse(localStorage.getItem("outboundCalls") || "[]")
      setCalls(storedCalls)
    }

    loadCalls()

    // Set up interval to refresh calls data
    const interval = setInterval(loadCalls, 5000) // Refresh every 5 seconds

    return () => clearInterval(interval)
  }, [])

  // Fetch call request to get the actual call ID
  const fetchCallId = async (requestId: string): Promise<string | null> => {
    try {
      console.log(`Fetching call request for requestId: ${requestId}`)

      const response = await fetch(`https://api.nlpearl.ai/v1/Outbound/CallRequest/${requestId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
        },
      })

      if (!response.ok) {
        console.error(`Failed to fetch call request: ${response.status}`)
        return null
      }

      const callRequestData: CallRequestResponse = await response.json()
      console.log("Call Request Data:", callRequestData)

      if (callRequestData.callId) {
        console.log("Call ID found:", callRequestData.callId)
        return callRequestData.callId
      } else {
        console.log("No call ID available yet, status:", callRequestData.status)
        if (callRequestData.errors && callRequestData.errors.length > 0) {
          console.log("Errors:", callRequestData.errors)
        }
        return null
      }
    } catch (error) {
      console.error("Error fetching call request:", error)
      return null
    }
  }

  // Fetch detailed call information from API
  const fetchCallDetails = async (callId: string) => {
    setLoading(true)
    try {
      console.log(`Fetching call details for callId: ${callId}`)
      console.log(`API URL: https://api.nlpearl.ai/v1/Call/${callId}`)

      const response = await fetch(`https://api.nlpearl.ai/v1/Call/${callId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          "Content-Type": "application/json",
        },
      })

      console.log(`API Response status: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`API error: ${response.status} - ${errorText}`)

        // Handle specific error cases
        if (response.status === 404) {
          throw new Error(`Call not found. Call ID: ${callId} may not exist or is still processing.`)
        } else if (response.status === 401) {
          throw new Error("Unauthorized. Please check your API token.")
        } else if (response.status === 403) {
          throw new Error("Forbidden. You don't have permission to access this call.")
        } else {
          throw new Error(`API error: ${response.status} - ${errorText}`)
        }
      }

      const data: CallDetails = await response.json()
      console.log("Call details received:", data)
      setCallDetails(data)

      // Update the stored call with latest status
      const updatedCalls = calls.map((call) =>
        call.id === selectedCall?.id
          ? {
              ...call,
              status: getStatusText(data.status),
              conversationStatus: getConversationStatusText(data.conversationStatus),
            }
          : call,
      )
      setCalls(updatedCalls)
      localStorage.setItem("outboundCalls", JSON.stringify(updatedCalls))
    } catch (error) {
      console.error("Failed to fetch call details:", error)
      toast({
        title: "Error",
        description: `Failed to fetch call details: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusText = (status: CallStatus): string => {
    const statusMap = {
      3: "In Progress",
      4: "Completed",
      5: "Busy",
      6: "Failed",
      7: "No Answer",
      8: "Canceled",
    }
    return statusMap[status] || "Unknown"
  }

  const getConversationStatusText = (status: ConversationStatus): string => {
    const statusMap = {
      10: "Need Retry",
      20: "In Call Queue",
      70: "Voice Mail Left",
      100: "Success",
      110: "Not Successful",
      130: "Complete",
      150: "Unreachable",
      500: "Error",
    }
    return statusMap[status] || "Unknown"
  }

  const getSentimentText = (sentiment: Sentiment): string => {
    const sentimentMap = {
      1: "Negative",
      2: "Slightly Negative",
      3: "Neutral",
      4: "Slightly Positive",
      5: "Positive",
    }
    return sentimentMap[sentiment] || "Unknown"
  }

  const getStatusBadgeColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case "completed":
      case "success":
      case "complete":
        return "bg-green-100 text-green-800"
      case "failed":
      case "error":
      case "not successful":
        return "bg-red-100 text-red-800"
      case "in progress":
      case "in call queue":
        return "bg-blue-100 text-blue-800"
      case "unreachable":
      case "no answer":
      case "busy":
        return "bg-purple-100 text-purple-800"
      case "voice mail left":
        return "bg-yellow-100 text-yellow-800"
      case "need retry":
        return "bg-orange-100 text-orange-800"
      case "canceled":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleCallClick = async (call: StoredCall) => {
    setSelectedCall(call)
    setSidebarOpen(true)
    setCallDetails(null) // Reset call details

    // First, try to get the call ID from the request ID
    const callId = await fetchCallId(call.requestId || call.id)

    if (callId) {
      // If we got a call ID, fetch the call details
      await fetchCallDetails(callId)
    } else {
      // If no call ID available, show appropriate message
      toast({
        title: "Call ID not available",
        description: "The call is still processing or may have failed. Please try again later.",
        variant: "destructive",
      })
    }
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
    setCallDetails(null)
  }

  const refreshCalls = () => {
    const storedCalls = JSON.parse(localStorage.getItem("outboundCalls") || "[]")
    setCalls(storedCalls)
    toast({
      title: "Refreshed",
      description: "Call data has been refreshed.",
    })
  }

  // Filter calls based on search and status
  const filteredCalls = calls.filter((call) => {
    const matchesSearch =
      searchTerm === "" ||
      call.leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.to.includes(searchTerm) ||
      call.from.includes(searchTerm)

    const matchesStatus =
      statusFilter === "all" ||
      call.status.toLowerCase().includes(statusFilter.toLowerCase()) ||
      call.conversationStatus.toLowerCase().includes(statusFilter.toLowerCase())

    return matchesSearch && matchesStatus
  })

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  const formatTimestamp = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  return (
    <div className="flex h-screen bg-white">
      <Toaster />

      <div className={`flex-1 p-6 ${sidebarOpen ? "pr-0" : ""}`}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-black">Calls</h1>
              <span className="text-gray-500">{calls.length}</span>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={refreshCalls}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>

              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="unreachable">Unreachable</SelectItem>
                  <SelectItem value="in progress">In Progress</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Search calls..."
                className="w-48"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <Card className="bg-white border border-gray-200">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Lead Name</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">From</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">To</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Date</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Status</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCalls.length > 0 ? (
                      filteredCalls.map((call) => (
                        <tr
                          key={call.id}
                          className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleCallClick(call)}
                        >
                          <td className="py-4 px-4 text-sm text-black font-medium">{call.leadName}</td>
                          <td className="py-4 px-4 text-sm text-black">{call.from}</td>
                          <td className="py-4 px-4 text-sm text-black">{call.to}</td>
                          <td className="py-4 px-4 text-sm text-black">{formatDate(call.startTime)}</td>
                          <td className="py-4 px-4">
                            <Badge className={getStatusBadgeColor(call.status)}>{call.status}</Badge>
                          </td>
                          <td className="py-4 px-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCallClick(call)
                              }}
                            >
                              <Phone className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 px-4 text-center text-gray-500">
                          No calls found. Start making calls from the outbound system to see them here.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between p-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Showing {filteredCalls.length} of {calls.length} calls
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sidebar for call details */}
      {sidebarOpen && selectedCall && (
        <div className="w-96 border-l border-gray-200 h-full overflow-y-auto">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <div className="h-6 w-6 rounded-full bg-red-500 flex items-center justify-center text-white text-xs">
                  {selectedCall.from.slice(-2)}
                </div>
                <ArrowRight className="h-4 w-4 mx-2" />
                <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">
                  {selectedCall.to.slice(-2)}
                </div>
              </div>
              <div className="text-sm font-medium">
                {selectedCall.from} → {selectedCall.to}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={closeSidebar}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading call details...</span>
              </div>
            ) : callDetails ? (
              <>
                <h3 className="text-sm font-medium mb-2">Summary</h3>
                <p className="text-sm text-gray-700 mb-4">
                  {callDetails.summary || "No summary available for this call."}
                </p>

                <div className="border-t border-gray-200 pt-4 mb-4">
                  <h3 className="text-sm font-medium mb-2">Call Details</h3>

                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="text-sm text-gray-600">Lead Name</div>
                    <div className="text-sm font-medium">{selectedCall.leadName}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="text-sm text-gray-600">Duration</div>
                    <div className="text-sm font-medium">{formatDuration(callDetails.duration)}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="text-sm text-gray-600">Status</div>
                    <div className="text-sm font-medium">{getStatusText(callDetails.status)}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="text-sm text-gray-600">Conversation</div>
                    <div className="text-sm font-medium">
                      {getConversationStatusText(callDetails.conversationStatus)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="text-sm text-gray-600">Sentiment</div>
                    <div className="text-sm font-medium">{getSentimentText(callDetails.overallSentiment)}</div>
                  </div>

                  {callDetails.isCallTransferred && (
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div className="text-sm text-gray-600">Transferred</div>
                      <div className="text-sm font-medium text-blue-600">Yes</div>
                    </div>
                  )}
                </div>

                {callDetails.collectedInfo && callDetails.collectedInfo.length > 0 && (
                  <div className="border-t border-gray-200 pt-4 mb-4">
                    <h3 className="text-sm font-medium mb-2">Collected Information</h3>
                    {callDetails.collectedInfo.map((info) => (
                      <div key={info.id} className="grid grid-cols-2 gap-2 mb-2">
                        <div className="text-sm text-gray-600">{info.name}</div>
                        <div className="text-sm font-medium">{String(info.value)}</div>
                      </div>
                    ))}
                  </div>
                )}

                {callDetails.tags && callDetails.tags.length > 0 && (
                  <div className="border-t border-gray-200 pt-4 mb-4">
                    <h3 className="text-sm font-medium mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-1">
                      {callDetails.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Tabs defaultValue="transcript" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="transcript">Transcript</TabsTrigger>
                    <TabsTrigger value="recording">Recording</TabsTrigger>
                  </TabsList>
                  <TabsContent value="transcript" className="pt-4">
                    {callDetails.transcript && callDetails.transcript.length > 0 ? (
                      callDetails.transcript.map((message, index) => (
                        <div key={index} className="mb-4">
                          <div className="flex items-start gap-2">
                            <div
                              className={`h-6 w-6 rounded-full flex items-center justify-center text-white text-xs ${
                                message.role === 1 ? "bg-red-500" : "bg-green-500"
                              }`}
                            >
                              {message.role === 1 ? "AI" : "CL"}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-gray-700">{message.content}</p>
                              <p className="text-xs text-gray-500 mt-1 text-right">
                                {formatTimestamp(message.startTime)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No transcript available for this call.</p>
                    )}
                  </TabsContent>
                  <TabsContent value="recording" className="pt-4">
                    {callDetails.recording ? (
                      <div className="space-y-2">
                        <audio controls className="w-full">
                          <source src={callDetails.recording} type="audio/mpeg" />
                          Your browser does not support the audio element.
                        </audio>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(callDetails.recording!, "_blank")}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Recording
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No recording available for this call.</p>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              !loading && (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500 mb-4">
                    Call details are not available yet. The call may still be processing.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => handleCallClick(selectedCall)}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              )
            )}
          </div>

          {process.env.NODE_ENV === "development" && (
            <div className="border-t border-gray-200 pt-4 mb-4 px-4">
              <h3 className="text-sm font-medium mb-2">Debug Info</h3>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="text-sm text-gray-600">Request ID</div>
                <div className="text-sm font-mono text-xs break-all">{selectedCall.requestId || selectedCall.id}</div>
              </div>
              {selectedCall.queuePosition !== undefined && (
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="text-sm text-gray-600">Queue Position</div>
                  <div className="text-sm font-medium">{selectedCall.queuePosition}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
