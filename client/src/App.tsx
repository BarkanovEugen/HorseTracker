import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/theme-context";
import { WebSocketProvider } from "@/contexts/websocket-context";
import { useRealtimeUpdates } from "@/hooks/use-websocket";
import Header from "@/components/layout/header";
import Navigation from "@/components/layout/navigation";
import BottomNavigation from "@/components/layout/bottom-navigation";
import Dashboard from "@/pages/dashboard";
import Horses from "@/pages/horses";
import History from "@/pages/history";
import Settings from "@/pages/settings";
import Login from "@/pages/login";
import Admin from "@/pages/admin";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

function AppContent() {
  useRealtimeUpdates();

  // Request notification permissions when app loads
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        console.log('Notification permission:', permission);
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 pb-16 sm:pb-0">
      <Header />
      {/* Desktop Navigation - Hidden on mobile */}
      <div className="hidden sm:block">
        <Navigation />
      </div>
      
      <main className="w-full">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/horses" component={Horses} />
          <Route path="/history" component={History} />
          <Route path="/settings" component={Settings} />
          <Route path="/admin" component={Admin} />
          <Route path="/login" component={Login} />
          <Route component={NotFound} />
        </Switch>
      </main>
      
      {/* Mobile Navigation - Only shown on mobile */}
      <div className="sm:hidden">
        <BottomNavigation />
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <WebSocketProvider>
          <TooltipProvider>
            <Toaster />
            <AppContent />
          </TooltipProvider>
        </WebSocketProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
