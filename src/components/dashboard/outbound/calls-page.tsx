"use client"
import { useUser } from "@clerk/nextjs"
import { useEffect, useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Edit, RefreshCw, Phone, X, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react"
import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// Toast Components (same as before)
const ToastProvider = ToastPrimitives.Provider
const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className,
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive: "destructive border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return <ToastPrimitives.Root ref={ref} className={cn(toastVariants({ variant }), className)} {...props} />
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      className,
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title ref={ref} className={cn("text-sm font-semibold", className)} {...props} />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description ref={ref} className={cn("text-sm opacity-90", className)} {...props} />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

// Toast Hook (simplified)
const TOAST_LIMIT = 3
const TOAST_REMOVE_DELAY = 5000

type ToasterToast = {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  variant?: "default" | "destructive"
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

let count = 0
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type Action =
  | { type: "ADD_TOAST"; toast: ToasterToast }
  | { type: "UPDATE_TOAST"; toast: Partial<ToasterToast> }
  | { type: "DISMISS_TOAST"; toastId?: string }
  | { type: "REMOVE_TOAST"; toastId?: string }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) return
  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({ type: "REMOVE_TOAST", toastId })
  }, TOAST_REMOVE_DELAY)
  toastTimeouts.set(toastId, timeout)
}

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return { ...state, toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT) }
    case "UPDATE_TOAST":
      return { ...state, toasts: state.toasts.map((t) => (t.id === action.toast.id ? { ...t, ...action.toast } : t)) }
    case "DISMISS_TOAST": {
      const { toastId } = action
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => addToRemoveQueue(toast.id))
      }
      return {
        ...state,
        toasts: state.toasts.map((t) => (t.id === toastId || toastId === undefined ? { ...t, open: false } : t)),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) return { ...state, toasts: [] }
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.toastId) }
  }
}

const listeners: Array<(state: State) => void> = []
let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => listener(memoryState))
}

function toast({ ...props }: Omit<ToasterToast, "id">) {
  const id = genId()
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })
  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })
  return { id, dismiss }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)
  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) listeners.splice(index, 1)
    }
  }, [])
  return { ...state, toast }
}

const Toaster = React.memo(() => {
  const { toasts } = useToast()
  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, ...props }) => (
        <Toast key={id} {...props}>
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
})
Toaster.displayName = "Toaster"

// Interfaces
interface UserData {
  id: string
  email: string
  oauthId: string
  username: string
  authId: string | null
  token: string | null
  createdAt: string
  updatedAt: string
}

interface CallData {
  id: string
  startTime: string
  conversationStatus: number
  status: number
  from: string
  to: string
  duration: number
  tags: string[]
}

interface CallsResponse {
  count: number
  results: CallData[]
}

interface CallsFilters {
  skip: number
  limit: number
  sortProp: string
  isAscending: boolean
  fromDate: string
  toDate: string
  tags: string[]
  statuses: number[]
  searchInput: string
}

interface CallDetails {
  id: string
  relatedId: string | null
  startTime: string
  conversationStatus: number
  status: number
  from: string | null
  to: string | null
  name: string | null
  duration: number
  recording: string | null
  transcript: Array<{
    role: number
    content: string
    startTime: number
    endTime: number
  }> | null
  summary: string | null
  collectedInfo: Array<{
    id: string
    name: string
    value: string | number | boolean | null
  }> | null
  tags: string[] | null
  isCallTransferred: boolean
  overallSentiment: number
}

// API Base URLs
const API_BASE_URL = "https://whitelabel-server.onrender.com/api/v1"
const CALLS_API_BASE_URL = "https://api.nlpearl.ai/v1"

// Helper functions
const getDefaultDateRange = () => {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 30)
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  }
}

const getStatusText = (status: number): string => {
  const statusMap: { [key: number]: string } = {
    3: "In Progress",
    4: "Completed",
    5: "Busy",
    6: "Failed",
    7: "No Answer",
    8: "Canceled",
  }
  return statusMap[status] || "Unknown"
}

const getConversationStatusText = (status: number): string => {
  const statusMap: { [key: number]: string } = {
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

const getStatusBadgeColor = (status: number): string => {
  switch (status) {
    case 4: // Completed
    case 100: // Success
    case 130: // Complete
      return "bg-green-100 text-green-800"
    case 6: // Failed
    case 110: // Not Successful
    case 500: // Error
      return "bg-red-100 text-red-800"
    case 3: // In Progress
    case 20: // In Call Queue
      return "bg-blue-100 text-blue-800"
    case 5: // Busy
    case 7: // No Answer
    case 150: // Unreachable
      return "bg-purple-100 text-purple-800"
    case 70: // Voice Mail Left
      return "bg-yellow-100 text-yellow-800"
    case 10: // Need Retry
      return "bg-orange-100 text-orange-800"
    case 8: // Canceled
      return "bg-gray-100 text-gray-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleString()
}

const getSentimentText = (sentiment: number): string => {
  const sentimentMap: { [key: number]: string } = {
    1: "Negative",
    2: "Slightly Negative",
    3: "Neutral",
    4: "Slightly Positive",
    5: "Positive",
  }
  return sentimentMap[sentiment] || "Unknown"
}

const getSentimentColor = (sentiment: number): string => {
  switch (sentiment) {
    case 1:
      return "text-red-600"
    case 2:
      return "text-orange-600"
    case 3:
      return "text-gray-600"
    case 4:
      return "text-blue-600"
    case 5:
      return "text-green-600"
    default:
      return "text-gray-600"
  }
}

// Main Component
const CallsPage = () => {
  const { user, isLoaded } = useUser()
  const { toast } = useToast()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [calls, setCalls] = useState<CallData[]>([])
  const [totalCalls, setTotalCalls] = useState(0)
  const [loading, setLoading] = useState(false)
  const [callsLoading, setCallsLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [authId, setAuthId] = useState("")
  const [token, setToken] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedCall, setSelectedCall] = useState<CallData | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [callDetails, setCallDetails] = useState<CallDetails | null>(null)
  const [callDetailsLoading, setCallDetailsLoading] = useState(false)

  // Filters and pagination
  const [filters, setFilters] = useState<CallsFilters>({
    skip: 0,
    limit: 50,
    sortProp: "startTime",
    isAscending: false,
    fromDate: getDefaultDateRange().from,
    toDate: getDefaultDateRange().to,
    tags: [],
    statuses: [],
    searchInput: "",
  })

  // Memoized values
  const isConfigured = useMemo(() => {
    return userData?.authId && userData?.token
  }, [userData?.authId, userData?.token])

  const canSubmit = useMemo(() => {
    return authId.trim().length > 0 && token.trim().length > 0 && !submitting
  }, [authId, token, submitting])

  const currentPage = useMemo(() => Math.floor(filters.skip / filters.limit) + 1, [filters.skip, filters.limit])
  const totalPages = useMemo(() => Math.ceil(totalCalls / filters.limit), [totalCalls, filters.limit])

  // Fetch user data
  const fetchUserData = useCallback(
    async (userId: string, showLoader = true) => {
      if (showLoader) setLoading(true)
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)

        const response = await fetch(`${API_BASE_URL}/getUser/${userId}`, {
          signal: controller.signal,
          headers: { "Cache-Control": "no-cache" },
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data: UserData = await response.json()
        setUserData(data)

        if (!data.authId || !data.token) {
          if (!showModal) {
            setShowModal(true)
          }
        } else {
          // If configured, fetch calls
          fetchCalls(data.token, data.authId)
        }

        return data
      } catch (error) {
        console.error("Error fetching user data:", error)
        const errorMessage =
          error instanceof Error
            ? error.name === "AbortError"
              ? "Request timed out. Please try again."
              : "Failed to fetch user data. Please try again."
            : "An unexpected error occurred."

        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
        return null
      } finally {
        if (showLoader) setLoading(false)
      }
    },
    [showModal, toast],
  )

  // Fetch calls data
  const fetchCalls = useCallback(
    async (outboundId: string, bearerToken: string, customFilters?: Partial<CallsFilters>) => {
      if (!outboundId || !bearerToken) return

      setCallsLoading(true)
      try {
        const currentFilters = { ...filters, ...customFilters }
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000)

        const response = await fetch(`${CALLS_API_BASE_URL}/Outbound/${outboundId}/Calls`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${bearerToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(currentFilters),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data: CallsResponse = await response.json()
        setCalls(data.results)
        setTotalCalls(data.count)

        toast({
          title: "Success",
          description: `Loaded ${data.results.length} calls successfully!`,
        })
      } catch (error) {
        console.error("Error fetching calls:", error)
        const errorMessage =
          error instanceof Error
            ? error.name === "AbortError"
              ? "Calls request timed out. Please try again."
              : "Failed to fetch calls data. Please try again."
            : "An unexpected error occurred."

        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      } finally {
        setCallsLoading(false)
      }
    },
    [filters, toast],
  )

  // Fetch detailed call information
  const fetchCallDetails = useCallback(
    async (callId: string, bearerToken: string) => {
      if (!callId || !bearerToken) return

      setCallDetailsLoading(true)
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000)

        const response = await fetch(`${CALLS_API_BASE_URL}/Call/${callId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${bearerToken}`,
          },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data: CallDetails = await response.json()
        setCallDetails(data)
      } catch (error) {
        console.error("Error fetching call details:", error)
        const errorMessage =
          error instanceof Error
            ? error.name === "AbortError"
              ? "Call details request timed out. Please try again."
              : "Failed to fetch call details. Please try again."
            : "An unexpected error occurred."

        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      } finally {
        setCallDetailsLoading(false)
      }
    },
    [toast],
  )

  // Update credentials
  const handleSubmitCredentials = useCallback(async () => {
    if (!canSubmit) {
      toast({
        title: "Error",
        description: "Please fill in both Auth ID and Token fields.",
        variant: "destructive",
      })
      return
    }

    if (!userData?.oauthId) {
      toast({
        title: "Error",
        description: "User OAuth ID not found.",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      const response = await fetch(`${API_BASE_URL}/updateToken/${userData.oauthId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token.trim(),
          authId: authId.trim(),
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const updatedUserData: UserData = await response.json()
      setUserData(updatedUserData)

      setShowModal(false)
      setAuthId("")
      setToken("")

      toast({
        title: "Success",
        description: "Credentials updated successfully!",
      })

      // Fetch calls with new credentials
      fetchCalls(updatedUserData.token!, updatedUserData.authId!)
    } catch (error) {
      console.error("Error updating credentials:", error)
      const errorMessage =
        error instanceof Error
          ? error.name === "AbortError"
            ? "Update timed out. Please try again."
            : "Failed to update credentials. Please try again."
          : "An unexpected error occurred."

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }, [canSubmit, userData?.oauthId, token, authId, toast, fetchCalls])

  // Handle filter changes
  const handleFilterChange = useCallback(
    (newFilters: Partial<CallsFilters>) => {
      const updatedFilters = { ...filters, ...newFilters, skip: 0 } // Reset to first page
      setFilters(updatedFilters)
      if (userData?.token && userData?.authId) {
        fetchCalls(userData.token, userData.authId, updatedFilters)
      }
    },
    [filters, userData, fetchCalls],
  )

  // Handle pagination
  const handlePageChange = useCallback(
    (page: number) => {
      const newSkip = (page - 1) * filters.limit
      const updatedFilters = { ...filters, skip: newSkip }
      setFilters(updatedFilters)
      if (userData?.token && userData?.authId) {
        fetchCalls(userData.token, userData.authId, updatedFilters)
      }
    },
    [filters, userData, fetchCalls],
  )

  // Manual refresh
  const handleRefresh = useCallback(async () => {
    if (!user?.id || refreshing) return

    setRefreshing(true)
    const userData = await fetchUserData(user.id, false)
    if (userData && userData.token && userData.authId) {
      await fetchCalls(userData.token, userData.authId)
    }
    setRefreshing(false)

    toast({
      title: "Refreshed",
      description: "Data has been refreshed.",
    })
  }, [user?.id, refreshing, fetchUserData, fetchCalls, toast])

  // Open modal for editing credentials
  const handleEditCredentials = useCallback(() => {
    if (userData) {
      setAuthId(userData.authId || "")
      setToken(userData.token || "")
    }
    setShowModal(true)
  }, [userData])

  // Close modal and reset form
  const handleCloseModal = useCallback(() => {
    setShowModal(false)
    setAuthId("")
    setToken("")
  }, [])

  // Handle call selection
  const handleCallClick = useCallback(
    (call: CallData) => {
      setSelectedCall(call)
      setSidebarOpen(true)
      setCallDetails(null) // Reset previous call details

      // Fetch detailed call information
      if (userData?.authId) {
        fetchCallDetails(call.id, userData.authId)
      }
    },
    [userData?.authId, fetchCallDetails],
  )

  // Close sidebar
  const closeSidebar = useCallback(() => {
    setSidebarOpen(false)
    setSelectedCall(null)
    setCallDetails(null)
  }, [])

  // Initial data fetch
  useEffect(() => {
    if (isLoaded && user?.id) {
      console.log("User ID:", user.id)
      fetchUserData(user.id)
    }
  }, [isLoaded, user?.id, fetchUserData])

  // Loading state
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please sign in to continue.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={`flex h-screen bg-gray-50 ${sidebarOpen ? "overflow-hidden" : ""}`}>
        {/* Main Content */}
        <div className={`flex-1 flex flex-col ${sidebarOpen ? "lg:mr-96" : ""} transition-all duration-300`}>
          {/* Header */}
          <div className="bg-white border-b border-gray-200 p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <h1 className="text-xl sm:text-2xl font-bold">Calls</h1>
                {totalCalls > 0 && (
                  <Badge variant="secondary" className="text-xs sm:text-sm">
                    {totalCalls.toLocaleString()} total
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing || loading}
                  className="text-xs sm:text-sm bg-transparent"
                >
                  <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${refreshing ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
                {userData && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditCredentials}
                    className="text-xs sm:text-sm bg-transparent"
                  >
                    <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">{isConfigured ? "Edit Credentials" : "Add Credentials"}</span>
                    <span className="sm:hidden">Config</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* User Status */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading user data...</span>
            </div>
          ) : userData ? (
            <div className="bg-white border-b border-gray-200 p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className={`w-2 h-2 rounded-full ${isConfigured ? "bg-green-500" : "bg-orange-500"}`} />
                  <span className="text-xs sm:text-sm font-medium truncate">{userData.username}</span>
                  <span className="text-xs sm:text-sm text-gray-500 truncate hidden sm:inline">{userData.email}</span>
                </div>
                <div className="text-xs sm:text-sm">
                  <span className={`font-medium ${isConfigured ? "text-green-600" : "text-orange-600"}`}>
                    {isConfigured ? "✓ Configured" : "⚠ Setup Required"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="text-center">
                <p className="text-gray-500 mb-2">No user data found.</p>
                <Button size="sm" onClick={() => user?.id && fetchUserData(user.id)}>
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Filters */}
          {isConfigured && (
            <div className="bg-white border-b border-gray-200 p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search calls..."
                    value={filters.searchInput}
                    onChange={(e) => handleFilterChange({ searchInput: e.target.value })}
                    className="w-full text-sm"
                  />
                </div>
                <div className="flex space-x-2 sm:space-x-4">
                  <Select
                    value={filters.statuses.length > 0 ? filters.statuses[0].toString() : "all"}
                    onValueChange={(value) =>
                      handleFilterChange({ statuses: value === "all" ? [] : [Number.parseInt(value)] })
                    }
                  >
                    <SelectTrigger className="w-full sm:w-32 lg:w-40 text-sm">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="4">Completed</SelectItem>
                      <SelectItem value="6">Failed</SelectItem>
                      <SelectItem value="3">In Progress</SelectItem>
                      <SelectItem value="100">Success</SelectItem>
                      <SelectItem value="150">Unreachable</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={filters.limit.toString()}
                    onValueChange={(value) => handleFilterChange({ limit: Number.parseInt(value) })}
                  >
                    <SelectTrigger className="w-16 sm:w-20 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Calls Table */}
          <div className="flex-1 overflow-hidden">
            {isConfigured ? (
              callsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span className="text-sm sm:text-base">Loading calls...</span>
                </div>
              ) : calls.length > 0 ? (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden lg:block h-full overflow-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">From</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">To</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Start Time</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Duration</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Conversation</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {calls.map((call) => (
                          <tr
                            key={call.id}
                            className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                            onClick={() => handleCallClick(call)}
                          >
                            <td className="py-3 px-4 text-sm">{call.from || "N/A"}</td>
                            <td className="py-3 px-4 text-sm">{call.to || "N/A"}</td>
                            <td className="py-3 px-4 text-sm">{formatDate(call.startTime)}</td>
                            <td className="py-3 px-4 text-sm">{formatDuration(call.duration)}</td>
                            <td className="py-3 px-4">
                              <Badge className={getStatusBadgeColor(call.status)}>{getStatusText(call.status)}</Badge>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="outline">{getConversationStatusText(call.conversationStatus)}</Badge>
                            </td>
                            <td className="py-3 px-4">
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
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="lg:hidden h-full overflow-auto p-3 sm:p-4 space-y-3">
                    {calls.map((call) => (
                      <div
                        key={call.id}
                        className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleCallClick(call)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                              {call.from?.slice(-2) || "??"}
                            </div>
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                            <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-medium">
                              {call.to?.slice(-2) || "??"}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCallClick(call)
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">From → To</span>
                            <span className="text-sm font-medium">
                              {call.from || "N/A"} → {call.to || "N/A"}
                            </span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Duration</span>
                            <span className="text-sm">{formatDuration(call.duration)}</span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Start Time</span>
                            <span className="text-xs">{formatDate(call.startTime)}</span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Status</span>
                            <Badge className={`${getStatusBadgeColor(call.status)} text-xs`}>
                              {getStatusText(call.status)}
                            </Badge>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Conversation</span>
                            <Badge variant="outline" className="text-xs">
                              {getConversationStatusText(call.conversationStatus)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center py-12 px-4">
                  <div className="text-center">
                    <Phone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No calls found</h3>
                    <p className="text-gray-500 mb-4 text-sm sm:text-base">
                      {filters.searchInput || filters.statuses.length > 0
                        ? "Try adjusting your filters"
                        : "No calls have been made yet"}
                    </p>
                    <Button
                      onClick={() => userData?.token && userData?.authId && fetchCalls(userData.token, userData.authId)}
                      size="sm"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </div>
              )
            ) : (
              <div className="flex items-center justify-center py-12 px-4">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Setup Required</h3>
                  <p className="text-gray-500 mb-4 text-sm sm:text-base">
                    Please configure your credentials to view calls
                  </p>
                  <Button onClick={handleEditCredentials} size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Add Credentials
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Pagination */}
          {isConfigured && totalCalls > 0 && (
            <div className="bg-white border-t border-gray-200 p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
                <div className="text-xs sm:text-sm text-gray-600 order-2 sm:order-1">
                  Showing {filters.skip + 1} to {Math.min(filters.skip + filters.limit, totalCalls)} of{" "}
                  {totalCalls.toLocaleString()} calls
                </div>
                <div className="flex items-center space-x-2 order-1 sm:order-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="text-xs sm:text-sm"
                  >
                    <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline ml-1">Previous</span>
                  </Button>
                  <span className="text-xs sm:text-sm px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="text-xs sm:text-sm"
                  >
                    <span className="hidden sm:inline mr-1">Next</span>
                    <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Sidebar */}
        {sidebarOpen && selectedCall && (
          <>
            {/* Mobile Overlay */}
            <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={closeSidebar} />

            {/* Sidebar */}
            <div className="fixed right-0 top-0 h-full w-full sm:w-96 lg:w-96 bg-white border-l border-gray-200 shadow-lg overflow-y-auto z-50 transform transition-transform duration-300">
              <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <div className="flex items-center">
                    <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                      {selectedCall.from?.slice(-2) || "??"}
                    </div>
                    <ArrowRight className="h-4 w-4 mx-2 text-gray-400" />
                    <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">
                      {selectedCall.to?.slice(-2) || "??"}
                    </div>
                  </div>
                  <div className="text-sm font-medium truncate">
                    {selectedCall.from} → {selectedCall.to}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={closeSidebar} className="ml-2 flex-shrink-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-3 sm:p-4">
                {callDetailsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span className="text-sm">Loading call details...</span>
                  </div>
                ) : callDetails ? (
                  <div className="space-y-4 sm:space-y-6">
                    {/* Summary Section */}
                    {callDetails.summary && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2">Summary</h3>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg leading-relaxed">
                          {callDetails.summary}
                        </p>
                      </div>
                    )}

                    {/* Call Details */}
                    <div>
                      <h3 className="text-sm font-semibold mb-3">Call Details</h3>
                      <div className="space-y-2">
                        {callDetails.name && (
                          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                            <span className="text-sm text-gray-600">Name</span>
                            <span className="text-sm font-medium">{callDetails.name}</span>
                          </div>
                        )}
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                          <span className="text-sm text-gray-600">Duration</span>
                          <span className="text-sm font-medium">{formatDuration(callDetails.duration)}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                          <span className="text-sm text-gray-600">Start Time</span>
                          <span className="text-sm">{formatDate(callDetails.startTime)}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                          <span className="text-sm text-gray-600">Status</span>
                          <Badge className={getStatusBadgeColor(callDetails.status)}>
                            {getStatusText(callDetails.status)}
                          </Badge>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                          <span className="text-sm text-gray-600">Conversation</span>
                          <Badge variant="outline">{getConversationStatusText(callDetails.conversationStatus)}</Badge>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                          <span className="text-sm text-gray-600">Sentiment</span>
                          <span className={`text-sm font-medium ${getSentimentColor(callDetails.overallSentiment)}`}>
                            {getSentimentText(callDetails.overallSentiment)}
                          </span>
                        </div>
                        {callDetails.isCallTransferred && (
                          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                            <span className="text-sm text-gray-600">Transferred</span>
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 w-fit">
                              Yes
                            </Badge>
                          </div>
                        )}
                        {callDetails.relatedId && (
                          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                            <span className="text-sm text-gray-600">Related ID</span>
                            <span className="text-xs font-mono text-gray-500 break-all">{callDetails.relatedId}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Collected Information */}
                    {callDetails.collectedInfo && callDetails.collectedInfo.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-3">Collected Information</h3>
                        <div className="space-y-2">
                          {callDetails.collectedInfo.map((info) => (
                            <div key={info.id} className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                              <span className="text-sm text-gray-600">{info.name}</span>
                              <span className="text-sm font-medium break-words">{String(info.value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tags */}
                    {callDetails.tags && callDetails.tags.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2">Tags</h3>
                        <div className="flex flex-wrap gap-1">
                          {callDetails.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recording */}
                    {callDetails.recording && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2">Recording</h3>
                        <div className="space-y-2">
                          <audio controls className="w-full">
                            <source src={callDetails.recording} type="audio/mpeg" />
                            Your browser does not support the audio element.
                          </audio>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full bg-transparent text-sm"
                            onClick={() => window.open(callDetails.recording!, "_blank")}
                          >
                            Download Recording
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Transcript */}
                    {callDetails.transcript && callDetails.transcript.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-3">Transcript</h3>
                        <div className="bg-gray-50 rounded-lg p-3 sm:p-4 max-h-64 sm:max-h-96 overflow-y-auto">
                          {callDetails.transcript.map((message, index) => {
                            // Role 1 = AI/Agent, Role 2 = User/Human - REVERSED
                            const isAI = message.role === 1
                            const isUser = message.role === 2
                            const isSystem = message.role === 3

                            // Define gradient backgrounds for different roles (REVERSED)
                            let bgGradient = "bg-gradient-to-r from-gray-400 to-gray-500" // default/unknown
                            let textColor = "text-white"
                            let roleLabel = "Unknown"

                            if (isAI) {
                              // AI gets vibrant blue-purple gradient
                              bgGradient = "bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600"
                              textColor = "text-white"
                              roleLabel = "User" // Purple messages show as User
                            } else if (isUser) {
                              // User gets emerald-teal gradient
                              bgGradient = "bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600"
                              textColor = "text-white"
                              roleLabel = "Agent" // Green messages show as Agent
                            } else if (isSystem) {
                              bgGradient = "bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-600"
                              textColor = "text-white"
                              roleLabel = "USER"
                            }

                            return (
                              <div key={index} className="mb-3 sm:mb-4">
                                {/* Role Label and Timestamp Header */}
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium text-gray-600">{roleLabel}</span>
                                </div>

                                {/* Message Content with Transparent Gradient Background */}
                                <div
                                  className={`${bgGradient} ${textColor} px-3 sm:px-4 py-2 sm:py-3 rounded-lg shadow-sm bg-opacity-90 backdrop-blur-sm`}
                                >
                                  <p className="text-sm leading-relaxed break-words">{message.content}</p>
                                </div>
                              </div>
                            )
                          })}

                          {/* Conversation Stats */}
                          <div className="mt-4 pt-3 border-t border-gray-200">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-gradient-to-br from-blue-500 to-indigo-600"></div>
                                <span className="text-gray-600">
                                  User: {callDetails.transcript.filter((m) => m.role === 1).length}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-gradient-to-br from-emerald-500 to-teal-600"></div>
                                <span className="text-gray-600">
                                  Agent: {callDetails.transcript.filter((m) => m.role === 2).length}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-gradient-to-r from-purple-500 to-purple-600"></div>
                                <span className="text-gray-600">
                                  USER: {callDetails.transcript.filter((m) => m.role === 3).length}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-gradient-to-r from-gray-400 to-gray-500"></div>
                                <span className="text-gray-600">Total: {callDetails.transcript.length}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Phone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Call Details</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {userData?.authId
                        ? "Failed to load call details"
                        : "Authentication required to view call details"}
                    </p>
                    {userData?.authId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchCallDetails(selectedCall.id, userData.authId!)}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Credentials Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="sm:max-w-[500px] mx-4 sm:mx-0 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                {isConfigured ? "Update Credentials" : "Setup Required"}
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                {isConfigured
                  ? "Update your Auth ID and Token below."
                  : "Please provide your Auth ID and Token to complete your account setup and view calls."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="authId" className="text-sm">
                  Auth ID (Bearer Token)
                </Label>
                <Input
                  id="authId"
                  value={authId}
                  onChange={(e) => setAuthId(e.target.value)}
                  placeholder="Enter your Auth ID"
                  disabled={submitting}
                  className="text-sm"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="token" className="text-sm">
                  Token (Outbound ID)
                </Label>
                <Input
                  id="token"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Enter your token"
                  disabled={submitting}
                  className="text-sm"
                />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={handleCloseModal}
                disabled={submitting}
                className="w-full sm:w-auto text-sm bg-transparent"
              >
                Cancel
              </Button>
              <Button onClick={handleSubmitCredentials} disabled={!canSubmit} className="w-full sm:w-auto text-sm">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isConfigured ? "Updating..." : "Saving..."}
                  </>
                ) : isConfigured ? (
                  "Update Credentials"
                ) : (
                  "Save Credentials"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Toaster />
    </>
  )
}

export default CallsPage
