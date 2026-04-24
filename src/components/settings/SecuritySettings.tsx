import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Shield, ShieldCheck, ShieldOff, Loader2, Copy, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

type MfaStep = 'overview' | 'enroll' | 'verify';

export default function SecuritySettings() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<MfaStep>('overview');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [factorId, setFactorId] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    checkMfaStatus();
  }, []);

  const checkMfaStatus = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      const verifiedTotpFactors = data?.totp?.filter(f => f.status === 'verified') || [];
      setMfaEnabled(verifiedTotpFactors.length > 0);
      if (verifiedTotpFactors.length > 0) {
        setFactorId(verifiedTotpFactors[0].id);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    setError('');
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'AlrajhiCRM TOTP',
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
      setStep('verify');
    } catch {
      setError('Failed to start enrollment');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEnrollment = async () => {
    if (verifyCode.length !== 6) return;
    setVerifying(true);
    setError('');
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) { setError(challengeError.message); setVerifying(false); return; }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: verifyCode,
      });
      if (verifyError) { setError(verifyError.message); setVerifying(false); return; }

      setMfaEnabled(true);
      setStep('overview');
      toast.success('Two-factor authentication enabled successfully!');
    } catch {
      setError('Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) {
        toast.error(error.message);
      } else {
        setMfaEnabled(false);
        setFactorId('');
        toast.success('Two-factor authentication disabled');
      }
    } catch {
      toast.error('Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && step === 'overview') {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {t('login.twoFactorTitle') || 'Two-Factor Authentication'}
        </CardTitle>
        <CardDescription>
          Add an extra layer of security to your account using an authenticator app like Google Authenticator or Authy.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 'overview' && (
          <>
            <div className={`flex items-center gap-3 p-4 rounded-lg border ${mfaEnabled ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950' : 'border-border bg-muted/50'}`}>
              {mfaEnabled ? (
                <ShieldCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
              ) : (
                <ShieldOff className="h-8 w-8 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium text-foreground">
                  {mfaEnabled ? '2FA is enabled' : '2FA is not enabled'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {mfaEnabled
                    ? 'Your account is protected with two-factor authentication.'
                    : 'Enable 2FA to add an extra layer of security.'}
                </p>
              </div>
            </div>
            {mfaEnabled ? (
              <Button variant="destructive" onClick={handleDisable} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Disable 2FA
              </Button>
            ) : (
              <Button onClick={handleEnroll} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enable 2FA
              </Button>
            )}
          </>
        )}

        {step === 'verify' && (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Scan the QR code below with your authenticator app:
              </p>
              {qrCode && (
                <div className="flex justify-center">
                  <img src={qrCode} alt="QR Code for 2FA" className="w-48 h-48 border rounded-lg" />
                </div>
              )}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Or enter this secret key manually:</p>
                <div className="flex items-center justify-center gap-2">
                  <code className="bg-muted px-3 py-1.5 rounded text-xs font-mono break-all">
                    {secret}
                  </code>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copySecret}>
                    {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-center">Enter the 6-digit code from your app:</p>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={verifyCode} onChange={setVerifyCode}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => { setStep('overview'); setVerifyCode(''); setError(''); }}>
                  Cancel
                </Button>
                <Button onClick={handleVerifyEnrollment} disabled={verifyCode.length !== 6 || verifying}>
                  {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify & Enable
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
