import { useWebSocket } from "@/contexts/websocket-context";
import { useTheme } from "@/contexts/theme-context";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Wifi, WifiOff } from "lucide-react";

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { isConnected } = useWebSocket();

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground text-lg">🐎</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary dark:text-primary" data-testid="app-title">
                Конный Трекер
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">GPS Мониторинг</p>
            </div>
          </div>

          {/* Connection Status & Controls */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Connection Status - Show icon only on mobile, full on desktop */}
            <div className={`flex items-center px-2 py-1 rounded-full ${
              isConnected 
                ? 'bg-green-100 dark:bg-green-900' 
                : 'bg-red-100 dark:bg-red-900'
            }`} data-testid="connection-status">
              {isConnected ? (
                <>
                  <Wifi className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="hidden sm:inline text-sm font-medium text-green-800 dark:text-green-200 ml-2">
                    Подключено
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="hidden sm:inline text-sm font-medium text-red-800 dark:text-red-200 ml-2">
                    Отключено
                  </span>
                </>
              )}
            </div>

            {/* Theme Toggle */}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
              data-testid="theme-toggle"
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              ) : (
                <Sun className="h-4 w-4 text-yellow-400" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
