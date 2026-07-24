import { GenerateForm } from "@/components/GenerateForm";
import { HistoryList } from "@/components/HistoryList";
import { listReports } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const entries = await listReports();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          Askaneli Export Market Research Tool
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Type a country and one of our products, generate a full sourced research report, and
          revisit past reports below.
        </p>
      </header>

      <GenerateForm />

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-neutral-900">Report history</h2>
        <HistoryList entries={entries} />
      </section>
    </main>
  );
}
