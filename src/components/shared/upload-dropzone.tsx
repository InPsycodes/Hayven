"use client";

import { useRef, useState } from "react";
import { IconUpload, IconFileCheck } from "@tabler/icons-react";

export function UploadDropzone({
  name,
  label = "Drag file here or click to upload",
  helperText = "PDF, JPG or PNG (max 2.5MB)",
  required,
}: {
  name?: string;
  label?: string;
  helperText?: string;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="flex w-full flex-col items-center gap-2 rounded-sm border border-dashed border-border bg-offwhite/50 px-6 py-8 text-center transition-colors hover:border-charcoal/40"
    >
      <input
        ref={inputRef}
        name={name}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        required={required}
        // Hidden native input still runs the browser's own required-field
        // validation on submit (surfaced via the wrapper button's click, not
        // this input directly) -- same as the Select components elsewhere
        // in this form.
        className="pointer-events-none absolute h-px w-px opacity-0"
        onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
      />
      {fileName ? (
        <>
          <IconFileCheck size={22} stroke={1.5} className="text-success-text" />
          <span className="text-sm font-medium text-charcoal">{fileName}</span>
        </>
      ) : (
        <>
          <IconUpload size={22} stroke={1.5} className="text-muted-foreground" />
          <span className="text-sm text-charcoal">{label}</span>
        </>
      )}
      <span className="text-xs text-muted-foreground">{helperText}</span>
    </button>
  );
}
