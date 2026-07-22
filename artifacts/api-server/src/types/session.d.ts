declare module "express-session" {
  interface SessionData {
    userId?: string;
    oauthFlow?: "signin" | "signup";
  }
}
