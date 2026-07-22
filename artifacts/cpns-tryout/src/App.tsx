import React, { useEffect, useRef } from "react";
import { Route, Switch, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, AuthenticateWithRedirectCallback, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";

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

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// REQUIRED — resolves the publishable key from the incoming hostname
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// REQUIRED — empty in dev (intentional), auto-set in prod
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

// Clerk passes full paths; strip base prefix before passing to wouter
function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsPlacement: "top" as const,
    socialButtonsVariant: "blockButton" as const,
  },
  variables: {
    colorPrimary: "#1e3a5f",
    colorForeground: "#0f172a",
    colorMutedForeground: "#64748b",
    colorDanger: "#dc2626",
    colorBackground: "#f8fafc",
    colorInput: "#ffffff",
    colorInputForeground: "#0f172a",
    colorNeutral: "#cbd5e1",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl border border-slate-100",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-slate-900 font-extrabold",
    headerSubtitle: "text-slate-500",
    socialButtonsBlockButtonText: "text-slate-700 font-medium",
    formFieldLabel: "text-slate-700 font-medium",
    footerActionLink: "text-primary font-medium hover:text-primary/80",
    footerActionText: "text-slate-500",
    dividerText: "text-slate-400",
    identityPreviewEditButton: "text-primary",
    formFieldSuccessText: "text-green-600",
    alertText: "text-slate-700",
    logoBox: "mx-auto",
    logoImage: "h-10 w-10",
    socialButtonsBlockButton: "border border-slate-200 hover:bg-slate-50 transition-colors",
    formButtonPrimary: "bg-primary hover:bg-primary/90 text-white font-semibold",
    formFieldInput: "border-slate-300 focus:border-primary focus:ring-primary text-slate-900",
    footerAction: "bg-slate-50",
    dividerLine: "bg-slate-200",
    alert: "border border-red-200 bg-red-50",
    otpCodeFieldInput: "border-slate-300",
    formFieldRow: "",
    main: "",
  },
};

function SSOCallback() {
  return (
    <AuthenticateWithRedirectCallback
      signInForceRedirectUrl={`${basePath}/dashboard`}
      signUpForceRedirectUrl={`${basePath}/dashboard`}
    />
  );
}

// Invalidate React Query cache when the signed-in user changes
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

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
  if (user?.role === "admin") return <Redirect to="/admin/dashboard" />;
  return <ParticipantDashboard />;
}

// Redirect participant users away from admin area
function AdminGuard({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user && user.role !== "admin") return <Redirect to="/dashboard" />;
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
      <Route path="/sign-in/sso-callback" component={SSOCallback} />
      <Route path="/sign-up/sso-callback" component={SSOCallback} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />

      {/* Legacy redirects */}
      <Route path="/login">{() => <Redirect to="/sign-in" />}</Route>
      <Route path="/register">{() => <Redirect to="/sign-up" />}</Route>

      {/* Participant Routes — admin gets redirected to admin dashboard */}
      <Route path="/dashboard" component={DashboardGuard} />
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

      {/* Admin Routes — non-admin gets redirected to participant dashboard */}
      <Route path="/admin/dashboard">{() => <AdminGuard component={AdminDashboardPage} />}</Route>
      <Route path="/admin/questions">{() => <AdminGuard component={AdminQuestionsPage} />}</Route>
      <Route path="/admin/categories">{() => <AdminGuard component={AdminCategoriesPage} />}</Route>
      <Route path="/admin/tryouts">{() => <AdminGuard component={AdminTryoutsPage} />}</Route>
      <Route path="/admin/users">{() => <AdminGuard component={AdminUsersPage} />}</Route>
      <Route path="/admin/subscriptions">{() => <AdminGuard component={AdminSubscriptionsPage} />}</Route>
      <Route path="/admin/payments">{() => <AdminGuard component={AdminPaymentsPage} />}</Route>
      <Route path="/admin/coupons">{() => <AdminGuard component={AdminCouponsPage} />}</Route>
      <Route path="/admin/reports">{() => <AdminGuard component={AdminReportsPage} />}</Route>
      <Route path="/admin/cms">{() => <AdminGuard component={AdminCmsPage} />}</Route>

      {/* Catch all */}
      <Route component={() => <PlaceholderPage title="404 Not Found" />} />
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey!}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      afterSignInUrl={`${basePath}/dashboard`}
      afterSignUpUrl={`${basePath}/dashboard`}
      localization={{
        signIn: {
          start: {
            title: "Masuk ke SiapCPNS",
            subtitle: "Selamat datang! Silakan masuk untuk melanjutkan",
            actionText: "Belum punya akun?",
            actionLink: "Daftar sekarang",
          },
        },
        signUp: {
          start: {
            title: "Daftar SiapCPNS",
            subtitle: "Mulai persiapan CPNS kamu sekarang",
            actionText: "Sudah punya akun?",
            actionLink: "Masuk",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <AuthProvider>
          <Router />
        </AuthProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
