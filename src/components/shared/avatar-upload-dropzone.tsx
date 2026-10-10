"use client";

import { useRef, useState } from "react";
import { IconCamera } from "@tabler/icons-react";

/** `onFileChosen` lets the surrounding form react, e.g. reveal its save button only once there is a photo to save. */
export function AvatarUploadDropzone({ onFileChosen }: { onFileChosen?: () => void } = {}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <button
      type="button"
      aria-label={preview ? "Change photo" : "Choose a photo"}
      onClick={() => inputRef.current?.click()}
      className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-dashed border-border bg-offwhite/50 transition-colors hover:border-charcoal/40"
    >
      <input
        ref={inputRef}
        type="file"
        name="photo"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            setPreview(URL.createObjectURL(file));
            onFileChosen?.();
          }
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
