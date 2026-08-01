import { createFileRoute, Link } from "@tanstack/react-router";
import { useMalume } from "@/lib/malume/store";
import { ReviewView } from "@/components/malume/ReviewView";

const TITLE = "Review Queue — Malume Money";
const DESCRIPTION =
  "The human-in-the-loop step: see the extracted data, the warnings, Malume's recommendation and the evidence, then approve or reject the ledger.";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReviewPage,
});

function ReviewPage() {
  const { transactions } = useMalume();

  return (
    <div className="w-full max-w-4xl py-6 md:py-8">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Review Queue
        </p>
        <h1 className="mt-3 text-3xl leading-tight font-semibold md:text-4xl">
          Nothing's final until you say so.
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          Check the data, the warnings and the recommendations, then sign off. Your decision is
          recorded with the batch.
        </p>
      </header>

      <section className="mt-8">
        {transactions.length ? (
          <ReviewView />
        ) : (
          <p className="text-sm text-muted-foreground">
            Nothing waiting for review.{" "}
            <Link to="/expenses" className="text-primary underline underline-offset-4">
              Process a batch first
            </Link>
            .
          </p>
        )}
      </section>
    </div>
  );
}
