import ActiveAlerts from "@/components/alerts/active-alerts";
import MapLibreMap from "@/components/map/maplibre-map";
import QuickStats from "@/components/stats/quick-stats";
import BatteryStatus from "@/components/stats/battery-status";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Active Alerts - Prominent position at top */}
      <ActiveAlerts />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map Section - Takes up 3/4 of the width on large screens */}
        <div className="lg:col-span-3">
          <MapLibreMap />
        </div>
        
        {/* Stats Sidebar - Takes up 1/4 of the width on large screens */}
        <div className="space-y-6">
          <QuickStats />
          <BatteryStatus />
        </div>
      </div>
    </div>
  );
}
