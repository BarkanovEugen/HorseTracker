import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { BarChart3, Rabbit, History, Settings, Calendar } from "lucide-react";

const navItems = [
  {
    name: "Главная",
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
    name: "Календарь",
    href: "/calendar",
    icon: Calendar,
    testId: "nav-calendar"
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

export default function BottomNavigation() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg" style={{ zIndex: 1000 }}>
      <div className="flex justify-around items-center py-2 px-1 pb-safe"
           style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
        {navItems.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          
          return (
            <Link key={item.href} href={item.href}>
              <button
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 min-w-[60px]",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
                data-testid={item.testId}
              >
                <Icon className={cn(
                  "transition-all duration-200",
                  isActive ? "w-6 h-6 mb-1" : "w-5 h-5 mb-1"
                )} />
                <span className={cn(
                  "text-[10px] font-medium transition-all",
                  isActive ? "font-semibold" : "font-normal"
                )}>
                  {item.name}
                </span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}