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
    <>
      {/* Mobile Layout - Original design */}
      <div className="lg:hidden p-3 sm:p-4 space-y-3 sm:space-y-4 bg-gray-50 dark:bg-gray-900 min-h-screen">
        {/* Active Alerts - Prominent position at top */}
        <ActiveAlerts />

        {/* Main Content Grid - Mobile first order */}
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          {/* Map Section */}
          <div className="order-1">
            <div className="h-[300px] sm:h-[400px]">
              <MapLibreMap 
                selectedHorse={selectedHorse}
                onHorseSelect={setSelectedHorse}
                onResetView={handleResetView}
              />
            </div>
          </div>

          {/* Horse Status - Directly under map on mobile */}
          <div className="order-2">
            <HorseStatus onHorseSelect={handleHorseSelect} />
          </div>

          {/* Stats Section */}
          <div className="order-3">
            <QuickStats />
          </div>
        </div>
      </div>

      {/* Desktop Layout - FHD optimized */}
      <div className="hidden lg:flex lg:h-screen lg:flex-col bg-gray-50 dark:bg-gray-900">
        {/* Main content area */}
        <div className="flex-1 flex">
          {/* Left Sidebar - Horses List */}
          <div className="w-80 xl:w-96 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Лошади</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <HorseStatus onHorseSelect={handleHorseSelect} />
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <QuickStats />
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 flex flex-col">
            {/* Map - Balanced space with alerts */}
            <div className="h-[60vh] xl:h-[65vh] relative">
              <div className="absolute inset-0">
                <MapLibreMap 
                  selectedHorse={selectedHorse}
                  onHorseSelect={setSelectedHorse}
                  onResetView={handleResetView}
                />
              </div>
            </div>

            {/* Bottom Panel - Alerts */}
            <div className="flex-1 min-h-[300px] xl:min-h-[350px] bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <div className="p-6 h-full flex flex-col">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Уведомления</h3>
                <div className="flex-1 overflow-y-auto">
                  <ActiveAlerts />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
