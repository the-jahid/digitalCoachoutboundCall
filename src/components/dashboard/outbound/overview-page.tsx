"use client"
import { useUser } from "@clerk/nextjs"
import { useEffect, useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Edit, RefreshCw, TrendingUp, Phone, Users, BarChart3 } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts"
import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

// Toast Components (keeping the same as before)
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

// Toast Hook (keeping the same as before)
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

interface AnalyticsData {
  callsStatusOverview: {
    totalCalls: number
    totalLeads: number
    needRetry: number
    wrongCountryCode: number
    needFollowUp: number
    voiceMailLeft: number
    successful: number
    unsuccessful: number
    wrongNumber: number
    completed: number
    unreachable: number
    error: number
  }
  callsSentimentOverview: {
    negative: number
    slightlyNegative: number
    neutral: number
    slightlyPositive: number
    positive: number
  }
  callsStatusTimeLine: Array<{
    totalCalls: number
    totalLeads: number
    needRetry: number
    wrongCountryCode: number
    needFollowUp: number
    voiceMailLeft: number
    successful: number
    unsuccessful: number
    wrongNumber: number
    completed: number
    unreachable: number
    error: number
    date: string
  }>
  callsAverageTimeLine: Array<{
    date: string
    averageCallDuration: number
  }>
  callsCostTimeLine: Array<{
    date: string
    totalPrice: number
    averageCostPerCall: number
  }>
  callsPickupRateTimeLine: Array<{
    date: string
    pickupRatePercentage: number
  }>
  callsSuccessRateTimeLine: Array<{
    date: string
    successRatePercentage: number
  }>
  callLabelCount: Array<{
    id: string
    name: string
    color: string
    count: number
  }>
  callEventsCounts: {
    takeMessageCount: number
    smsSentCount: number
    callTransferredCount: number
    calendarBookedCount: number
    emailSentCount: number
  }
  callsByHourDayOfWeeks: Array<{
    hourOfDay: number
    dayOfWeek: number
    count: number
  }>
}

// API Base URLs
const API_BASE_URL = "https://whitelabel-server.onrender.com/api/v1"
const ANALYTICS_API_BASE_URL = "https://api.nlpearl.ai/v1"

// Helper function to get date range (last 30 days by default)
const getDefaultDateRange = () => {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 30)
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  }
}

// Chart colors
const SENTIMENT_COLORS = {
  positive: "#22c55e",
  slightlyPositive: "#84cc16",
  neutral: "#6b7280",
  slightlyNegative: "#f59e0b",
  negative: "#ef4444",
}

// Main Component
const OverviewPage = () => {
  const { user, isLoaded } = useUser()
  const { toast } = useToast()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [authId, setAuthId] = useState("")
  const [token, setToken] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [dateRange, setDateRange] = useState(getDefaultDateRange())

  // Memoized values
  const isConfigured = useMemo(() => {
    return userData?.authId && userData?.token
  }, [userData?.authId, userData?.token])

  const canSubmit = useMemo(() => {
    return authId.trim().length > 0 && token.trim().length > 0 && !submitting
  }, [authId, token, submitting])

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

        // Auto-show modal only if both are missing and modal isn't already open
        if (!data.authId || !data.token) {
          if (!showModal) {
            setShowModal(true)
          }
        } else {
          // If configured, fetch analytics
          fetchAnalytics(data.token, data.authId)
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

  // Fetch analytics data
  const fetchAnalytics = useCallback(
    async (outboundId: string, bearerToken: string, customDateRange?: typeof dateRange) => {
      if (!outboundId || !bearerToken) return

      setAnalyticsLoading(true)
      try {
        const range = customDateRange || dateRange
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000)

        const response = await fetch(`${ANALYTICS_API_BASE_URL}/Outbound/${outboundId}/Analytics`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${bearerToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: range.from,
            to: range.to,
          }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data: AnalyticsData = await response.json()
        setAnalyticsData(data)

        toast({
          title: "Success",
          description: "Analytics data loaded successfully!",
        })
      } catch (error) {
        console.error("Error fetching analytics:", error)
        const errorMessage =
          error instanceof Error
            ? error.name === "AbortError"
              ? "Analytics request timed out. Please try again."
              : "Failed to fetch analytics data. Please try again."
            : "An unexpected error occurred."

        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      } finally {
        setAnalyticsLoading(false)
      }
    },
    [dateRange, toast],
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

      // Reset form and close modal
      setShowModal(false)
      setAuthId("")
      setToken("")

      toast({
        title: "Success",
        description: "Credentials updated successfully!",
      })

      // Fetch analytics with new credentials
      fetchAnalytics(updatedUserData.token!, updatedUserData.authId!)
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
  }, [canSubmit, userData?.oauthId, token, authId, toast, fetchAnalytics])

  // Manual refresh
  const handleRefresh = useCallback(async () => {
    if (!user?.id || refreshing) return

    setRefreshing(true)
    const userData = await fetchUserData(user.id, false)
    if (userData && userData.token && userData.authId) {
      await fetchAnalytics(userData.token, userData.authId)
    }
    setRefreshing(false)

    toast({
      title: "Refreshed",
      description: "Data has been refreshed.",
    })
  }, [user?.id, refreshing, fetchUserData, fetchAnalytics, toast])

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
      <div className="container mx-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing || loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              {userData && (
                <Button variant="outline" size="sm" onClick={handleEditCredentials}>
                  <Edit className="h-4 w-4 mr-2" />
                  {isConfigured ? "Edit Credentials" : "Add Credentials"}
                </Button>
              )}
            </div>
          </div>

          {/* User Status */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading user data...</span>
            </div>
          ) : userData ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${isConfigured ? "bg-green-500" : "bg-orange-500"}`} />
                    <div>
                      <h3 className="font-semibold">{userData.username}</h3>
                      <p className="text-sm text-gray-600">{userData.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${isConfigured ? "text-green-600" : "text-orange-600"}`}>
                      {isConfigured ? "✓ Configured" : "⚠ Setup Required"}
                    </p>
                    <p className="text-sm text-gray-500">
                      Updated: {new Date(userData.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500 mb-4">No user data found.</p>
                <Button onClick={() => user?.id && fetchUserData(user.id)}>Try Again</Button>
              </CardContent>
            </Card>
          )}

          {/* Analytics Section */}
          {isConfigured && (
            <>
              {analyticsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading analytics data...</span>
                </div>
              ) : analyticsData ? (
                <Tabs defaultValue="overview" className="space-y-6">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                    <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
                    <TabsTrigger value="events">Events</TabsTrigger>
                  </TabsList>

                  {/* Overview Tab */}
                  <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
                          <Phone className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {analyticsData.callsStatusOverview.totalCalls.toLocaleString()}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {analyticsData.callsStatusOverview.totalLeads.toLocaleString()}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Successful</CardTitle>
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-green-600">
                            {analyticsData.callsStatusOverview.successful.toLocaleString()}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Completed</CardTitle>
                          <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {analyticsData.callsStatusOverview.completed.toLocaleString()}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Call Status Breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Call Status Overview</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {Object.entries(analyticsData.callsStatusOverview).map(([key, value]) => (
                              <div key={key} className="flex justify-between items-center">
                                <span className="text-sm capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                                <span className="font-medium">{value.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Event Counts</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {Object.entries(analyticsData.callEventsCounts).map(([key, value]) => (
                              <div key={key} className="flex justify-between items-center">
                                <span className="text-sm capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                                <span className="font-medium">{value.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  {/* Timeline Tab */}
                  <TabsContent value="timeline" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Calls Timeline</CardTitle>
                        <CardDescription>Total calls and leads over time</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={analyticsData.callsStatusTimeLine}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                dataKey="date"
                                tickFormatter={(value) => new Date(value).toLocaleDateString()}
                                fontSize={12}
                              />
                              <YAxis fontSize={12} />
                              <Tooltip
                                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                                formatter={(value, name) => [value.toLocaleString(), name]}
                              />
                              <Line
                                type="monotone"
                                dataKey="totalCalls"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                name="Total Calls"
                                dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                              />
                              <Line
                                type="monotone"
                                dataKey="totalLeads"
                                stroke="#10b981"
                                strokeWidth={2}
                                name="Total Leads"
                                dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Average Call Duration</CardTitle>
                        <CardDescription>Average call duration over time (minutes)</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={analyticsData.callsAverageTimeLine}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                dataKey="date"
                                tickFormatter={(value) => new Date(value).toLocaleDateString()}
                                fontSize={12}
                              />
                              <YAxis fontSize={12} tickFormatter={(value) => `${Math.round(value / 60)}m`} />
                              <Tooltip
                                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                                formatter={(value) => [`${Math.round(Number(value) / 60)} minutes`, "Average Duration"]}
                              />
                              <Line
                                type="monotone"
                                dataKey="averageCallDuration"
                                stroke="#8b5cf6"
                                strokeWidth={2}
                                name="Average Duration"
                                dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 4 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Performance Tab */}
                  <TabsContent value="performance" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Pickup Rate</CardTitle>
                          <CardDescription>Call pickup rate over time (%)</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={analyticsData.callsPickupRateTimeLine}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                  dataKey="date"
                                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                                  fontSize={12}
                                />
                                <YAxis fontSize={12} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                                <Tooltip
                                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                                  formatter={(value) => [`${value}%`, "Pickup Rate"]}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="pickupRatePercentage"
                                  stroke="#f59e0b"
                                  strokeWidth={2}
                                  name="Pickup Rate"
                                  dot={{ fill: "#f59e0b", strokeWidth: 2, r: 4 }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Success Rate</CardTitle>
                          <CardDescription>Call success rate over time (%)</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={analyticsData.callsSuccessRateTimeLine}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                  dataKey="date"
                                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                                  fontSize={12}
                                />
                                <YAxis fontSize={12} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                                <Tooltip
                                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                                  formatter={(value) => [`${value}%`, "Success Rate"]}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="successRatePercentage"
                                  stroke="#22c55e"
                                  strokeWidth={2}
                                  name="Success Rate"
                                  dot={{ fill: "#22c55e", strokeWidth: 2, r: 4 }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle>Cost Analysis</CardTitle>
                        <CardDescription>Total cost and average cost per call over time</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={analyticsData.callsCostTimeLine}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                dataKey="date"
                                tickFormatter={(value) => new Date(value).toLocaleDateString()}
                                fontSize={12}
                              />
                              <YAxis yAxisId="left" fontSize={12} tickFormatter={(value) => `$${value.toFixed(2)}`} />
                              <YAxis
                                yAxisId="right"
                                orientation="right"
                                fontSize={12}
                                tickFormatter={(value) => `$${value.toFixed(3)}`}
                              />
                              <Tooltip
                                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                                formatter={(value, name) => [
                                  name === "Total Price"
                                    ? `$${typeof value === "number" ? value.toFixed(2) : value}`
                                    : `$${typeof value === "number" ? value.toFixed(3) : value}`,
                                  name,
                                ]}
                              />
                              <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="totalPrice"
                                stroke="#dc2626"
                                strokeWidth={2}
                                name="Total Price"
                                dot={{ fill: "#dc2626", strokeWidth: 2, r: 4 }}
                              />
                              <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="averageCostPerCall"
                                stroke="#7c3aed"
                                strokeWidth={2}
                                name="Avg Cost Per Call"
                                dot={{ fill: "#7c3aed", strokeWidth: 2, r: 4 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Sentiment Tab */}
                  <TabsContent value="sentiment" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Sentiment Analysis</CardTitle>
                        <CardDescription>Distribution of call sentiments</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            {Object.entries(analyticsData.callsSentimentOverview).map(([key, value]) => {
                              const total = Object.values(analyticsData.callsSentimentOverview).reduce(
                                (a, b) => a + b,
                                0,
                              )
                              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : "0"
                              return (
                                <div key={key} className="flex items-center justify-between p-3 rounded-lg border">
                                  <div className="flex items-center space-x-3">
                                    <div
                                      className="w-4 h-4 rounded-full"
                                      style={{
                                        backgroundColor: SENTIMENT_COLORS[key as keyof typeof SENTIMENT_COLORS],
                                      }}
                                    />
                                    <span className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-semibold">{value.toLocaleString()}</span>
                                    <span className="text-sm text-gray-500 ml-2">({percentage}%)</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                          <div className="flex justify-center">
                            <div className="h-[300px] w-[300px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={Object.entries(analyticsData.callsSentimentOverview)
                                      .filter(([, value]) => value > 0)
                                      .map(([key, value]) => ({
                                        name: key.replace(/([A-Z])/g, " $1").trim(),
                                        value,
                                        fill: SENTIMENT_COLORS[key as keyof typeof SENTIMENT_COLORS],
                                      }))}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    labelLine={false}
                                  >
                                    {Object.entries(analyticsData.callsSentimentOverview).map(([key], index) => (
                                      <Cell
                                        key={`cell-${index}`}
                                        fill={SENTIMENT_COLORS[key as keyof typeof SENTIMENT_COLORS]}
                                      />
                                    ))}
                                  </Pie>
                                  <Tooltip formatter={(value, name) => [value.toLocaleString(), name]} />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Events Tab */}
                  <TabsContent value="events" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Call Labels</CardTitle>
                          <CardDescription>Distribution of call labels</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {analyticsData.callLabelCount.map((label) => {
                              const total = analyticsData.callLabelCount.reduce((sum, l) => sum + l.count, 0)
                              const percentage = total > 0 ? ((label.count / total) * 100).toFixed(1) : "0"
                              return (
                                <div key={label.id} className="flex items-center justify-between p-3 rounded-lg border">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: label.color }} />
                                    <span>{label.name}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-semibold">{label.count.toLocaleString()}</span>
                                    <span className="text-sm text-gray-500 ml-2">({percentage}%)</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Calls by Hour</CardTitle>
                          <CardDescription>Call distribution throughout the day</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={analyticsData.callsByHourDayOfWeeks}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="hourOfDay" fontSize={12} tickFormatter={(value) => `${value}:00`} />
                                <YAxis fontSize={12} />
                                <Tooltip
                                  labelFormatter={(value) => `${value}:00`}
                                  formatter={(value) => [value.toLocaleString(), "Calls"]}
                                />
                                <Bar dataKey="count" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-500 mb-4">No analytics data available.</p>
                    <Button
                      onClick={() =>
                        userData?.token && userData?.authId && fetchAnalytics(userData.token, userData.authId)
                      }
                    >
                      Load Analytics
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Credentials Modal */}
          <Dialog open={showModal} onOpenChange={setShowModal}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{isConfigured ? "Update Credentials" : "Setup Required"}</DialogTitle>
                <DialogDescription>
                  {isConfigured
                    ? "Update your Auth ID and Token below."
                    : "Please provide your Auth ID and Token to complete your account setup and view analytics."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="authId">Auth ID (Bearer Token)</Label>
                  <Input
                    id="authId"
                    value={authId}
                    onChange={(e) => setAuthId(e.target.value)}
                    placeholder="Enter your Auth ID"
                    disabled={submitting}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="token">Token (Outbound ID)</Label>
                  <Input
                    id="token"
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Enter your token"
                    disabled={submitting}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleCloseModal} disabled={submitting}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitCredentials} disabled={!canSubmit}>
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
      </div>
      <Toaster />
    </>
  )
}

export default OverviewPage
