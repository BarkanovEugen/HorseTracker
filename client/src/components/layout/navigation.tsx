import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { BarChart3, Rabbit, History, Settings } from "lucide-react";

const navItems = [
  {
    name: "Панель управления",
    href: "/",
    icon: BarChart3,
    testId: "nav-dashboard"
  },
  {
    name: "Лошади",
    href: "/horses",
    icon: Rabbit,
    testId: "nav-horses"
  },
  {
    name: "История",
    href: "/history",
    icon: History,
    testId: "nav-history"
  },
  {
    name: "Настройки",
    href: "/settings",
    icon: Settings,
    testId: "nav-settings"
  },
];

export default function Navigation() {
  const [location] = useLocation();

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="flex justify-center sm:justify-start space-x-2 sm:space-x-8 overflow-x-auto scrollbar-hide">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <Link key={item.href} href={item.href}>
                <button
                  className={cn(
                    "py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 transition-colors min-w-max",
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  )}
                  data-testid={item.testId}
                >
                  <Icon className="w-4 h-4" />
                  <span className="whitespace-nowrap">{item.name}</span>
                </button>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
