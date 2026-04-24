import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, Building2, Check, ArrowLeft, Globe, Lock as LockIcon, Plus, Copy } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface CompanyOption {
  id: string;
  company_name: string;
  database_name: string;
}

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'credentials' | 'company' | 'mfa'>('credentials');
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const { signIn } = useAuth();
  const { language, setLanguage, direction, t } = useLanguage();
  const navigate = useNavigate();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let email = identifier;

      if (!identifier.includes('@')) {
        const { data, error: lookupError } = await supabase
          .from('profiles')
          .select('email')
          .eq('user_code', identifier)
          .maybeSingle();

        if (lookupError || !data) {
          setError('User code not found');
          setLoading(false);
          return;
        }
        email = data.email;
      }

      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      // Check for MFA
      const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (mfaData?.nextLevel === 'aal2' && mfaData?.currentLevel === 'aal1') {
        // User has MFA enabled, need verification
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totpFactor = factors?.totp?.[0];
        if (totpFactor) {
          const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
          if (challengeError) {
            setError(challengeError.message);
            setLoading(false);
            return;
          }
          setMfaFactorId(totpFactor.id);
          setMfaChallengeId(challenge.id);
          setStep('mfa');
          setLoading(false);
          return;
        }
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }
      setUserId(user.id);

      // Fetch assigned companies
      const { data: assignments } = await supabase
        .from('user_company_assignments')
        .select('company_id')
        .eq('user_id', user.id);

      if (!assignments || assignments.length === 0) {
        // No companies assigned, go straight in
        navigate('/');
        return;
      }

      const companyIds = assignments.map(a => a.company_id);
      const { data: companyData } = await supabase
        .from('sap_companies')
        .select('id, company_name, database_name')
        .in('id', companyIds)
        .eq('is_active', true);

      if (!companyData || companyData.length === 0) {
        navigate('/');
        return;
      }

      if (companyData.length === 1) {
        // Only one company, auto-select and proceed
        await setActiveCompanyAndNavigate(user.id, companyData[0].id);
        return;
      }

      // Multiple companies - show selection step
      setCompanies(companyData);
      setStep('company');
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const setActiveCompanyAndNavigate = async (uid: string, companyId: string) => {
    setLoading(true);
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', uid)
        .single();

      if (prof) {
        await supabase
          .from('profiles')
          .update({ active_company_id: companyId } as any)
          .eq('id', prof.id);
      }
      navigate('/');
    } catch {
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleCompanySelect = async () => {
    if (!selectedCompanyId || !userId) return;
    await setActiveCompanyAndNavigate(userId, selectedCompanyId);
  };

  const handleMfaVerify = async () => {
    if (!mfaFactorId || !mfaChallengeId || mfaCode.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: mfaChallengeId,
        code: mfaCode,
      });
      if (verifyError) {
        setError(verifyError.message);
        setLoading(false);
        return;
      }
      // MFA verified, proceed to company selection or home
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/'); return; }
      setUserId(user.id);
      const { data: assignments } = await supabase
        .from('user_company_assignments')
        .select('company_id')
        .eq('user_id', user.id);
      if (!assignments || assignments.length === 0) { navigate('/'); return; }
      const companyIds = assignments.map(a => a.company_id);
      const { data: companyData } = await supabase
        .from('sap_companies')
        .select('id, company_name, database_name')
        .in('id', companyIds)
        .eq('is_active', true);
      if (!companyData || companyData.length === 0) { navigate('/'); return; }
      if (companyData.length === 1) {
        await setActiveCompanyAndNavigate(user.id, companyData[0].id);
        return;
      }
      setCompanies(companyData);
      setStep('company');
    } catch {
      setError('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'mfa') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4" dir={direction}>
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-xl bg-primary flex items-center justify-center">
                <LockIcon className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">
              {t('login.twoFactorTitle') || 'Two-Factor Authentication'}
            </CardTitle>
            <CardDescription>
              {t('login.twoFactorDesc') || 'Enter the 6-digit code from your authenticator app'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={mfaCode} onChange={setMfaCode}>
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
          </CardContent>
          <CardFooter className="flex flex-col space-y-3">
            <Button className="w-full" disabled={mfaCode.length !== 6 || loading} onClick={handleMfaVerify}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('login.verify') || 'Verify'}
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => {
              setStep('credentials');
              setMfaCode('');
              setMfaFactorId(null);
              setMfaChallengeId(null);
              supabase.auth.signOut();
            }}>
              <ArrowLeft className="mr-1 h-3 w-3" />
              {t('login.backToLogin') || 'Back to login'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (step === 'company') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4" dir={direction}>
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-xl bg-primary flex items-center justify-center">
                <Building2 className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Select Company</CardTitle>
            <CardDescription>
              Choose the SAP company to work with
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {companies.map(company => (
              <button
                key={company.id}
                type="button"
                onClick={() => setSelectedCompanyId(company.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                  selectedCompanyId === company.id
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/40 hover:bg-muted/50'
                }`}
              >
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{company.company_name}</div>
                  <div className="text-xs text-muted-foreground truncate">{company.database_name}</div>
                </div>
                {selectedCompanyId === company.id && (
                  <Check className="h-5 w-5 text-primary shrink-0" />
                )}
              </button>
            ))}
          </CardContent>
          <CardFooter className="flex flex-col space-y-3">
            <Button
              className="w-full"
              disabled={!selectedCompanyId || loading}
              onClick={handleCompanySelect}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => {
                setStep('credentials');
                setCompanies([]);
                setSelectedCompanyId(null);
                supabase.auth.signOut();
              }}
            >
              <ArrowLeft className="mr-1 h-3 w-3" />
              Back to login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir={direction}>
      {/* Language Toggle */}
      <Button
        variant="outline"
        size="sm"
        className="absolute top-4 right-4 gap-2"
        onClick={toggleLanguage}
      >
        <Globe className="h-4 w-4" />
        {language === 'en' ? 'العربية' : 'English'}
      </Button>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-foreground">AR</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {t('login.welcomeBack') || 'Welcome Back'}
          </CardTitle>
          <CardDescription>
            {t('login.signInDesc') || 'Sign in to your AlrajhiCRM account'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="identifier">{t('login.emailOrCode') || 'Email or User Code'}</Label>
              <Input
                id="identifier"
                type="text"
                placeholder={t('login.emailPlaceholder') || 'name@company.com or user code'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('login.password') || 'Password'}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('login.passwordPlaceholder') || 'Enter your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('login.signIn') || 'Sign In'}
            </Button>
            <Link to="/forgot-password" className="text-sm text-primary hover:underline font-medium">
              {t('login.forgotPassword') || 'Forgot Password?'}
            </Link>
            <p className="text-sm text-muted-foreground text-center">
              {t('login.noAccount') || "Don't have an account?"}{' '}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                {t('login.signUp') || 'Sign up'}
              </Link>
            </p>
          </CardFooter>
        </form>

        {/* Company Onboarding Section */}
        <div className="border-t px-6 pb-6 pt-4 space-y-3">
          <p className="text-xs text-center text-muted-foreground font-medium uppercase tracking-wider">
            {language === 'ar' ? 'إعداد شركة جديدة' : 'Company Setup'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-10 text-xs"
              onClick={() => navigate('/onboarding/create-company')}
            >
              <Plus className="h-3.5 w-3.5" />
              {language === 'ar' ? 'شركة جديدة' : 'New Company'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-10 text-xs"
              onClick={() => navigate('/onboarding/copy-company')}
            >
              <Copy className="h-3.5 w-3.5" />
              {language === 'ar' ? 'نسخ من شركة' : 'Copy Existing'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
