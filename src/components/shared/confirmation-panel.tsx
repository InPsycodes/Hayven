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
      <span className="pop-in flex size-14 items-center justify-center rounded-full bg-terracotta/10 text-terracotta">
        <IconCheck size={26} stroke={2} />
      </span>
      <h1 className="reveal font-heading text-2xl text-charcoal" style={{ animationDelay: "80ms" }}>
        {heading}
      </h1>
      <p className="reveal max-w-sm text-sm text-muted-foreground" style={{ animationDelay: "160ms" }}>
        {subtext}
      </p>
      {children && (
        <div className="reveal w-full" style={{ animationDelay: "160ms" }}>
          {children}
        </div>
      )}
      {actions && (
        <div className="reveal mt-2 flex w-full gap-3" style={{ animationDelay: "220ms" }}>
          {actions}
        </div>
      )}
    </div>
  );
}
