import React from "react";
import { Route, Switch, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider, useAuth } from "./lib/auth-context";
import { LandingPage } from "./pages/public/LandingPage";
import { PricingPage } from "./pages/public/PricingPage";
import { FaqPage } from "./pages/public/FaqPage";
import { ContactPage } from "./pages/public/ContactPage";

import { SignInPage } from "./pages/auth/SignInPage";
import { SignUpPage } from "./pages/auth/SignUpPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";

import { ParticipantDashboard } from "./pages/participant/DashboardPage";
import { TryoutListPage } from "./pages/participant/TryoutListPage";
import { TryoutDetailPage } from "./pages/participant/TryoutDetailPage";
import { SessionPage } from "./pages/participant/SessionPage";
import { ResultPage } from "./pages/participant/ResultPage";
import { PracticePage } from "./pages/participant/PracticePage";
import { HasilPage } from "./pages/participant/HasilPage";
import { ReviewPage } from "./pages/participant/ReviewPage";
import { ReviewBundleDetailPage } from "./pages/participant/ReviewBundleDetailPage";
import { TryoutReviewPage } from "./pages/participant/TryoutReviewPage";
import { RankingPage } from "./pages/participant/RankingPage";
import { SubscriptionPage } from "./pages/participant/SubscriptionPage";
import { ProfilePage } from "./pages/participant/ProfilePage";

import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AdminQuestionsPage } from "./pages/admin/AdminQuestionsPage";
import { AdminBundleDetailPage } from "./pages/admin/AdminBundleDetailPage";
import { AdminCategoriesPage } from "./pages/admin/AdminCategoriesPage";
import { AdminTryoutsPage } from "./pages/admin/AdminTryoutsPage";
import { AdminTryoutDetailPage } from "./pages/admin/AdminTryoutDetailPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminSubscriptionsPage } from "./pages/admin/AdminSubscriptionsPage";
import { AdminPaymentsPage } from "./pages/admin/AdminPaymentsPage";
import { AdminCouponsPage } from "./pages/admin/AdminCouponsPage";
import { AdminReportsPage } from "./pages/admin/AdminReportsPage";
import { AdminCmsPage } from "./pages/admin/AdminCmsPage";
import { AdminSettingsPage } from "./pages/admin/AdminSettingsPage";

const queryClient = new QueryClient();

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

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

// Redirect admin users away from participant dashboard
function DashboardGuard() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Redirect to="/sign-in" />;
  if (user.role === "admin") return <Redirect to="/admin/dashboard" />;
  return <ParticipantDashboard />;
}

// Protect admin routes
function AdminGuard({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Redirect to="/sign-in" />;
  if (user.role !== "admin") return <Redirect to="/dashboard" />;
  return <Component />;
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
      <Route path="/sign-in" component={SignInPage} />
      <Route path="/sign-up" component={SignUpPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />

      {/* Legacy redirects */}
      <Route path="/login">{() => <Redirect to="/sign-in" />}</Route>
      <Route path="/register">{() => <Redirect to="/sign-up" />}</Route>

      {/* Participant Routes */}
      <Route path="/dashboard" component={DashboardGuard} />
      <Route path="/tryout" component={TryoutListPage} />
      <Route path="/tryout/:id" component={TryoutDetailPage} />
      <Route path="/tryout/:id/start" component={SessionPage} />
      <Route path="/tryout/:id/result" component={ResultPage} />
      <Route path="/latihan" component={PracticePage} />
      <Route path="/hasil" component={HasilPage} />
      <Route path="/review" component={ReviewPage} />
      <Route path="/review/:bundleId" component={ReviewBundleDetailPage} />
      <Route path="/tryout/:sessionId/review" component={TryoutReviewPage} />
      <Route path="/ranking" component={RankingPage} />
      <Route path="/subscription" component={SubscriptionPage} />
      <Route path="/profile" component={ProfilePage} />

      {/* Admin Routes */}
      <Route path="/admin/dashboard">{() => <AdminGuard component={AdminDashboardPage} />}</Route>
      <Route path="/admin/questions">{() => <AdminGuard component={AdminQuestionsPage} />}</Route>
      <Route path="/admin/questions/:bundleId">{() => <AdminGuard component={AdminBundleDetailPage} />}</Route>
      <Route path="/admin/categories">{() => <AdminGuard component={AdminCategoriesPage} />}</Route>
      <Route path="/admin/tryouts">{() => <AdminGuard component={AdminTryoutsPage} />}</Route>
      <Route path="/admin/tryouts/:tryoutId">{() => <AdminGuard component={AdminTryoutDetailPage} />}</Route>
      <Route path="/admin/users">{() => <AdminGuard component={AdminUsersPage} />}</Route>
      <Route path="/admin/subscriptions">{() => <AdminGuard component={AdminSubscriptionsPage} />}</Route>
      <Route path="/admin/payments">{() => <AdminGuard component={AdminPaymentsPage} />}</Route>
      <Route path="/admin/coupons">{() => <AdminGuard component={AdminCouponsPage} />}</Route>
      <Route path="/admin/reports">{() => <AdminGuard component={AdminReportsPage} />}</Route>
      <Route path="/admin/cms">{() => <AdminGuard component={AdminCmsPage} />}</Route>
      <Route path="/admin/settings">{() => <AdminGuard component={AdminSettingsPage} />}</Route>

      {/* Catch all */}
      <Route component={() => <PlaceholderPage title="404 Not Found" />} />
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router />
        </AuthProvider>
      </QueryClientProvider>
    </WouterRouter>
  );
}

export default App;
