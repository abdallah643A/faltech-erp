import { useState, useRef, useEffect, KeyboardEvent, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  MessageSquare, Send, Pin, PinOff, Trash2, Loader2, AtSign, Lock,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useRecordComments, useMentionableUsers, extractMentions, RecordComment,
} from '@/hooks/useRecordComments';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface Props {
  entityType: string;
  recordId: string;
  /** Header label override. */
  title?: string;
  /** Hide the internal/external toggle (force internal). */
  forceInternal?: boolean;
}

export function CommentsThread({ entityType, recordId, title, forceInternal }: Props) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const {
    comments, isLoading, addComment, isPosting,
    togglePin, deleteComment,
  } = useRecordComments(entityType, recordId);

  const [text, setText] = useState('');
  const [internal, setInternal] = useState(true);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // ─── Mention picker state ──────────────────────────────────
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState<number>(-1);
  const [activeIdx, setActiveIdx] = useState(0);
  const { data: candidates = [] } = useMentionableUsers(mentionQuery ?? '');

  const sorted = useMemo(() => {
    return [...comments].sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [comments]);

  const onChangeText = (v: string) => {
    setText(v);
    const cursor = taRef.current?.selectionStart ?? v.length;
    // Detect "@" preceded by start-of-string or whitespace
    const prefix = v.slice(0, cursor);
    const m = /(?:^|\s)@([\p{L}\p{N}_ ]{0,30})$/u.exec(prefix);
    if (m) {
      setMentionStart(cursor - m[1].length - 1); // position of @
      setMentionQuery(m[1]);
      setActiveIdx(0);
    } else {
      setMentionQuery(null);
      setMentionStart(-1);
    }
  };

  const insertMention = (u: { user_id: string; full_name: string | null; email: string | null }) => {
    if (mentionStart < 0 || !taRef.current) return;
    const cursor = taRef.current.selectionStart;
    const name = u.full_name ?? u.email ?? 'user';
    const tag = `@[${name}](${u.user_id}) `;
    const next = text.slice(0, mentionStart) + tag + text.slice(cursor);
    setText(next);
    setMentionQuery(null);
    setMentionStart(-1);
    requestAnimationFrame(() => {
      const pos = mentionStart + tag.length;
      taRef.current?.setSelectionRange(pos, pos);
      taRef.current?.focus();
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && candidates.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, candidates.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(candidates[activeIdx]);
        return;
      }
      if (e.key === 'Escape') { setMentionQuery(null); return; }
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  };

  const submit = () => {
    if (!text.trim()) return;
    addComment({ text, isInternal: forceInternal ?? internal });
    setText('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b pb-2 mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">
            {title ?? (isAr ? 'التعليقات' : 'Comments')}
          </h3>
          <Badge variant="outline" className="text-xs">{comments.length}</Badge>
        </div>
      </div>

      {/* Composer */}
      <div className="relative mb-4">
        <Textarea
          ref={taRef}
          value={text}
          onChange={(e) => onChangeText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={isAr
            ? 'اكتب تعليقاً... استخدم @ للإشارة لشخص'
            : 'Write a comment… use @ to mention someone'}
          className="min-h-[80px] text-sm pr-10"
          disabled={isPosting}
        />

        {/* Mention picker */}
        {mentionQuery !== null && candidates.length > 0 && (
          <div className="absolute bottom-full mb-1 left-0 z-20 w-72 rounded-md border bg-popover shadow-lg">
            <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b flex items-center gap-1">
              <AtSign className="h-3 w-3" />
              {isAr ? 'إشارة لشخص' : 'Mention someone'}
            </div>
            {candidates.map((u, i) => (
              <button
                key={u.user_id}
                type="button"
                onClick={() => insertMention(u)}
                onMouseEnter={() => setActiveIdx(i)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 text-sm text-left hover:bg-accent',
                  activeIdx === i && 'bg-accent',
                )}
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={u.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[10px]">
                    {(u.full_name ?? u.email ?? '?').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium">{u.full_name ?? '—'}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{u.email}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-2">
          {!forceInternal ? (
            <div className="flex items-center gap-2">
              <Switch
                id="comment-internal"
                checked={internal}
                onCheckedChange={setInternal}
              />
              <Label htmlFor="comment-internal" className="text-xs flex items-center gap-1 cursor-pointer">
                <Lock className="h-3 w-3" />
                {isAr ? 'داخلي فقط' : 'Internal only'}
              </Label>
            </div>
          ) : <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Lock className="h-3 w-3" />
            {isAr ? 'تعليق داخلي' : 'Internal note'}
          </span>}
          <Button size="sm" onClick={submit} disabled={!text.trim() || isPosting}>
            {isPosting
              ? <Loader2 className="h-3.5 w-3.5 animate-spin me-1" />
              : <Send className="h-3.5 w-3.5 me-1" />}
            {isAr ? 'إرسال' : 'Post'}
          </Button>
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1 -mx-2 px-2">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {isAr ? 'لا توجد تعليقات بعد' : 'No comments yet'}
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map(c => (
              <CommentRow
                key={c.id}
                comment={c}
                canManage={c.user_id === user?.id}
                onTogglePin={() => togglePin({ id: c.id, is_pinned: c.is_pinned })}
                onDelete={() => deleteComment(c.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function CommentRow({
  comment, canManage, onTogglePin, onDelete,
}: {
  comment: RecordComment;
  canManage: boolean;
  onTogglePin: () => void;
  onDelete: () => void;
}) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const initials = (comment.user_name ?? '?').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className={cn(
      'group flex gap-3 rounded-md p-2',
      comment.is_pinned && 'bg-warning/5 border border-warning/30',
    )}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{comment.user_name ?? '—'}</span>
          {comment.is_pinned && (
            <Badge variant="outline" className="text-[10px] text-warning border-warning/40">
              <Pin className="h-2.5 w-2.5 me-1" />
              {isAr ? 'مثبت' : 'Pinned'}
            </Badge>
          )}
          {comment.is_internal && (
            <Badge variant="outline" className="text-[10px]">
              <Lock className="h-2.5 w-2.5 me-1" />
              {isAr ? 'داخلي' : 'Internal'}
            </Badge>
          )}
          <span className="text-[11px] text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
        </div>
        <div className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap break-words">
          <RichComment text={comment.comment_text} />
        </div>
      </div>
      <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon" variant="ghost" className="h-6 w-6"
          onClick={onTogglePin}
          aria-label={comment.is_pinned ? 'Unpin' : 'Pin'}
        >
          {comment.is_pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
        </Button>
        {canManage && (
          <Button
            size="icon" variant="ghost"
            className="h-6 w-6 hover:text-destructive"
            onClick={onDelete}
            aria-label="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

/** Renders @[Name](uuid) markers as styled mention chips. */
function RichComment({ text }: { text: string }) {
  const parts: (string | { name: string; id: string })[] = [];
  let last = 0;
  const re = /@\[([^\]]+)\]\(([0-9a-f-]{36})\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push({ name: m[1], id: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));

  return (
    <>
      {parts.map((p, i) =>
        typeof p === 'string'
          ? <span key={i}>{p}</span>
          : (
            <span
              key={i}
              className="inline-flex items-center rounded px-1 py-0.5 mx-0.5 bg-primary/10 text-primary text-[12px] font-medium"
              title={p.id}
            >
              @{p.name}
            </span>
          )
      )}
    </>
  );
}
