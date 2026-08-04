import { IconCheck } from "@tabler/icons-react";

export function ConfirmationPanel({
  heading,
  subtext,
  children,
  actions,
}: {
  heading: string;
  subtext: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 p-8 text-center md:p-10">
      <span className="flex size-14 items-center justify-center rounded-full bg-terracotta/10 text-terracotta">
        <IconCheck size={26} stroke={2} />
      </span>
      <h1 className="font-heading text-2xl text-charcoal">{heading}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{subtext}</p>
      {children}
      {actions && <div className="mt-2 flex w-full gap-3">{actions}</div>}
    </div>
  );
}
