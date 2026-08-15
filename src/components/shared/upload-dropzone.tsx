"use client";

import { useRef, useState } from "react";
import { IconUpload, IconFileCheck } from "@tabler/icons-react";

export function UploadDropzone({
  name,
  label = "Drag file here or click to upload",
  helperText = "PDF, JPG or PNG (max 2.5MB)",
}: {
  name?: string;
  label?: string;
  helperText?: string;
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
        className="hidden"
        onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
      />
      {fileName ? (
        <>
          <IconFileCheck size={22} stroke={1.5} className="text-success" />
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
