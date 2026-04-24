import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Volume2, Loader2, CheckCircle2, XCircle, Play } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const VOICES = [
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', lang: 'Multi' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', lang: 'Multi' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', lang: 'Multi' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', lang: 'Multi' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', lang: 'Multi' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', lang: 'Multi' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', lang: 'Multi' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', lang: 'Multi' },
];

const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;

export default function ElevenLabsSettings() {
  const { t } = useLanguage();
  const [testVoice, setTestVoice] = useState(VOICES[0].id);
  const [testText, setTestText] = useState('Hello, this is a test of the ElevenLabs voice integration.');
  const [isTesting, setIsTesting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleTest = async () => {
    setIsTesting(true);
    setStatus('idle');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(TTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text: testText, voiceId: testVoice }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Test failed');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.onended = () => URL.revokeObjectURL(audioUrl);
      await audio.play();

      setStatus('success');
      toast.success('Voice test successful!');
    } catch (error) {
      console.error('Test error:', error);
      setStatus('error');
      toast.error(error instanceof Error ? error.message : 'Voice test failed');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ElevenLabs Voice Settings</h1>
        <p className="text-muted-foreground">Configure AI voice responses for the chat assistant</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Connection Status
            </CardTitle>
            <CardDescription>
              ElevenLabs API key is managed through Lovable Cloud connectors
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              {status === 'success' ? (
                <Badge className="bg-primary"><CheckCircle2 className="h-3 w-3 mr-1" /> Connected</Badge>
              ) : status === 'error' ? (
                <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Error</Badge>
              ) : (
                <Badge variant="secondary">Not tested</Badge>
              )}
            </div>
            <div className="rounded-lg border border-border p-4 bg-muted/30 text-sm space-y-2">
              <p className="font-medium">To update your ElevenLabs API key:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Go to <a href="https://elevenlabs.io" target="_blank" rel="noopener" className="text-primary underline">elevenlabs.io</a> and sign in</li>
                <li>Navigate to Profile → API Keys</li>
                <li>Generate a new API key</li>
                <li>In Lovable, go to Settings → Connectors → ElevenLabs</li>
                <li>Update the connection with your new key</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Voice Test</CardTitle>
            <CardDescription>Test the TTS connection and preview voices</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Voice</Label>
              <Select value={testVoice} onValueChange={setTestVoice}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VOICES.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.name} ({v.lang})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Test Text</Label>
              <Input
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="Enter text to speak..."
              />
            </div>
            <Button onClick={handleTest} disabled={isTesting || !testText.trim()} className="w-full">
              {isTesting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Testing...</>
              ) : (
                <><Play className="h-4 w-4 mr-2" /> Test Voice</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
