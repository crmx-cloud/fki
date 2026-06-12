import { Link } from "react-router-dom";
import { SignIn } from "@/components/SignIn";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";

export function LoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4 relative motion-page">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 size-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 size-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-sm space-y-6">
        <Reveal className="text-center space-y-2">
          <div className="mx-auto mb-4">
            <img src="/logo-dark-bg.png" alt="Franchise KI" className="h-12 mx-auto" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground text-sm">
            Sign in to your account to continue
          </p>
        </Reveal>

        <Reveal delay={200}>
          <SignIn />
        </Reveal>

        <Reveal as="p" delay={280} className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Button variant="link" className="p-0 h-auto font-medium" asChild>
            <Link to="/signup">Sign up</Link>
          </Button>
        </Reveal>
      </div>
    </div>
  );
}
