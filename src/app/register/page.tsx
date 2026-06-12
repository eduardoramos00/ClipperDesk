import Link from "next/link";
import { registerShop } from "@/actions/auth";
import SubmitButton from "@/components/SubmitButton";
import ThemeToggle from "@/components/ThemeToggle";
import { Flash, Logo } from "@/components/ui";

export default function RegisterPage({
  searchParams,
}: {
  searchParams: { e?: string };
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <Logo className="h-9 w-9" />
        <span className="text-xl font-bold tracking-tight">ClipperDesk</span>
      </Link>

      <div className="card w-full max-w-md p-7">
        <h1 className="text-lg font-bold">Open your shop on ClipperDesk</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          14-day free trial on the Starter plan. No credit card required.
        </p>

        <div className="mt-5">
          <Flash searchParams={searchParams} />
        </div>

        <form action={registerShop} className="space-y-4">
          <div>
            <label className="label" htmlFor="shop_name">Shop name</label>
            <input id="shop_name" name="shop_name" required className="input" placeholder="Fade District" />
          </div>
          <div>
            <label className="label" htmlFor="owner_name">Your name</label>
            <input id="owner_name" name="owner_name" required className="input" placeholder="Alex Barber" />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required className="input" placeholder="you@shop.com" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password (min. 8 characters)</label>
            <input id="password" name="password" type="password" required minLength={8} className="input" placeholder="••••••••" />
          </div>
          <SubmitButton className="btn-primary w-full" pendingLabel="Creating your shop…">
            Create my shop
          </SubmitButton>
        </form>

        <p className="mt-5 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-amber-600 hover:underline dark:text-amber-400">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
