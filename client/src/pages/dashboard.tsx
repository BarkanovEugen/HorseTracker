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
  };

  const handleResetView = () => {
    setSelectedHorse(null);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Active Alerts - Prominent position at top */}
      <ActiveAlerts />

      {/* Main Content - Mobile first, responsive layout */}
      <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Stats Section - Above map on mobile, sidebar on desktop */}
        <div className="order-2 lg:order-2 lg:col-span-1 grid grid-cols-2 gap-4 lg:grid-cols-1 lg:space-y-6">
          <QuickStats />
          <BatteryStatus onHorseSelect={handleHorseSelect} />
        </div>

        {/* Map Section - Below stats on mobile, main content on desktop */}
        <div className="order-1 lg:order-1 lg:col-span-3 h-64 sm:h-80 lg:h-auto">
          <MapLibreMap 
            selectedHorse={selectedHorse}
            onHorseSelect={setSelectedHorse}
            onResetView={handleResetView}
          />
        </div>
      </div>
    </div>
  );
}
