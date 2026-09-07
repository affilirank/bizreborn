"use client";

import * as React from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Save,
  X,
  ExternalLink,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  meta_title: string | null;
  meta_description: string | null;
  keywords: string[] | null;
  intro: string | null;
  sections: { heading: string; paragraphs: string[]; bullets?: string[] }[];
  faq: { q: string; a: string }[];
  cta_headline: string | null;
  cta_body: string | null;
  read_time: number;
  pillar: string | null;
  status: "draft" | "published";
  published: string | null;
  updated_at: string | null;
}

type EditorState = {
  title: string;
  slug: string;
  meta_title: string;
  meta_description: string;
  keywords: string;
  intro: string;
  read_time: string;
  status: "draft" | "published";
  sections: { heading: string; paragraphs: string; bullets: string }[];
  faq: { q: string; a: string }[];
  cta_headline: string;
  cta_body: string;
};

const EMPTY_EDITOR: EditorState = {
  title: "",
  slug: "",
  meta_title: "",
  meta_description: "",
  keywords: "",
  intro: "",
  read_time: "5",
  status: "draft",
  sections: [{ heading: "", paragraphs: "", bullets: "" }],
  faq: [],
  cta_headline: "",
  cta_body: "",
};

function toEditor(p: BlogPost): EditorState {
  return {
    title: p.title,
    slug: p.slug,
    meta_title: p.meta_title ?? "",
    meta_description: p.meta_description ?? "",
    keywords: (p.keywords ?? []).join(", "),
    intro: p.intro ?? "",
    read_time: String(p.read_time ?? 5),
    status: p.status,
    sections: (p.sections?.length ? p.sections : [{ heading: "", paragraphs: "", bullets: "" }]).map((s) => ({
      heading: s.heading ?? "",
      paragraphs: Array.isArray(s.paragraphs) ? s.paragraphs.join("\n") : "",
      bullets: Array.isArray(s.bullets) ? s.bullets.join("\n") : "",
    })),
    faq: (p.faq ?? []).map((f) => ({ q: f.q, a: f.a })),
    cta_headline: p.cta_headline ?? "",
    cta_body: p.cta_body ?? "",
  };
}

function fromEditor(e: EditorState) {
  return {
    title: e.title,
    slug: e.slug,
    meta_title: e.meta_title,
    meta_description: e.meta_description,
    keywords: e.keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean),
    intro: e.intro,
    read_time: Number(e.read_time) || 5,
    status: e.status,
    sections: e.sections
      .filter((s) => s.heading.trim() || s.paragraphs.trim())
      .map((s) => ({
        heading: s.heading,
        paragraphs: s.paragraphs
          .split("\n")
          .map((p) => p.trim())
          .filter(Boolean),
        bullets: s.bullets
          .split("\n")
          .map((b) => b.trim())
          .filter(Boolean),
      })),
    faq: e.faq.filter((f) => f.q.trim() && f.a.trim()),
    cta_headline: e.cta_headline,
    cta_body: e.cta_body,
  };
}

export function BlogBuilder() {
  const [posts, setPosts] = React.useState<BlogPost[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<BlogPost | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [form, setForm] = React.useState<EditorState>(EMPTY_EDITOR);
  const [saving, setSaving] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/blog");
      const data = (await res.json()) as { posts?: BlogPost[] };
      setPosts(data.posts ?? []);
    } catch {
      setError("Could not load posts.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setCreating(true);
    setForm(EMPTY_EDITOR);
    setNotice(null);
    setError(null);
  };

  const openEdit = (p: BlogPost) => {
    setCreating(false);
    setEditing(p);
    setForm(toEditor(p));
    setNotice(null);
    setError(null);
  };

  const close = () => {
    setCreating(false);
    setEditing(null);
  };

  const save = async () => {
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const payload = fromEditor(form);
      const res = editing
        ? await fetch(`/api/blog/${editing.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/blog", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const data = (await res.json()) as { post?: BlogPost; error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? `Request failed (${res.status})`);
        return;
      }
      setNotice("Post saved.");
      setPosts((prev) => {
        const idx = prev.findIndex((p) => p.id === data.post?.id);
        if (idx === -1 && data.post) return [data.post, ...prev];
        const next = [...prev];
        if (data.post) next[idx] = data.post;
        return next;
      });
      close();
    } catch {
      setError("Save failed — try again.");
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (p: BlogPost) => {
    const nextStatus = p.status === "published" ? "draft" : "published";
    setError(null);
    try {
      const res = await fetch(`/api/blog/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = (await res.json()) as { post?: BlogPost; error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? "Update failed.");
        return;
      }
      setPosts((prev) =>
        prev.map((x) => (x.id === p.id ? (data.post ?? { ...x, status: nextStatus }) : x)),
      );
    } catch {
      setError("Update failed.");
    }
  };

  const remove = async (p: BlogPost) => {
    if (!window.confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/blog/${p.id}`, { method: "DELETE" });
      if (!res.ok) {
        setError("Delete failed.");
        return;
      }
      setPosts((prev) => prev.filter((x) => x.id !== p.id));
      setNotice("Post deleted.");
    } catch {
      setError("Delete failed.");
    }
  };

  const set = <K extends keyof EditorState>(key: K, value: EditorState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setSection = (i: number, key: keyof EditorState["sections"][number], value: string) =>
    setForm((f) => {
      const sections = f.sections.map((s, idx) => (idx === i ? { ...s, [key]: value } : s));
      return { ...f, sections };
    });

  const addSection = () =>
    setForm((f) => ({
      ...f,
      sections: [...f.sections, { heading: "", paragraphs: "", bullets: "" }],
    }));

  const removeSection = (i: number) =>
    setForm((f) => ({ ...f, sections: f.sections.filter((_, idx) => idx !== i) }));

  const setFaq = (i: number, key: keyof EditorState["faq"][number], value: string) =>
    setForm((f) => {
      const faq = f.faq.map((x, idx) => (idx === i ? { ...x, [key]: value } : x));
      return { ...f, faq };
    });

  const addFaq = () => setForm((f) => ({ ...f, faq: [...f.faq, { q: "", a: "" }] }));
  const removeFaq = (i: number) =>
    setForm((f) => ({ ...f, faq: f.faq.filter((_, idx) => idx !== i) }));

  const inputCls =
    "w-full rounded-xl border border-white/10 bg-ink-800 px-3 py-2 text-sm text-white outline-none transition focus:border-brand-400/60";
  const labelCls = "block text-[11px] font-semibold uppercase tracking-wide text-fog";

  return (
    <div className="mt-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-display text-base font-bold text-white">Blog &amp; SEO Articles</h4>
          <p className="text-xs text-fog">
            {posts.length} posts · manage titles, sections, FAQs &amp; publish state
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-ink-950 transition hover:bg-brand-400"
        >
          <Plus className="h-4 w-4" /> New post
        </button>
      </div>

      {notice && (
        <div className="mb-4 rounded-xl border border-glow-500/30 bg-glow-500/10 px-4 py-2.5 text-sm text-glow-400">
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
          {error}
        </div>
      )}

      {(creating || editing) && (
        <div className="rounded-2xl border border-white/8 bg-ink-850/60 p-5">
          <div className="mb-5 flex items-center justify-between">
            <h5 className="font-display text-lg font-bold text-white">
              {editing ? "Edit post" : "New post"}
            </h5>
            <button onClick={close} className="rounded-lg border border-white/10 p-2 text-fog hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls}>Title *</label>
              <input
                className={inputCls}
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. 12 Local SEO Tactics That Fill Your Schedule"
              />
            </div>
            <div>
              <label className={labelCls}>Slug</label>
              <input
                className={inputCls}
                value={form.slug}
                onChange={(e) => set("slug", e.target.value)}
                placeholder="auto-generated from title"
              />
            </div>
            <div>
              <label className={labelCls}>Read time (min)</label>
              <input
                className={inputCls}
                type="number"
                value={form.read_time}
                onChange={(e) => set("read_time", e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Meta title</label>
              <input
                className={inputCls}
                value={form.meta_title}
                onChange={(e) => set("meta_title", e.target.value)}
                placeholder="Falls back to title"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Meta description</label>
              <textarea
                className={cn(inputCls, "h-20 resize-y")}
                value={form.meta_description}
                onChange={(e) => set("meta_description", e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Keywords (comma separated)</label>
              <input
                className={inputCls}
                value={form.keywords}
                onChange={(e) => set("keywords", e.target.value)}
                placeholder="local seo, google business profile, lead generation"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Intro</label>
              <textarea
                className={cn(inputCls, "h-24 resize-y")}
                value={form.intro}
                onChange={(e) => set("intro", e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <label className={labelCls}>Sections</label>
              <button
                onClick={addSection}
                className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-fog hover:text-white"
              >
                <Plus className="h-3 w-3" /> Add section
              </button>
            </div>
            <div className="space-y-3">
              {form.sections.map((s, i) => (
                <div key={i} className="rounded-xl border border-white/8 bg-ink-800/40 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-brand-300">
                      Section {i + 1}
                    </span>
                    <button
                      onClick={() => removeSection(i)}
                      className="rounded-md p-1 text-rose-300/70 hover:text-rose-300"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid gap-2">
                    <input
                      className={inputCls}
                      value={s.heading}
                      onChange={(e) => setSection(i, "heading", e.target.value)}
                      placeholder="Heading"
                    />
                    <textarea
                      className={cn(inputCls, "h-20 resize-y")}
                      value={s.paragraphs}
                      onChange={(e) => setSection(i, "paragraphs", e.target.value)}
                      placeholder={"Paragraphs (one per line)"}
                    />
                    <textarea
                      className={cn(inputCls, "h-16 resize-y")}
                      value={s.bullets}
                      onChange={(e) => setSection(i, "bullets", e.target.value)}
                      placeholder={"Bullets (one per line, optional)"}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <label className={labelCls}>FAQ</label>
              <button
                onClick={addFaq}
                className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-fog hover:text-white"
              >
                <Plus className="h-3 w-3" /> Add question
              </button>
            </div>
            <div className="space-y-3">
              {form.faq.length === 0 && (
                <p className="text-xs text-mute">No FAQ yet — add a question to show rich results.</p>
              )}
              {form.faq.map((f, i) => (
                <div key={i} className="rounded-xl border border-white/8 bg-ink-800/40 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-brand-300">Q{i + 1}</span>
                    <button onClick={() => removeFaq(i)} className="rounded-md p-1 text-rose-300/70 hover:text-rose-300">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid gap-2">
                    <input
                      className={inputCls}
                      value={f.q}
                      onChange={(e) => setFaq(i, "q", e.target.value)}
                      placeholder="Question"
                    />
                    <textarea
                      className={cn(inputCls, "h-20 resize-y")}
                      value={f.a}
                      onChange={(e) => setFaq(i, "a", e.target.value)}
                      placeholder="Answer"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>CTA headline</label>
              <input
                className={inputCls}
                value={form.cta_headline}
                onChange={(e) => set("cta_headline", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>CTA body</label>
              <input
                className={inputCls}
                value={form.cta_body}
                onChange={(e) => set("cta_body", e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-white/8 pt-4">
            <select
              className="rounded-xl border border-white/10 bg-ink-800 px-3 py-2 text-sm font-medium text-white outline-none"
              value={form.status}
              onChange={(e) => set("status", e.target.value as EditorState["status"])}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-ink-950 transition hover:bg-brand-400 disabled:opacity-60"
            >
              <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save post"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-white/8 bg-ink-850/60 p-10 text-center text-sm text-fog">
          Loading posts…
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-fog">
          No blog posts yet. Create your first one above.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/8">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-850/80 text-[11px] uppercase tracking-wide text-fog">
              <tr>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="hidden px-4 py-3 font-semibold sm:table-cell">Published</th>
                <th className="hidden px-4 py-3 font-semibold md:table-cell">Updated</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-ink-850/40">
              {posts.map((p) => (
                <tr key={p.id} className="transition hover:bg-white/[0.03]">
                  <td className="max-w-xs px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-brand-300/70" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-mist">{p.title}</p>
                        <p className="truncate text-[11px] text-mute">/blog/{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={p.status === "published" ? "emerald" : "amber"}>
                      {p.status === "published" ? "Published" : "Draft"}
                    </Badge>
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-mute sm:table-cell">
                    {p.published ? p.published.slice(0, 10) : "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-mute md:table-cell">
                    {p.updated_at ? p.updated_at.slice(0, 10) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => togglePublish(p)}
                        className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-fog transition hover:border-white/25 hover:text-white"
                        title={p.status === "published" ? "Unpublish" : "Publish"}
                      >
                        {p.status === "published" ? "Unpublish" : "Publish"}
                      </button>
                      <a
                        href={`/blog/${p.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-white/10 p-1.5 text-fog transition hover:text-white"
                        title="View on site"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </a>
                      <button
                        onClick={() => openEdit(p)}
                        className="rounded-lg border border-white/10 p-1.5 text-fog transition hover:text-white"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => void remove(p)}
                        className="rounded-lg border border-rose-500/25 p-1.5 text-rose-300/80 transition hover:bg-rose-500/10 hover:text-rose-300"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 flex items-center gap-1.5 text-[11px] text-mute">
        <ExternalLink className="h-3 w-3" />
        Live at /blog · draft posts only appear in this panel until published.
      </p>
    </div>
  );
}
