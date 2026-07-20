import React from "react";
import { Route, Switch, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider } from "./lib/auth-context";
import { LandingPage } from "./pages/public/LandingPage";
import { PricingPage } from "./pages/public/PricingPage";
import { FaqPage } from "./pages/public/FaqPage";
import { ContactPage } from "./pages/public/ContactPage";

import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";

import { ParticipantDashboard } from "./pages/participant/DashboardPage";
import { TryoutListPage } from "./pages/participant/TryoutListPage";
import { TryoutDetailPage } from "./pages/participant/TryoutDetailPage";
import { SessionPage } from "./pages/participant/SessionPage";
import { ResultPage } from "./pages/participant/ResultPage";
import { PracticePage } from "./pages/participant/PracticePage";
import { HasilPage } from "./pages/participant/HasilPage";
import { ReviewPage } from "./pages/participant/ReviewPage";
import { RankingPage } from "./pages/participant/RankingPage";
import { SubscriptionPage } from "./pages/participant/SubscriptionPage";
import { ProfilePage } from "./pages/participant/ProfilePage";

import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AdminQuestionsPage } from "./pages/admin/AdminQuestionsPage";
import { AdminCategoriesPage } from "./pages/admin/AdminCategoriesPage";
import { AdminTryoutsPage } from "./pages/admin/AdminTryoutsPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminSubscriptionsPage } from "./pages/admin/AdminSubscriptionsPage";
import { AdminPaymentsPage } from "./pages/admin/AdminPaymentsPage";
import { AdminCouponsPage } from "./pages/admin/AdminCouponsPage";
import { AdminReportsPage } from "./pages/admin/AdminReportsPage";
import { AdminCmsPage } from "./pages/admin/AdminCmsPage";

const queryClient = new QueryClient();

// Placeholder for missing pages to avoid errors
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">{title}</h1>
        <p>Work in progress.</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={LandingPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/faq" component={FaqPage} />
      <Route path="/contact" component={ContactPage} />
      
      {/* Auth Routes */}
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      
      {/* Participant Routes */}
      <Route path="/dashboard" component={ParticipantDashboard} />
      <Route path="/tryout" component={TryoutListPage} />
      <Route path="/tryout/:id" component={TryoutDetailPage} />
      <Route path="/tryout/:id/start" component={SessionPage} />
      <Route path="/tryout/:id/result" component={ResultPage} />
      <Route path="/latihan" component={PracticePage} />
      <Route path="/hasil" component={HasilPage} />
      <Route path="/review" component={ReviewPage} />
      <Route path="/ranking" component={RankingPage} />
      <Route path="/subscription" component={SubscriptionPage} />
      <Route path="/profile" component={ProfilePage} />

      {/* Admin Routes */}
      <Route path="/admin/dashboard" component={AdminDashboardPage} />
      <Route path="/admin/questions" component={AdminQuestionsPage} />
      <Route path="/admin/categories" component={AdminCategoriesPage} />
      <Route path="/admin/tryouts" component={AdminTryoutsPage} />
      <Route path="/admin/users" component={AdminUsersPage} />
      <Route path="/admin/subscriptions" component={AdminSubscriptionsPage} />
      <Route path="/admin/payments" component={AdminPaymentsPage} />
      <Route path="/admin/coupons" component={AdminCouponsPage} />
      <Route path="/admin/reports" component={AdminReportsPage} />
      <Route path="/admin/cms" component={AdminCmsPage} />

      {/* Catch all */}
      <Route component={() => <PlaceholderPage title="404 Not Found" />} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AuthProvider>
          <Router />
        </AuthProvider>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
