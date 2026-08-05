"use client";

import { useRef, useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { updateMemberPhoto } from "@/app/(dashboard)/admin/actions";

const PHOTO_SIZE = 256; // px, square — resized/cropped client-side before upload
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function MemberOptionsButton({
  userId,
  userName,
  color,
  photoUrl,
}: {
  userId: string;
  userName: string;
  color: string;
  photoUrl: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(photoUrl);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Please choose a JPEG, PNG, or WebP photo.");
      e.target.value = "";
      return;
    }
    setError(undefined);

    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = PHOTO_SIZE;
        canvas.height = PHOTO_SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        // Cover-crop to a square from the image's center.
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
        setPreview(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  function handleSave() {
    if (!preview || preview === photoUrl) {
      setOpen(false);
      return;
    }
    const formData = new FormData();
    formData.set("userId", userId);
    formData.set("photoDataUrl", preview);
    startTransition(async () => {
      const result = await updateMemberPhoto(undefined, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setOpen(false);
      }
    });
  }

  function handleRemove() {
    const formData = new FormData();
    formData.set("userId", userId);
    formData.set("removePhoto", "1");
    startTransition(async () => {
      const result = await updateMemberPhoto(undefined, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setPreview(null);
        setOpen(false);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 rounded-lg text-left hover:opacity-80"
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- base64 data URL, not something next/image can optimize
          <img
            src={photoUrl}
            alt={userName}
            className="h-9 w-9 flex-shrink-0 rounded-full border-2 object-cover"
            style={{ borderColor: color }}
          />
        ) : (
          <span
            className="h-3 w-3 flex-shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
        )}
      </button>

      {open && (
        <Modal title={`Options – ${userName}`} onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Photo
              </span>
              <div className="flex items-center gap-4">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- base64 data URL, not something next/image can optimize
                  <img
                    src={preview}
                    alt={userName}
                    className="h-20 w-20 flex-shrink-0 rounded-full border-2 object-cover"
                    style={{ borderColor: color }}
                  />
                ) : (
                  <span
                    className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full text-2xl font-semibold text-white"
                    style={{ backgroundColor: color }}
                  >
                    {userName.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="flex flex-col items-start gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  >
                    {preview ? "Choose a different photo" : "Upload a photo"}
                  </button>
                  {preview && (
                    <button
                      type="button"
                      onClick={handleRemove}
                      disabled={pending}
                      className="text-sm font-medium text-red-600 hover:underline disabled:opacity-60"
                    >
                      Remove photo
                    </button>
                  )}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Shows on the TV and display views instead of {userName.split(" ")[0]}
                &apos;s name.
              </p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="button"
              onClick={handleSave}
              disabled={pending || !preview || preview === photoUrl}
              className="rounded-lg bg-indigo-600 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
            >
              {pending ? "Saving..." : "Save"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
