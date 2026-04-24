import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useDigitalSignatures = (companyId?: string) => {
  return useQuery({
    queryKey: ["pos-digital-signatures", companyId],
    queryFn: async () => {
      let q = supabase.from("pos_digital_signatures").select("*").order("created_at", { ascending: false });
      if (companyId) q = q.eq("company_id", companyId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
};

async function logEvent(signatureId: string, eventType: string, eventData: any = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  await (supabase.from("signature_audit_log" as any).insert({
    signature_id: signatureId,
    event_type: eventType,
    event_data: eventData,
    actor_user_id: user?.id,
    actor_name: user?.email,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
  }) as any);
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export const useCreateSignature = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sig: any) => {
      const certInput = `${sig.signer_name || ""}|${sig.document_id || ""}|${Date.now()}`;
      const certHash = await sha256Hex(certInput);
      const payload = {
        ...sig,
        certificate_hash: sig.certificate_hash || certHash,
        certificate_subject: sig.certificate_subject || `CN=${sig.signer_name || "unknown"}`,
        signature_algorithm: sig.signature_algorithm || "OTP-SHA256",
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      };
      const { data, error } = await supabase.from("pos_digital_signatures").insert(payload).select().single();
      if (error) throw error;
      await logEvent(data.id, "created", { method: payload.signature_algorithm });
      if (payload.otp_code) await logEvent(data.id, "otp_sent", {});
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pos-digital-signatures"] }); toast.success("Signature recorded"); },
  });
};

export const useVerifyOTP = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, otpCode }: { id: string; otpCode: string }) => {
      const { data: record, error: fetchError } = await supabase.from("pos_digital_signatures").select("*").eq("id", id).single();
      if (fetchError) throw fetchError;
      if (record.otp_code !== otpCode) {
        await logEvent(id, "otp_failed", { attempts: (record.otp_attempts || 0) + 1 });
        throw new Error("Invalid OTP code");
      }
      if ((record.otp_attempts || 0) >= 5) {
        await logEvent(id, "otp_failed", { reason: "max_attempts" });
        throw new Error("Maximum OTP attempts exceeded");
      }
      const { data, error } = await supabase.from("pos_digital_signatures").update({
        is_verified: true,
        verified_at: new Date().toISOString(),
        otp_verified_at: new Date().toISOString(),
      }).eq("id", id).select().single();
      if (error) throw error;
      await logEvent(id, "otp_verified", {});
      await logEvent(id, "signed", { sealed_at: new Date().toISOString() });
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pos-digital-signatures"] }); toast.success("OTP verified"); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
