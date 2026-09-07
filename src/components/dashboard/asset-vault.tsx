"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Film,
  Trash2,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  createAsset,
  deleteAsset,
  listAssets,
  type AssetItem,
} from "@/lib/data";

export function AssetVault() {
  const [assets, setAssets] = React.useState<AssetItem[]>([]);
  const [dragOver, setDragOver] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    void listAssets().then(setAssets).catch(() => {});
  }, []);

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    setBusy(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        await createAsset(file);
      }
      setAssets(await listAssets());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const remove = (id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
    void deleteAsset(id).catch(() => {});
  };

  const icons: Record<AssetItem["kind"], React.ReactNode> = {
    image: <ImageIcon className="h-4 w-4" />,
    video: <Film className="h-4 w-4" />,
    doc: <FileText className="h-4 w-4" />,
  };

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h4 className="font-display text-base font-bold text-white">Asset Vault</h4>
          <p className="text-xs text-fog">
            Upload logos, images, and raw video clips for your fulfillment team.
          </p>
        </div>
        <span className="rounded-lg border border-white/10 px-3 py-1 text-xs font-semibold text-fog">
          {assets.length} files
        </span>
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-all",
          dragOver
            ? "border-brand-400/70 bg-brand-500/10"
            : "border-white/12 bg-ink-850/50 hover:border-brand-400/40 hover:bg-brand-500/5",
          busy && "pointer-events-none opacity-60",
        )}
      >
        {busy ? (
          <Loader2 className="h-8 w-8 animate-spin text-brand-300" />
        ) : (
          <UploadCloud className={cn("h-8 w-8", dragOver ? "text-brand-300" : "text-mute")} />
        )}
        <p className="text-sm font-semibold text-white">
          {busy ? "Uploading…" : "Drop raw assets here"}
        </p>
        <p className="text-xs text-fog">or click to browse · MP4, PNG, JPG, SVG, AI, PDF</p>
        <input
          type="file"
          multiple
          className="hidden"
          onChange={(e) => void addFiles(e.target.files)}
        />
      </label>

      {error && (
        <p className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      )}

      {assets.length > 0 && (
        <ul className="mt-4 space-y-2">
          {assets.map((a) => (
            <motion.li
              key={a.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 rounded-xl border border-white/5 bg-ink-850/60 px-3.5 py-2.5"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-brand-300">
                {icons[a.kind]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-mist">{a.name}</span>
                <span className="text-[11px] text-mute">
                  {a.size} · {a.uploadedAt}
                </span>
              </span>
              <button
                onClick={() => remove(a.id)}
                className="rounded-lg p-2 text-mute transition hover:bg-rose-500/10 hover:text-rose-300"
                aria-label="Delete asset"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </motion.li>
          ))}
        </ul>
      )}
    </Card>
  );
}
