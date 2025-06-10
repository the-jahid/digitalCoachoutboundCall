import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Phone, Globe, User, Calendar, Trash2, Edit } from "lucide-react"

import OutboundCallsTable from "./outbound-calls-table"
import StatsChart from "./stats-chart"


export default function OverviewPage() {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Usage (Minutes)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-black">307.57</div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Today Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-black">0</div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-black">385</div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Answered Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-black">130</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Outbound Details */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-black">Outbound Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Agent</span>
              </div>
              <div className="text-sm text-black">Outbound Claudia AI: &quot;AI TEAM&quot; Prompt Script 9 MAG h 12:00</div>

              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-black">+393399908011</span>
              </div>

              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-black">Italian</span>
              </div>

              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-black">1</span>
              </div>

              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-black">Claudia (Isabella)</span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-black">5/30/2025</span>
              </div>

              <div className="text-sm text-gray-600">Outbound ID</div>
              <div className="text-xs text-black font-mono">683398c3c003e9a6fcb7c53c8</div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="destructive" size="sm" className="flex items-center gap-1">
                <Trash2 className="h-3 w-3" />
                Delete
              </Button>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Edit className="h-3 w-3" />
                Edit
              </Button>
            </div>

            <div className="pt-4">
              <div className="text-sm text-gray-600 mb-2">Budget</div>
              <div className="text-sm text-black">No Budget</div>
            </div>
          </CardContent>
        </Card>

        {/* Chart */}
        <div className="lg:col-span-2">
          <StatsChart />
        </div>
      </div>

      {/* Outbound Calls Table */}
      <OutboundCallsTable />
    </div>
  )
}
