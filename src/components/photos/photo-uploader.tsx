"use client";

import { ImagePlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, type ChangeEvent } from "react";

import { uploadPhoto } from "@/app/(dashboard)/photos/actions";
import { FormError } from "@/components/forms/form-alert";
import { Button } from "@/components/ui/button";
import type { ErrorKey } from "@/lib/errors";
import { resizeToJpeg } from "@/lib/photos/resize";

type Progress = { current: number; total: number };

// Picks photos, resizes them in the browser (resize.ts) and uploads them
// one by one. Each upload refreshes the page, so photos appear as they go.
export function PhotoUploader({
  propertyId,
  roomId,
  remaining,
}: {
  propertyId: string;
  // Null: photos of the common areas of the property.
  roomId: string | null;
  // How many more photos fit before the limit.
  remaining: number;
}) {
  const t = useTranslations("photos");
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [unreadable, setUnreadable] = useState<string | null>(null);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, remaining);
    // Allow choosing the same file again later.
    event.target.value = "";
    if (files.length === 0) return;
    setError(null);
    setUnreadable(null);

    for (const [index, file] of files.entries()) {
      setProgress({ current: index + 1, total: files.length });
      let resized;
      try {
        resized = await resizeToJpeg(file);
      } catch {
        // Formats the browser cannot decode (e.g. HEIC on some browsers).
        setUnreadable(file.name);
        continue;
      }
      const formData = new FormData();
      formData.set("propertyId", propertyId);
      formData.set("roomId", roomId ?? "");
      formData.set("width", String(resized.width));
      formData.set("height", String(resized.height));
      formData.set("file", resized.blob, "photo.jpg");
      const result = await uploadPhoto(formData);
      if (result.status === "error") {
        setError(result.error);
        break;
      }
    }
    setProgress(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={upload}
        data-testid="photo-input"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={progress !== null || remaining <= 0}
          aria-busy={progress !== null}
          onClick={() => input.current?.click()}
        >
          <ImagePlusIcon aria-hidden />
          {t("add")}
        </Button>
        {progress ? (
          <span role="status" className="text-sm text-muted-foreground">
            {t("uploading", progress)}
          </span>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">{t("help")}</p>
      {unreadable ? (
        <p role="alert" className="text-sm text-destructive">
          {t("unreadable", { file: unreadable })}
        </p>
      ) : null}
      <FormError error={error ?? undefined} />
    </div>
  );
}
