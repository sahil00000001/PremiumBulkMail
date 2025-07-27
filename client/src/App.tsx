import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Landing from "@/pages/Landing";
import { EmailProvider } from "@/hooks/use-email";
import { Footer } from "@/components/Footer";

function Router() {
  const [location] = useLocation();
  
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/app" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <EmailProvider>
          <div className="min-h-screen flex flex-col">
            <Toaster />
            <main className="flex-grow">
              <Router />
            </main>
            <Footer />
          </div>
        </EmailProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
