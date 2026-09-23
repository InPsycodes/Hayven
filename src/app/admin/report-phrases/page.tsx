import { getReportPhraseVariants } from "@/lib/admin/queries";
import { addReportPhraseVariant, deleteReportPhraseVariant } from "@/lib/admin/actions";
import { PhraseVariantForm } from "@/components/admin/phrase-variant-form";
import { PhraseVariantRow } from "@/components/admin/phrase-variant-row";
import { PHRASE_DOMAINS } from "@/lib/reports/phrase-domains";

export default async function AdminReportPhrasesPage() {
  const variants = await getReportPhraseVariants();

  return (
    <div className="min-h-dvh overflow-y-auto bg-offwhite">
      <div className="p-6 md:p-8">
        <h1 className="font-heading text-xl text-charcoal">Report phrases</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add extra phrasings for parent-facing report sections. These are added alongside the built-in phrasings,
          never replacing them, and apply immediately to newly generated reports.
        </p>
      </div>

      <div className="flex flex-col gap-6 px-6 pb-8 md:px-8">
        <section className="rounded-sm bg-white p-5 shadow-[0_1px_2px_rgba(26,26,26,.04),0_6px_16px_-10px_rgba(26,26,26,.15)] md:p-6">
          <h2 className="label-micro text-rust-dark">Add a phrase</h2>
          <div className="mt-5">
            <PhraseVariantForm onSubmit={addReportPhraseVariant} />
          </div>
        </section>

        <section className="rounded-sm bg-white p-5 shadow-[0_1px_2px_rgba(26,26,26,.04),0_6px_16px_-10px_rgba(26,26,26,.15)] md:p-6">
          <h2 className="label-micro text-rust-dark">Existing phrases</h2>
          <div className="mt-5 flex flex-col gap-2">
            {variants.length === 0 ? (
              <p className="rounded-sm bg-inset p-4 text-sm text-muted-foreground">No added phrases yet.</p>
            ) : (
              variants.map((v) => {
                const domain = PHRASE_DOMAINS.find((d) => d.key === v.domainKey);
                const bandLabel = domain?.bands?.find((b) => b.key === v.band)?.label ?? null;
                return (
                  <PhraseVariantRow
                    key={v.id}
                    variant={v}
                    domainLabel={domain?.label ?? v.domainKey}
                    bandLabel={bandLabel}
                    onDelete={deleteReportPhraseVariant}
                  />
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
