"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Phone, Plus, Upload, X, Play, Pause, Clock, PhoneCall } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"

// API configuration
const API_ENDPOINT = "https://api.nlpearl.ai/v1/Outbound/67d42f167f3c392c6d7a2d40/Call"
const API_TOKEN = "66fbc9e9d6345ec186da95b2:DyRnA7LIMEdLMTuEy9UColX8RnWTTqU2"

// Lead type definition
type Lead = {
  id: string
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  status: "pending" | "called" | "failed"
  callId?: string
}

// Bulk call state type
type BulkCallState = {
  inProgress: boolean
  currentIndex: number
  totalCalls: number
  timeframe: number
  paused: boolean
}

export default function OutboundCallingSystem() {
  // State for leads and modal
  const [leads, setLeads] = useState<Lead[]>([])
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false)
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false)
  const [isBulkCallOpen, setIsBulkCallOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
  })

  // Bulk import state
  const [bulkData, setBulkData] = useState("")
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvPreview, setCsvPreview] = useState<string[][]>([])

  // Bulk call state
  const [bulkCallState, setBulkCallState] = useState<BulkCallState>({
    inProgress: false,
    currentIndex: 0,
    totalCalls: 0,
    timeframe: 5,
    paused: false,
  })

  // Refs for bulk calling
  const bulkCallQueueRef = useRef<Lead[]>([])
  const bulkCallTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Handle bulk data input changes
  const handleBulkDataChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBulkData(e.target.value)
  }

  // Handle CSV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file.",
        variant: "destructive",
      })
      return
    }

    setCsvFile(file)

    // Read and preview the file
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.trim().split("\n")
      const preview = lines.slice(0, 5).map((line) => line.split(",").map((cell) => cell.trim().replace(/"/g, "")))
      setCsvPreview(preview)
    }
    reader.readAsText(file)
  }

  // Process CSV file import
  const handleCsvImport = () => {
    if (!csvFile) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to import.",
        variant: "destructive",
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const lines = text.trim().split("\n")

        if (lines.length < 2) {
          toast({
            title: "Invalid CSV",
            description: "CSV file must contain at least a header and one data row.",
            variant: "destructive",
          })
          return
        }

        // Parse header to find column indices
        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""))

        // Find column indices for name, email, phone
        const firstNameIndex = headers.findIndex(
          (h) => (h.includes("first") && h.includes("name")) || h === "firstname",
        )
        const lastNameIndex = headers.findIndex((h) => (h.includes("last") && h.includes("name")) || h === "lastname")
        const nameIndex = headers.findIndex((h) => h === "name" && firstNameIndex === -1)
        const emailIndex = headers.findIndex((h) => h.includes("email"))
        const phoneIndex = headers.findIndex((h) => h.includes("phone") || h.includes("mobile") || h.includes("number"))

        if ((firstNameIndex === -1 && nameIndex === -1) || phoneIndex === -1) {
          toast({
            title: "Missing required columns",
            description: "CSV must contain name (or first/last name) and phone columns.",
            variant: "destructive",
          })
          return
        }

        const newLeads: Lead[] = []

        // Process data rows
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(",").map((cell) => cell.trim().replace(/"/g, ""))

          if (row.length < headers.length) continue

          let firstName = ""
          let lastName = ""

          if (firstNameIndex !== -1 && lastNameIndex !== -1) {
            firstName = row[firstNameIndex] || ""
            lastName = row[lastNameIndex] || ""
          } else if (nameIndex !== -1) {
            const fullName = row[nameIndex].split(" ")
            firstName = fullName[0] || ""
            lastName = fullName.slice(1).join(" ") || ""
          }

          const email = emailIndex !== -1 ? row[emailIndex] || "" : ""
          const phoneNumber = row[phoneIndex] || ""

          if (firstName && phoneNumber) {
            newLeads.push({
              id: crypto.randomUUID(),
              firstName,
              lastName,
              email,
              phoneNumber,
              status: "pending",
            })
          }
        }

        if (newLeads.length === 0) {
          toast({
            title: "No valid leads found",
            description: "Please check your CSV format and try again.",
            variant: "destructive",
          })
          return
        }

        setLeads((prev) => [...prev, ...newLeads])
        setCsvFile(null)
        setCsvPreview([])
        setIsBulkImportOpen(false)

        toast({
          title: "CSV import successful",
          description: `${newLeads.length} leads have been imported from CSV.`,
        })
      } catch (error) {
        console.log(error)
        toast({
          title: "Import failed",
          description: "There was an error processing your CSV file. Please check the format and try again.",
          variant: "destructive",
        })
      }
    }
    reader.readAsText(csvFile)
  }

  // Reset form data
  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
    })
  }

  // Add a single lead
  const handleAddLead = () => {
    // Basic validation
    if (!formData.firstName || !formData.lastName || !formData.phoneNumber) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    // Add new lead
    const newLead: Lead = {
      id: crypto.randomUUID(),
      ...formData,
      status: "pending",
    }

    setLeads((prev) => [...prev, newLead])
    resetForm()
    setIsAddLeadOpen(false)

    toast({
      title: "Lead added",
      description: `${newLead.firstName} ${newLead.lastName} has been added to your leads.`,
    })
  }

  // Process bulk import
  const handleBulkImport = () => {
    try {
      // Split by lines and process
      const lines = bulkData.trim().split("\n")

      // Skip header if it exists
      const startIndex =
        lines[0].toLowerCase().includes("first") ||
        lines[0].toLowerCase().includes("name") ||
        lines[0].toLowerCase().includes("email")
          ? 1
          : 0

      const newLeads: Lead[] = []

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        // Assume CSV format: firstName,lastName,email,phoneNumber
        const [firstName, lastName, email, phoneNumber] = line.split(",").map((item) => item.trim())

        if (firstName && lastName && phoneNumber) {
          newLeads.push({
            id: crypto.randomUUID(),
            firstName,
            lastName,
            email: email || "",
            phoneNumber,
            status: "pending",
          })
        }
      }

      if (newLeads.length === 0) {
        toast({
          title: "No valid leads found",
          description: "Please check your data format and try again.",
          variant: "destructive",
        })
        return
      }

      setLeads((prev) => [...prev, ...newLeads])
      setBulkData("")
      setIsBulkImportOpen(false)

      toast({
        title: "Bulk import successful",
        description: `${newLeads.length} leads have been imported.`,
      })
    } catch (error) {
      console.log(error)
      toast({
        title: "Import failed",
        description: "There was an error processing your data. Please check the format and try again.",
        variant: "destructive",
      })
    }
  }

  // Make an outbound call
  const makeCall = async (lead: Lead) => {
    setIsLoading(true)

    try {
      // Step 1: Create a call request
      const createResponse = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: lead.phoneNumber,
          callData: {
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email,
          },
        }),
      })

      if (!createResponse.ok) {
        throw new Error(`API error: ${createResponse.status}`)
      }

      const createData = await createResponse.json()
      console.log("Call Request Created:", createData)

      // Ensure we have a valid request ID from the response
      if (!createData.id) {
        throw new Error("No request ID received from API")
      }

      const requestId = createData.id

      // Save call info with request ID to localStorage
      const callInfo = {
        id: requestId, // Use the request ID
        requestId: requestId, // Store request ID separately for fetching call ID later
        from: createData.from || "Unknown",
        to: createData.to || lead.phoneNumber,
        leadName: `${lead.firstName} ${lead.lastName}`,
        startTime: new Date().toISOString(),
        status: "In Progress",
        conversationStatus: "In Call Queue",
        queuePosition: createData.queuePosition || 0,
      }

      // Save call info to localStorage
      const existingCalls = JSON.parse(localStorage.getItem("outboundCalls") || "[]")
      existingCalls.push(callInfo)
      localStorage.setItem("outboundCalls", JSON.stringify(existingCalls))

      // Update lead status with the request ID
      setLeads(leads.map((l) => (l.id === lead.id ? { ...l, status: "called", callId: requestId } : l)))

      toast({
        title: "Call initiated",
        description: `Call to ${lead.firstName} ${lead.lastName} has been initiated. Request ID: ${requestId}`,
      })

      return true
    } catch (error) {
      console.error("Call failed:", error)

      // Update lead status to failed
      setLeads(leads.map((l) => (l.id === lead.id ? { ...l, status: "failed" } : l)))

      toast({
        title: "Call failed",
        description: `There was an error initiating the call: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })

      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Remove a lead
  const removeLead = (id: string) => {
    setLeads(leads.filter((lead) => lead.id !== id))
    setSelectedLeads((prev) => {
      const newSet = new Set(prev)
      newSet.delete(id)
      return newSet
    })
    toast({
      title: "Lead removed",
      description: "The lead has been removed from your list.",
    })
  }

  // Toggle lead selection
  const toggleLeadSelection = (id: string) => {
    setSelectedLeads((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  // Toggle select all leads
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedLeads(new Set())
    } else {
      const pendingLeadIds = leads.filter((lead) => lead.status === "pending").map((lead) => lead.id)
      setSelectedLeads(new Set(pendingLeadIds))
    }
    setSelectAll(!selectAll)
  }

  // Start bulk call process
  const startBulkCall = () => {
    if (selectedLeads.size === 0) {
      toast({
        title: "No leads selected",
        description: "Please select at least one lead to call.",
        variant: "destructive",
      })
      return
    }

    // Get selected leads that are pending
    const selectedLeadsList = leads.filter((lead) => selectedLeads.has(lead.id) && lead.status === "pending")

    if (selectedLeadsList.length === 0) {
      toast({
        title: "No valid leads",
        description: "All selected leads have already been called.",
        variant: "destructive",
      })
      return
    }

    // Set up bulk call state
    setBulkCallState({
      inProgress: true,
      currentIndex: 0,
      totalCalls: selectedLeadsList.length,
      timeframe: bulkCallState.timeframe,
      paused: false,
    })

    // Store the queue in ref to avoid state closure issues
    bulkCallQueueRef.current = [...selectedLeadsList]

    // Start the calling process
    processBulkCallQueue()

    setIsBulkCallOpen(false)

    toast({
      title: "Bulk call started",
      description: `Starting calls to ${selectedLeadsList.length} leads with ${bulkCallState.timeframe} seconds between calls.`,
    })
  }

  // Process the bulk call queue
  const processBulkCallQueue = async () => {
    if (bulkCallQueueRef.current.length === 0 || bulkCallState.paused) {
      return
    }

    const lead = bulkCallQueueRef.current.shift()
    if (!lead) return

    // Make the call
    await makeCall(lead)

    // Update progress
    setBulkCallState((prev) => ({
      ...prev,
      currentIndex: prev.currentIndex + 1,
    }))

    // If there are more calls to make, schedule the next one
    if (bulkCallQueueRef.current.length > 0 && !bulkCallState.paused) {
      bulkCallTimerRef.current = setTimeout(processBulkCallQueue, bulkCallState.timeframe * 1000)
    } else {
      // All done or paused
      if (bulkCallQueueRef.current.length === 0) {
        setBulkCallState((prev) => ({
          ...prev,
          inProgress: false,
        }))

        toast({
          title: "Bulk call completed",
          description: `Successfully completed all ${bulkCallState.totalCalls} calls.`,
        })
      }
    }
  }

  // Pause bulk call process
  const pauseBulkCall = () => {
    setBulkCallState((prev) => ({
      ...prev,
      paused: true,
    }))

    if (bulkCallTimerRef.current) {
      clearTimeout(bulkCallTimerRef.current)
    }

    toast({
      title: "Bulk call paused",
      description: `Paused after ${bulkCallState.currentIndex} of ${bulkCallState.totalCalls} calls.`,
    })
  }

  // Resume bulk call process
  const resumeBulkCall = () => {
    setBulkCallState((prev) => ({
      ...prev,
      paused: false,
    }))

    processBulkCallQueue()

    toast({
      title: "Bulk call resumed",
      description: `Resuming with ${bulkCallQueueRef.current.length} calls remaining.`,
    })
  }

  // Cancel bulk call process
  const cancelBulkCall = () => {
    setBulkCallState({
      inProgress: false,
      currentIndex: 0,
      totalCalls: 0,
      timeframe: bulkCallState.timeframe,
      paused: false,
    })

    bulkCallQueueRef.current = []

    if (bulkCallTimerRef.current) {
      clearTimeout(bulkCallTimerRef.current)
    }

    toast({
      title: "Bulk call cancelled",
      description: "The bulk call operation has been cancelled.",
    })
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (bulkCallTimerRef.current) {
        clearTimeout(bulkCallTimerRef.current)
      }
    }
  }, [])

  return (
    <div className="container mx-auto py-8">
      <Toaster />

      <header className="mb-8">
        <h1 className="text-3xl font-bold">Outbound Calling System</h1>
        <p className="text-muted-foreground mt-2">Manage your leads and make outbound calls</p>
      </header>

      <div className="flex justify-between items-center mb-6">
        <div className="space-x-2">
          <Button onClick={() => setIsAddLeadOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Lead
          </Button>
          <Button variant="outline" onClick={() => setIsBulkImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Bulk Import
          </Button>
          <Button
            variant="secondary"
            onClick={() => setIsBulkCallOpen(true)}
            disabled={selectedLeads.size === 0 || bulkCallState.inProgress}
          >
            <PhoneCall className="mr-2 h-4 w-4" /> Bulk Call ({selectedLeads.size})
          </Button>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">
            {leads.length} leads • {leads.filter((l) => l.status === "called").length} called
          </p>
        </div>
      </div>

      {/* Bulk Call Progress Bar */}
      {bulkCallState.inProgress && (
        <div className="mb-6 p-4 border rounded-lg bg-slate-50">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">Bulk Call in Progress</h3>
            <div className="space-x-2">
              {bulkCallState.paused ? (
                <Button size="sm" variant="outline" onClick={resumeBulkCall}>
                  <Play className="h-4 w-4 mr-1" /> Resume
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={pauseBulkCall}>
                  <Pause className="h-4 w-4 mr-1" /> Pause
                </Button>
              )}
              <Button size="sm" variant="destructive" onClick={cancelBulkCall}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </div>
          </div>
          <Progress value={(bulkCallState.currentIndex / bulkCallState.totalCalls) * 100} className="h-2 mb-2" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              {bulkCallState.currentIndex} of {bulkCallState.totalCalls} calls completed
            </span>
            <span className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {bulkCallState.timeframe} seconds between calls
            </span>
          </div>
        </div>
      )}

      {leads.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox checked={selectAll} onCheckedChange={toggleSelectAll} aria-label="Select all leads" />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedLeads.has(lead.id)}
                      onCheckedChange={() => toggleLeadSelection(lead.id)}
                      disabled={lead.status !== "pending" || bulkCallState.inProgress}
                      aria-label={`Select ${lead.firstName} ${lead.lastName}`}
                    />
                  </TableCell>
                  <TableCell>
                    {lead.firstName} {lead.lastName}
                  </TableCell>
                  <TableCell>{lead.email}</TableCell>
                  <TableCell>{lead.phoneNumber}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        lead.status === "called"
                          ? "bg-green-100 text-green-800"
                          : lead.status === "failed"
                            ? "bg-red-100 text-red-800"
                            : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {lead.status === "called" ? "Called" : lead.status === "failed" ? "Failed" : "Pending"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => makeCall(lead)}
                              disabled={isLoading || lead.status === "called" || bulkCallState.inProgress}
                            >
                              <Phone className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Call this lead</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="ghost" onClick={() => removeLead(lead.id)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Remove lead</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">No leads added yet. Add your first lead to get started.</p>
          <Button className="mt-4" onClick={() => setIsAddLeadOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Lead
          </Button>
        </div>
      )}

      {/* Add Lead Modal */}
      <Dialog open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
            <DialogDescription>Enter the lead&apos;s information to add them to your calling list.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="John"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Doe"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="john.doe@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number *</Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                placeholder="+1234567890"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddLeadOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddLead}>Add Lead</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Modal */}
      <Dialog open={isBulkImportOpen} onOpenChange={setIsBulkImportOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Bulk Import Leads</DialogTitle>
            <DialogDescription>
              Paste your lead data in CSV format: firstName,lastName,email,phoneNumber
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Tabs defaultValue="paste">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="paste">Paste Data</TabsTrigger>
                <TabsTrigger value="upload">Upload CSV</TabsTrigger>
                <TabsTrigger value="format">Format Guide</TabsTrigger>
              </TabsList>
              <TabsContent value="paste" className="space-y-4">
                <Textarea
                  placeholder="John,Doe,john@example.com,+1234567890"
                  className="min-h-[200px]"
                  value={bulkData}
                  onChange={handleBulkDataChange}
                />
                <p className="text-xs text-muted-foreground">
                  Each line should contain one lead in the format: firstName,lastName,email,phoneNumber
                </p>
              </TabsContent>
              <TabsContent value="upload" className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <label htmlFor="csv-upload" className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-gray-900">Upload CSV file</span>
                        <span className="mt-1 block text-sm text-gray-500">
                          Select a CSV file with name, email, and phone columns
                        </span>
                      </label>
                      <input id="csv-upload" type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-4"
                      onClick={() => document.getElementById("csv-upload")?.click()}
                    >
                      Choose File
                    </Button>
                  </div>
                </div>

                {csvFile && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Selected file: {csvFile.name}</p>
                    {csvPreview.length > 0 && (
                      <div className="border rounded-md p-3">
                        <p className="text-xs text-muted-foreground mb-2">Preview (first 5 rows):</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <tbody>
                              {csvPreview.map((row, index) => (
                                <tr key={index} className={index === 0 ? "font-medium bg-muted" : ""}>
                                  {row.map((cell, cellIndex) => (
                                    <td key={cellIndex} className="border px-2 py-1 truncate max-w-[100px]">
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="format">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Paste Data Format:</h4>
                    <p className="text-sm mb-2">Your data should be in CSV format with the following columns:</p>
                    <pre className="bg-muted p-4 rounded-md text-xs">
                      firstName,lastName,email,phoneNumber
                      <br />
                      John,Doe,john@example.com,+1234567890
                      <br />
                      Jane,Smith,jane@example.com,+0987654321
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">CSV File Format:</h4>
                    <p className="text-sm mb-2">Your CSV file can have any of these column combinations:</p>
                    <ul className="text-sm space-y-1 ml-4">
                      <li>
                        • <code>firstName, lastName, email, phone</code>
                      </li>
                      <li>
                        • <code>first name, last name, email, phone number</code>
                      </li>
                      <li>
                        • <code>name, email, mobile</code>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-amber-50 p-3 rounded-md">
                    <h4 className="font-medium text-amber-800 flex items-center">
                      <Clock className="h-4 w-4 mr-2" /> Important Notes
                    </h4>
                    <ul className="text-sm space-y-1 mt-2 text-amber-700">
                      <li>• Calls will be made sequentially with the specified delay</li>
                      <li>• You can pause or cancel the bulk call process at any time</li>
                      <li>• Each call will update the lead status automatically</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkImportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={bulkData ? handleBulkImport : handleCsvImport}>
              {csvFile ? "Import from CSV" : "Import Leads"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Call Modal */}
      <Dialog open={isBulkCallOpen} onOpenChange={setIsBulkCallOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Bulk Call Settings</DialogTitle>
            <DialogDescription>Configure settings for calling multiple leads in sequence</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Selected Leads</h3>
                <div className="bg-muted p-3 rounded-md">
              <p className="text-sm">
  <strong>{selectedLeads.size}</strong> leads selected for bulk calling
</p>
<p className="text-xs text-muted-foreground mt-1">Only leads with &quot;Pending&quot; status will be called</p>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Time Between Calls (seconds)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[bulkCallState.timeframe]}
                    min={3}
                    max={30}
                    step={1}
                    onValueChange={(value) => setBulkCallState((prev) => ({ ...prev, timeframe: value[0] }))}
                    className="flex-1"
                  />
                  <span className="w-12 text-center font-medium">{bulkCallState.timeframe}s</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Recommended: 5-10 seconds between calls to avoid overwhelming the system
                </p>
              </div>

              <div className="bg-amber-50 p-3 rounded-md">
                <h4 className="font-medium text-amber-800 flex items-center">
                  <Clock className="h-4 w-4 mr-2" /> Important Notes
                </h4>
                <ul className="text-sm space-y-1 mt-2 text-amber-700">
                  <li>• Calls will be made sequentially with the specified delay</li>
                  <li>• You can pause or cancel the bulk call process at any time</li>
                  <li>• Each call will update the lead status automatically</li>
                </ul>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkCallOpen(false)}>
              Cancel
            </Button>
            <Button onClick={startBulkCall}>Start Bulk Call</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
