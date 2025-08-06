import { useWebSocket } from "@/contexts/websocket-context";
import { useTheme } from "@/contexts/theme-context";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Wifi, WifiOff } from "lucide-react";

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { isConnected } = useWebSocket();

  return (
    <header className="bg-white dark:bg-gray-900 shadow-md border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo and Title - Compact on mobile */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary to-green-600 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white text-base sm:text-lg">🐎</span>
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white" data-testid="app-title">
                Конный Трекер
              </h1>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 -mt-0.5">
                GPS Мониторинг
              </p>
            </div>
          </div>

          {/* Connection Status & Controls - Compact on mobile */}
          <div className="flex items-center space-x-1.5 sm:space-x-3">
            {/* Connection Status - Icon only on mobile */}
            <div className={`flex items-center px-1.5 sm:px-2.5 py-1 rounded-full transition-colors ${
              isConnected 
                ? 'bg-green-100 dark:bg-green-900/50 shadow-sm' 
                : 'bg-red-100 dark:bg-red-900/50 shadow-sm animate-pulse'
            }`} data-testid="connection-status">
              {isConnected ? (
                <>
                  <Wifi className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 dark:text-green-400" />
                  <span className="hidden sm:inline text-xs sm:text-sm font-medium text-green-700 dark:text-green-300 ml-1.5">
                    В сети
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600 dark:text-red-400" />
                  <span className="hidden sm:inline text-xs sm:text-sm font-medium text-red-700 dark:text-red-300 ml-1.5">
                    Нет сети
                  </span>
                </>
              )}
            </div>

            {/* Theme Toggle - Smaller on mobile */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="w-8 h-8 sm:w-9 sm:h-9 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              data-testid="theme-toggle"
            >
              {theme === "light" ? (
                <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-700 dark:text-gray-300" />
              ) : (
                <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-500" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
