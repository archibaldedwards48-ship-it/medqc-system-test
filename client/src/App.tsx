import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";

// Pages
import Dashboard from "./pages/Dashboard";
import Records from "./pages/Records";
import QcExecution from "./pages/QcExecution";
import Rules from "./pages/Rules";
import Statistics from "./pages/Statistics";
import DrugKnowledge from "./pages/DrugKnowledge";
import Terminology from "./pages/Terminology";
import SpotCheck from "./pages/SpotCheck";
import NlpAnalysis from "./pages/NlpAnalysis";
import Reports from "./pages/Reports";
import Config from "./pages/Config";
import AiAdvisor from "./pages/AiAdvisor";
import LabReferences from "./pages/LabReferences";
import Guidelines from "./pages/Guidelines";
import QcDetail from "./pages/QcDetail";
import FeedbackPanel from "./pages/FeedbackPanel";
import SoapTemplates from "./pages/SoapTemplates";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/records" component={Records} />
        <Route path="/qc" component={QcExecution} />
        <Route path="/qc-results/:id" component={QcDetail} />
        <Route path="/feedback" component={FeedbackPanel} />
        <Route path="/rules" component={Rules} />
        <Route path="/statistics" component={Statistics} />
        <Route path="/drugs" component={DrugKnowledge} />
        <Route path="/terminology" component={Terminology} />
        <Route path="/spot-check" component={SpotCheck} />
        <Route path="/nlp" component={NlpAnalysis} />
        <Route path="/reports" component={Reports} />
        <Route path="/config" component={Config} />
        <Route path="/ai-advisor" component={AiAdvisor} />
        <Route path="/lab-references" component={LabReferences} />
        <Route path="/guidelines" component={Guidelines} />
        <Route path="/soap-templates" component={SoapTemplates} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
