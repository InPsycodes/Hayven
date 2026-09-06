import Link from "next/link";
import Image from "next/image";
import { IconClock, IconCircleCheck } from "@tabler/icons-react";

import { Icon } from "@/components/ui/icon";
import { LEARN_TOPIC_META } from "@/content/marketing/learn-topics";

export interface GuideCardData {
  href: string;
  title: string;
  categoryName: string | null;
  imageUrl: string | null;
  /** Free-text or estimated, e.g. "6 min read". */
  metaLabel: string;
  reviewed: boolean;
}

/**
 * The single guide/course card used across the Learning Center -- parent
 * grid, related lists, therapist course grid. `compact` drops the meta row
 * and shortens the image for dense contexts (related-reading strips).
 */
export function GuideCard({ guide, compact = false }: { guide: GuideCardData; compact?: boolean }) {
  const meta = guide.categoryName ? LEARN_TOPIC_META[guide.categoryName] : undefined;

  return (
    <Link
      href={guide.href}
      className="group flex flex-col overflow-hidden rounded-2xl bg-canvas-white ring-1 ring-charcoal/10 shadow-[0_1px_2px_rgba(26,26,26,.04),0_6px_16px_-10px_rgba(26,26,26,.15)] transition-all hover:-translate-y-0.5 hover:ring-charcoal/20"
    >
      <div className={`relative shrink-0 overflow-hidden ${compact ? "aspect-[16/9]" : "aspect-3/2"}`}>
        {guide.imageUrl ? (
          <Image
            src={guide.imageUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
            className="photo-treatment size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className={`flex size-full items-center justify-center ${meta?.tileClass ?? "bg-paper text-ink-soft"}`}
          >
            {meta && <Icon icon={meta.icon} size="lg" />}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {meta && guide.categoryName && (
          <span
            className={`w-fit rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] ${meta.chipClass}`}
          >
            {guide.categoryName}
          </span>
        )}
        <h3
          className={`font-serif leading-snug text-charcoal transition-colors group-hover:text-rust-dark ${
            compact ? "text-sm" : "text-base sm:text-lg"
          }`}
        >
          {guide.title}
        </h3>
        {!compact && (
          <span className="mt-auto flex items-center gap-3 text-xs text-ink-soft">
            <span className="flex items-center gap-1.5">
              <IconClock size={13} stroke={1.75} />
              {guide.metaLabel}
            </span>
            {guide.reviewed && (
              <span className="flex items-center gap-1.5">
                <IconCircleCheck size={13} stroke={1.75} className="text-success-text" />
                Therapist-reviewed
              </span>
            )}
          </span>
        )}
      </div>
    </Link>
  );
}
