import { useState, useRef } from "react";
import ActiveAlerts from "@/components/alerts/active-alerts";
import MapLibreMap from "@/components/map/maplibre-map";
import QuickStats from "@/components/stats/quick-stats";
import HorseStatus from "@/components/stats/battery-status";
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
    <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Active Alerts - Prominent position at top */}
      <ActiveAlerts />

      {/* Main Content Grid - Mobile first order */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {/* Map Section - First on mobile and desktop */}
        <div className="lg:col-span-3 order-1">
          <div className="h-[300px] sm:h-[400px] lg:h-[500px]">
            <MapLibreMap 
              selectedHorse={selectedHorse}
              onHorseSelect={setSelectedHorse}
              onResetView={handleResetView}
            />
          </div>
        </div>

        {/* Stats Section - Sidebar on desktop */}
        <div className="lg:col-span-1 order-3 lg:order-2 space-y-3 sm:space-y-4">
          <QuickStats />
        </div>

        {/* Horse Status - Directly under map on mobile, below stats on desktop */}
        <div className="lg:col-span-1 order-2 lg:order-3">
          <HorseStatus onHorseSelect={handleHorseSelect} />
        </div>
      </div>
    </div>
  );
}
