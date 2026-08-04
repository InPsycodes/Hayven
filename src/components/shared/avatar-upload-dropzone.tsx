"use client";

import { useRef, useState } from "react";
import { IconCamera } from "@tabler/icons-react";

export function AvatarUploadDropzone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-dashed border-border bg-offwhite/50 transition-colors hover:border-charcoal/40"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) setPreview(URL.createObjectURL(file));
        }}
      />
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Profile preview" className="size-full object-cover" />
      ) : (
        <IconCamera size={22} stroke={1.5} className="text-muted-foreground" />
      )}
    </button>
  );
}
