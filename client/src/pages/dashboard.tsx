import { useState, useRef } from "react";
import ActiveAlerts from "@/components/alerts/active-alerts";
import MapLibreMap from "@/components/map/maplibre-map";
import QuickStats from "@/components/stats/quick-stats";
import BatteryStatus from "@/components/stats/battery-status";
import { Horse } from "@shared/schema";

export default function Dashboard() {
  const [selectedHorse, setSelectedHorse] = useState<Horse | null>(null);

  const handleHorseSelect = (horse: Horse) => {
    setSelectedHorse(horse);
    // Map will center on selected horse through selectedHorse prop
  };

  return (
    <div className="space-y-6">
      {/* Active Alerts - Prominent position at top */}
      <ActiveAlerts />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map Section - Takes up 3/4 of the width on large screens */}
        <div className="lg:col-span-3">
          <MapLibreMap 
            selectedHorse={selectedHorse}
            onHorseSelect={setSelectedHorse}
          />
        </div>
        
        {/* Stats Sidebar - Takes up 1/4 of the width on large screens */}
        <div className="space-y-6">
          <QuickStats />
          <BatteryStatus onHorseSelect={handleHorseSelect} />
        </div>
      </div>
    </div>
  );
}
