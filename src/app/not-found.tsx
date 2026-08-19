import Link from "next/link";
import { getSiteContent } from "@/lib/content";
import { getLocale } from "@/lib/i18n/server";

/**
 * Matches the live site's 404: a bare centred panel with no nav or footer.
 * Its copy is hardcoded English there, in every language.
 */
export default async function NotFound() {
  const { notFound } = getSiteContent(await getLocale());

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">{notFound.title}</h1>
        <p className="mb-4 text-xl text-muted-foreground">{notFound.message}</p>
        <Link
          href="/"
          className="text-primary underline hover:text-primary/90"
        >
          {notFound.cta}
        </Link>
      </div>
    </div>
  );
}
