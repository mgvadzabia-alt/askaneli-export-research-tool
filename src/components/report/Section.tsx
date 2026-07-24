export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Narrative({ text }: { text: string }) {
  return <p className="text-sm leading-6 text-neutral-700">{text}</p>;
}

export function FieldGrid({ fields }: { fields: Array<{ label: string; value: string }> }) {
  return (
    <dl className="mt-4 grid gap-4 sm:grid-cols-2">
      {fields.map((f) => (
        <div key={f.label}>
          <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            {f.label}
          </dt>
          <dd className="mt-1 text-sm leading-6 text-neutral-800">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}
