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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <Link key={item.href} href={item.href}>
                <button
                  className={cn(
                    "py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors",
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  )}
                  data-testid={item.testId}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </button>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
