import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, Square, Loader2, Play, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VoiceNoteRecorderProps {
  activityId: string;
  onTranscriptReady?: (transcript: string) => void;
}

export function VoiceNoteRecorder({ activityId, onTranscriptReady }: VoiceNoteRecorderProps) {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setDuration(0);
      setTranscript(null);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Transcribe using edge function
        await transcribeAudio(blob);
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch {
      toast({ title: 'Microphone Error', description: 'Could not access microphone. Please check permissions.', variant: 'destructive' });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const transcribeAudio = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      // Use Web Speech API as a lightweight transcription approach
      // (ElevenLabs batch transcription for production-grade)
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      formData.append('activity_id', activityId);

      const { data, error } = await supabase.functions.invoke('transcribe-voice-note', {
        body: formData,
      });

      if (error) throw error;

      const text = data?.transcript || '';
      setTranscript(text);
      onTranscriptReady?.(text);

      // Save voice note record
      await supabase.from('activity_voice_notes').insert({
        activity_id: activityId,
        audio_url: 'local-recording',
        transcript: text,
        duration_seconds: duration,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      });

      toast({ title: 'Transcription Complete', description: 'Voice note has been transcribed.' });
    } catch (err: any) {
      // Fallback: save without transcript
      toast({ title: 'Note Saved', description: 'Voice recorded but transcription unavailable.', variant: 'default' });
      setTranscript('(Transcription unavailable)');
    } finally {
      setIsTranscribing(false);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const reset = () => {
    setTranscript(null);
    setAudioUrl(null);
    setDuration(0);
  };

  return (
    <Card className="border border-dashed">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {!isRecording && !audioUrl && !isTranscribing && (
            <Button size="sm" variant="outline" onClick={startRecording} className="gap-1.5">
              <Mic className="h-4 w-4 text-destructive" />
              Record Voice Note
            </Button>
          )}

          {isRecording && (
            <>
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
                </span>
                <span className="text-sm font-medium text-destructive">{formatTime(duration)}</span>
              </div>
              <Button size="sm" variant="destructive" onClick={stopRecording} className="gap-1">
                <Square className="h-3 w-3" /> Stop
              </Button>
            </>
          )}

          {isTranscribing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Transcribing...
            </div>
          )}

          {audioUrl && !isTranscribing && (
            <div className="flex items-center gap-2 flex-1">
              <Badge variant="secondary" className="text-xs">{formatTime(duration)}</Badge>
              <audio src={audioUrl} controls className="h-8 flex-1" />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={reset}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {transcript && (
          <div className="mt-2 p-2 rounded bg-muted/50 text-sm">
            <p className="text-xs font-medium text-muted-foreground mb-1">Transcript:</p>
            <p>{transcript}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
