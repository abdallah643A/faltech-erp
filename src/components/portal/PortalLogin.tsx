import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, Mail, Eye, EyeOff } from 'lucide-react';

interface PortalLoginProps {
  portal: {
    customer_name: string;
    primary_color: string;
    welcome_message?: string | null;
    logo_url?: string | null;
    company_name_override?: string | null;
  };
  onLogin: (email: string, password: string) => Promise<any>;
}

export default function PortalLogin({ portal, onLogin }: PortalLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pc = portal.primary_color || '#1e40af';
  const displayName = portal.company_name_override || portal.customer_name;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: `linear-gradient(135deg, ${pc}08, ${pc}03, #f8fafc)` }}>
      <Card className="max-w-md w-full shadow-2xl border-0 overflow-hidden">
        <div className="h-1.5 w-full" style={{ backgroundColor: pc }} />
        <CardContent className="pt-10 pb-8 px-8 space-y-6">
          <div className="text-center">
            {portal.logo_url && (
              <img src={portal.logo_url} alt="Logo" className="h-12 mx-auto mb-4" />
            )}
            <h1 className="text-2xl font-bold" style={{ color: pc }}>{displayName}</h1>
            <p className="text-gray-500 text-sm mt-2">
              {portal.welcome_message || 'Sign in to access your portal'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Email Address</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-11"
                  required
                />
                <button type="button" className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
            )}

            <Button
              type="submit"
              disabled={!email || !password || loading}
              className="w-full h-11 text-white font-medium"
              style={{ backgroundColor: pc }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <p className="text-[11px] text-center text-gray-400">
            Contact your project manager if you need access credentials.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
