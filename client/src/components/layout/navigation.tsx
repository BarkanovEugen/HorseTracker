import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { BarChart3, Rabbit, History, Settings, Shield, Calendar, Users } from "lucide-react";
import { useCanManageUsers } from "@/hooks/use-permissions";

const navItems = [
  {
    name: "Главная",
    nameFull: "Панель управления",
    href: "/",
    icon: BarChart3,
    testId: "nav-dashboard"
  },
  {
    name: "Лошади",
    nameFull: "Лошади",
    href: "/horses",
    icon: Rabbit,
    testId: "nav-horses"
  },
  {
    name: "Календарь",
    nameFull: "Календарь занятий",
    href: "/calendar",
    icon: Calendar,
    testId: "nav-calendar"
  },
  {
    name: "Инструкторы",
    nameFull: "Инструкторы",
    href: "/instructors",
    icon: Users,
    testId: "nav-instructors"
  },
  {
    name: "История",
    nameFull: "История",
    href: "/history",
    icon: History,
    testId: "nav-history"
  },
  {
    name: "Настройки",
    nameFull: "Настройки",
    href: "/settings",
    icon: Settings,
    testId: "nav-settings"
  },
];

export default function Navigation() {
  const [location] = useLocation();
  const canManageUsers = useCanManageUsers();

  // Add admin item conditionally
  const dynamicNavItems = [
    ...navItems,
    ...(canManageUsers ? [{
      name: "Админ",
      nameFull: "Администрирование",
      href: "/admin",
      icon: Shield,
      testId: "nav-admin"
    }] : [])
  ];

  return (
    <nav className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-around sm:justify-start sm:space-x-1 sm:px-6 lg:px-8">
          {dynamicNavItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <Link key={item.href} href={item.href}>
                <button
                  className={cn(
                    "relative py-2 px-3 sm:py-3 sm:px-4 font-medium transition-all duration-200",
                    "flex flex-col sm:flex-row items-center gap-1 sm:gap-2",
                    "rounded-t-lg sm:rounded-lg",
                    isActive
                      ? "bg-white dark:bg-gray-900 text-primary shadow-sm border-b-2 border-primary sm:border-b-0 sm:shadow-md"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50"
                  )}
                  data-testid={item.testId}
                >
                  <Icon className={cn(
                    "transition-all",
                    isActive 
                      ? "w-5 h-5 sm:w-4 sm:h-4" 
                      : "w-4 h-4"
                  )} />
                  <span className="text-[10px] sm:text-sm font-medium">
                    <span className="sm:hidden">{item.name}</span>
                    <span className="hidden sm:inline">{item.nameFull}</span>
                  </span>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary sm:hidden" />
                  )}
                </button>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
