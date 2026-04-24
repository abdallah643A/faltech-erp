import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const { direction, t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        setError(error.message);
      } else {
        setSent(true);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir={direction}>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-xl bg-primary flex items-center justify-center">
              <Mail className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {t('login.forgotPassword') || 'Forgot Password'}
          </CardTitle>
          <CardDescription>
            {t('login.forgotPasswordDesc') || 'Enter your email and we\'ll send you a reset link'}
          </CardDescription>
        </CardHeader>

        {sent ? (
          <CardContent className="text-center space-y-4 pb-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <p className="text-foreground font-medium">
              {t('login.resetEmailSent') || 'Reset link sent!'}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('login.checkEmail') || 'Check your email for the password reset link.'}
            </p>
            <Link to="/login">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('login.backToLogin') || 'Back to Login'}
              </Button>
            </Link>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">{t('login.email') || 'Email Address'}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={loading || !email}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('login.sendResetLink') || 'Send Reset Link'}
              </Button>
              <Link to="/login" className="text-sm text-primary hover:underline font-medium flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" />
                {t('login.backToLogin') || 'Back to Login'}
              </Link>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
