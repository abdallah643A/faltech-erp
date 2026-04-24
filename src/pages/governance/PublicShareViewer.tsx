import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Lock, AlertCircle, Download, Eye } from "lucide-react";

async function sha256(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function PublicShareViewer() {
  const { token } = useParams<{ token: string }>();
  const [share, setShare] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [docUrl, setDocUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase
        .from("ecm_external_shares" as any)
        .select("*")
        .eq("share_token", token)
        .eq("is_revoked", false)
        .maybeSingle() as any);
      if (error || !data) {
        setError("This link is invalid or has been revoked.");
        setLoading(false);
        return;
      }
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setError("This link has expired.");
        await logAccess(data.id, "expired", false);
        setLoading(false);
        return;
      }
      if (data.max_views && data.view_count >= data.max_views) {
        setError("This link has reached its view limit.");
        setLoading(false);
        return;
      }
      setShare(data);
      if (!data.password_hash) {
        setAuthorized(true);
      }
      setLoading(false);
    })();
  }, [token]);

  async function logAccess(shareId: string, action: string, success: boolean) {
    await (supabase.from("ecm_external_share_access_log" as any).insert({
      share_id: shareId,
      action,
      success,
      user_agent: navigator.userAgent,
    }) as any);
  }

  async function checkPassword() {
    if (!share) return;
    const h = await sha256(password);
    if (h === share.password_hash) {
      setAuthorized(true);
      await logAccess(share.id, "view", true);
      await (supabase
        .from("ecm_external_shares" as any)
        .update({ view_count: (share.view_count ?? 0) + 1 })
        .eq("id", share.id) as any);
    } else {
      await logAccess(share.id, "password_failed", false);
      setError("Incorrect password");
    }
  }

  useEffect(() => {
    if (!authorized || !share) return;
    (async () => {
      // Try common buckets
      for (const bucket of ["ecm-documents", "attachments", "correspondence"]) {
        if (!share.document_id) break;
        const { data: doc } = await (supabase
          .from("ecm_documents" as any)
          .select("file_path")
          .eq("id", share.document_id)
          .maybeSingle() as any);
        if (doc?.file_path) {
          const { data } = await supabase.storage.from(bucket).createSignedUrl(doc.file_path, 600);
          if (data?.signedUrl) {
            setDocUrl(data.signedUrl);
            return;
          }
        }
      }
    })();
  }, [authorized, share]);

  if (loading) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="animate-spin" /></div>;
  }

  if (error) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><AlertCircle /> Unavailable</CardTitle></CardHeader>
          <CardContent>{error}</CardContent>
        </Card>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader><CardTitle className="flex items-center gap-2"><Lock /> Password required</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" />
            <Button onClick={checkPassword} className="w-full">Unlock</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Eye /> Shared Document</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Shared with {share?.recipient_name ?? share?.recipient_email ?? "you"}.
            {share?.expires_at && <> Expires {new Date(share.expires_at).toLocaleString()}.</>}
          </div>
          {docUrl ? (
            <>
              <iframe src={docUrl} className="w-full h-[600px] border rounded" title="Shared document" />
              {share?.download_allowed && (
                <Button asChild>
                  <a href={docUrl} download><Download className="w-4 h-4 mr-2" /> Download</a>
                </Button>
              )}
            </>
          ) : (
            <div className="text-muted-foreground text-sm">Loading document…</div>
          )}
          {share?.watermark_enabled && (
            <div className="text-xs text-muted-foreground">
              Watermarked · Shared link · Token {token?.slice(0, 8)}…
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
