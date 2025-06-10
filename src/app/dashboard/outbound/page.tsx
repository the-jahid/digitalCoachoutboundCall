import AnalyticsPage from "@/components/dashboard/outbound/analytics-page"
import CallsPage from "@/components/dashboard/outbound/calls-page"
import LeadsPage from "@/components/dashboard/outbound/leads-page"
import OverviewPage from "@/components/dashboard/outbound/overview-page"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"


export default function Dashboard() {
  return (
    <div className=" bg-white h-screen overflow-auto text-black w-full">
      <div className=" w-full mx-auto p-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-100">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white">
              Overview
            </TabsTrigger>
            <TabsTrigger value="leads" className="data-[state=active]:bg-white">
              Leads
            </TabsTrigger>
            <TabsTrigger value="calls" className="data-[state=active]:bg-white">
              Calls
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-white">
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <OverviewPage />
          </TabsContent>

          <TabsContent value="leads" className="mt-6">
            <LeadsPage />
          </TabsContent>

          <TabsContent value="calls" className="mt-6">
            <CallsPage />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <AnalyticsPage />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}







