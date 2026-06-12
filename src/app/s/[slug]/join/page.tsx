import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { registerClient } from "@/actions/auth";
import SubmitButton from "@/components/SubmitButton";
import ThemeToggle from "@/components/ThemeToggle";
import { Flash, Logo } from "@/components/ui";
import type { Tenant } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { e?: string; next?: string };
}) {
  const sql = await db();
  const [tenant] = await sql<Tenant[]>`SELECT * FROM tenants WHERE slug = ${params.slug}`;
  if (!tenant) notFound();

  const loginHref = `/login?next=${encodeURIComponent(
    searchParams.next || `/s/${tenant.slug}`
  )}`;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Link href={`/s/${tenant.slug}`} className="mb-8 flex items-center gap-2.5">
        <Logo className="h-9 w-9" />
        <span className="text-xl font-bold tracking-tight">{tenant.name}</span>
      </Link>

      <div className="card w-full max-w-md p-7">
        <h1 className="text-lg font-bold">Create your client account</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Book in seconds and keep track of every visit.
        </p>

        <div className="mt-5">
          <Flash searchParams={searchParams} />
        </div>

        <form action={registerClient} className="space-y-4">
          <input type="hidden" name="slug" value={tenant.slug} />
          {searchParams.next && <input type="hidden" name="next" value={searchParams.next} />}
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input id="name" name="name" required className="input" placeholder="João Ferreira" />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required className="input" placeholder="you@email.com" />
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone (optional)</label>
            <input id="phone" name="phone" className="input" placeholder="+351 910 000 000" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password (min. 8 characters)</label>
            <input id="password" name="password" type="password" required minLength={8} className="input" placeholder="••••••••" />
          </div>
          <SubmitButton className="btn-primary w-full" pendingLabel="Creating account…">
            Create account
          </SubmitButton>
        </form>

        <p className="mt-5 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Already a client?{" "}
          <Link href={loginHref} className="font-medium text-amber-600 hover:underline dark:text-amber-400">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
