import Link from "next/link";
import { login } from "@/actions/auth";
import SubmitButton from "@/components/SubmitButton";
import ThemeToggle from "@/components/ThemeToggle";
import { Flash, Logo } from "@/components/ui";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { e?: string; next?: string };
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <Logo className="h-9 w-9" />
        <span className="text-xl font-bold tracking-tight">ClipperDesk</span>
      </Link>

      <div className="card w-full max-w-sm p-7">
        <h1 className="text-lg font-bold">Welcome back</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Sign in to your shop or client account.
        </p>

        <div className="mt-5">
          <Flash searchParams={searchParams} />
        </div>

        <form action={login} className="space-y-4">
          {searchParams.next && (
            <input type="hidden" name="next" value={searchParams.next} />
          )}
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required className="input" placeholder="you@shop.com" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required className="input" placeholder="••••••••" />
          </div>
          <SubmitButton className="btn-primary w-full" pendingLabel="Signing in…">
            Sign in
          </SubmitButton>
        </form>

        <p className="mt-5 text-center text-sm text-zinc-500 dark:text-zinc-400">
          New shop?{" "}
          <Link href="/register" className="font-medium text-amber-600 hover:underline dark:text-amber-400">
            Start your free trial
          </Link>
        </p>
      </div>

      <div className="mt-6 w-full max-w-sm rounded-lg border border-dashed border-zinc-300 p-4 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        <p className="font-semibold text-zinc-600 dark:text-zinc-300">Demo accounts (password: demo1234)</p>
        <p className="mt-1">owner@demo.dev · manager@demo.dev · marco@demo.dev (barber) · client@demo.dev</p>
      </div>
    </div>
  );
}
