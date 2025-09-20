import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Mail, Lock, Eye, EyeOff, Sun, Moon, Monitor, Settings } from "lucide-react";
import { enableOutpagedBrand } from "@/lib/featureFlags";
import { useTheme } from "next-themes";
import { OutpagedLogomark } from "@/components/outpaged/OutpagedLogomark";

export default function Login() {
  if (enableOutpagedBrand) {
    return <OutpagedLogin />;
  }

  return <LegacyLogin />;
}

function LegacyLogin() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">ProjectFlow</h1>
          </div>
          <p className="text-muted-foreground">Welcome back to your project workspace</p>
        </div>

        {/* Login Form */}
        <Card className="bg-card/50 backdrop-blur-sm border-border shadow-large">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-foreground">Sign In</CardTitle>
            <CardDescription>Enter your credentials to access your dashboard</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="Enter your email" className="pl-10" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="pl-10 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                </Button>
              </div>
            </div>

            <Button className="w-full bg-gradient-primary hover:opacity-90 text-white">Sign In</Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button variant="outline" className="w-full">
              Continue with Google
            </Button>

            <div className="text-center space-y-2">
              <Button variant="link" className="text-primary p-0">
                Forgot your password?
              </Button>
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Button variant="link" className="text-primary p-0">
                  Sign up
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Demo Notice */}
        <Card className="mt-6 bg-warning/10 border-warning/20">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-warning-foreground">
              <strong>Demo Mode:</strong> Connect to Supabase to enable real authentication, user management, and secure login functionality.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function OutpagedLogin() {
  const { setTheme } = useTheme();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[hsl(var(--background))] px-4 py-12">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--accent)/0.2),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,hsl(var(--chip-accent)/0.5),transparent_60%)]" />
      </div>

      <Card className="relative z-10 w-full max-w-lg rounded-3xl border-none bg-[hsl(var(--card))]/90 p-10 shadow-large backdrop-blur">
        <div className="absolute right-6 top-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full border border-[hsl(var(--chip-neutral))] text-[hsl(var(--muted-foreground))]"
              >
                <Settings className="h-4 w-4" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-col items-center gap-6 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-3xl bg-[hsl(var(--chip-neutral))]/50 shadow-soft">
            <OutpagedLogomark className="h-12 w-12" aria-hidden />
          </span>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-[hsl(var(--foreground))]">
              Sign in to OutPaged
            </h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Use your outpaged.com Google account
            </p>
          </div>

          <Button className="w-full rounded-full bg-[hsl(var(--primary))] py-5 text-base font-semibold text-white shadow-soft hover:bg-[hsl(var(--primary-hover))]">
            <GoogleIcon className="mr-2 h-5 w-5" />
            Continue with Google
          </Button>

          <div className="w-full rounded-2xl border border-[hsl(var(--chip-neutral))] bg-[hsl(var(--chip-neutral))]/40 px-4 py-3 text-sm text-left font-medium text-[hsl(var(--muted-foreground))]">
            Only <span className="text-[hsl(var(--accent))]">@outpaged.com</span> accounts are allowed.
          </div>

          <div className="flex w-full justify-between text-xs font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
            <a href="#" className="transition hover:text-[hsl(var(--accent))]">
              Privacy
            </a>
            <a href="#" className="transition hover:text-[hsl(var(--accent))]">
              Status
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        fill="#4285f4"
        d="M21.8 12.23c0-.79-.07-1.54-.19-2.27H12v4.3h5.52c-.24 1.22-.98 2.25-2.1 2.94v2.44h3.38c1.98-1.82 3.1-4.5 3.1-7.41Z"
      />
      <path
        fill="#34a853"
        d="M12 22c2.8 0 5.15-.92 6.86-2.36l-3.38-2.44c-.94.63-2.16 1-3.48 1-2.67 0-4.94-1.8-5.75-4.23H2.73v2.52C4.43 19.98 7.95 22 12 22Z"
      />
      <path
        fill="#fbbc05"
        d="M6.25 13.97c-.21-.63-.33-1.3-.33-1.97s.12-1.35.33-1.97V7.51H2.73C1.99 8.9 1.6 10.41 1.6 12s.39 3.1 1.13 4.49l3.52-2.52Z"
      />
      <path
        fill="#ea4335"
        d="M12 5.77c1.52 0 2.88.52 3.95 1.55l2.96-2.96C17.15 2.59 14.8 1.6 12 1.6 7.95 1.6 4.43 3.62 2.73 7.51l3.52 2.52c.81-2.43 3.08-4.26 5.75-4.26Z"
      />
    </svg>
  );
}
