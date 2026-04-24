import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HardHat, Loader2, LogIn } from 'lucide-react';
import { toast } from 'sonner';

interface SubPortalLoginProps {
  onLogin: (email: string, password: string) => Promise<any>;
}

export default function SubPortalLogin({ onLogin }: SubPortalLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      await onLogin(email, password);
      toast.success('Welcome to the Subcontractor Portal');
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <HardHat className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Subcontractor Portal</CardTitle>
          <CardDescription>Sign in to access your projects, claims, and progress reports</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}