import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatBytes, type ProjectFile } from "@/lib/contracts";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Upload, FileIcon, Download, Trash2, Lock, Eye } from "lucide-react";
import { toast } from "sonner";

export function FileManager({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: files = [] } = useQuery({
    queryKey: ["files", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("files")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProjectFile[];
    },
  });

  const handleUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const path = `${user.id}/${projectId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("project-files").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("files").insert({
        user_id: user.id,
        project_id: projectId,
        name: file.name,
        storage_path: path,
        mime_type: file.type,
        size_bytes: file.size,
      });
      if (dbErr) throw dbErr;
      qc.invalidateQueries({ queryKey: ["files", projectId] });
      toast.success("File uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const download = async (f: ProjectFile) => {
    const { data, error } = await supabase.storage.from("project-files").createSignedUrl(f.storage_path, 60);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  const updateFlag = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ProjectFile> }) => {
      const { error } = await supabase.from("files").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["files", projectId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (f: ProjectFile) => {
      await supabase.storage.from("project-files").remove([f.storage_path]);
      const { error } = await supabase.from("files").delete().eq("id", f.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["files", projectId] });
      toast.success("File deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <input
        ref={fileInput}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUpload(f);
          e.target.value = "";
        }}
      />
      <Button
        onClick={() => fileInput.current?.click()}
        disabled={uploading}
        variant="outline"
        className="w-full border-dashed border-border h-auto py-6 flex flex-col gap-2"
      >
        <Upload className="w-5 h-5 text-muted-foreground" />
        <span className="text-sm">{uploading ? "Uploading…" : "Upload deliverable"}</span>
        <span className="text-xs text-muted-foreground">Private to you & paying clients</span>
      </Button>

      {files.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No files yet</p>
      ) : (
        <ul className="space-y-2">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 p-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileIcon className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{f.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>{formatBytes(f.size_bytes)}</span>
                  {f.payment_required && (
                    <span className="inline-flex items-center gap-1 text-amber-400">
                      <Lock className="w-3 h-3" /> Payment-gated
                    </span>
                  )}
                  {f.preview_only && (
                    <span className="inline-flex items-center gap-1 text-primary">
                      <Eye className="w-3 h-3" /> Preview only
                    </span>
                  )}
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Switch
                    checked={f.payment_required}
                    onCheckedChange={(v) => updateFlag.mutate({ id: f.id, patch: { payment_required: v } })}
                  />
                  Paid
                </label>
              </div>
              <Button variant="ghost" size="icon" onClick={() => download(f)} title="Download">
                <Download className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove.mutate(f)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
