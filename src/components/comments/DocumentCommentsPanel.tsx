import { useState } from 'react';
import { MessageSquare, Send, Edit2, Trash2, AtSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDocumentComments, DocumentComment } from '@/hooks/useDocumentComments';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  documentType: string;
  documentId: string;
  title?: string;
}

function CommentItem({ comment, onEdit, onDelete, isOwner }: {
  comment: DocumentComment;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  isOwner: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const initials = (comment.user_name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const handleSaveEdit = () => {
    if (editText.trim()) {
      onEdit(comment.id, editText);
      setEditing(false);
    }
  };

  return (
    <div className="flex gap-2.5 p-3 hover:bg-muted/30 transition-colors group">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold">{comment.user_name || 'Unknown'}</span>
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
          {comment.is_edited && <Badge variant="outline" className="text-[9px] h-4 px-1">edited</Badge>}
        </div>
        {editing ? (
          <div className="mt-1 space-y-1">
            <Textarea value={editText} onChange={e => setEditText(e.target.value)} className="min-h-[60px] text-xs" />
            <div className="flex gap-1">
              <Button size="sm" className="h-6 text-[10px]" onClick={handleSaveEdit}>Save</Button>
              <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{comment.content}</p>
        )}
        {isOwner && !editing && (
          <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setEditing(true)}>
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onDelete(comment.id)}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function DocumentCommentsPanel({ documentType, documentId, title }: Props) {
  const { comments, isLoading, addComment, editComment, deleteComment } = useDocumentComments(documentType, documentId);
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    // Extract @mentions (simple pattern: @[name](uid))
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(newComment)) !== null) {
      mentions.push(match[2]);
    }
    addComment.mutate({ content: newComment, mentions }, {
      onSuccess: () => setNewComment(''),
    });
  };

  return (
    <div className="border rounded-lg bg-card">
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{title || 'Comments'}</span>
        <Badge variant="secondary" className="text-[10px] h-4 px-1">{comments.length}</Badge>
      </div>
      <ScrollArea className="max-h-[300px]">
        {comments.length === 0 ? (
          <p className="text-xs text-muted-foreground p-4 text-center">No comments yet. Start the conversation!</p>
        ) : (
          comments.map(c => (
            <CommentItem
              key={c.id}
              comment={c}
              isOwner={c.user_id === user?.id}
              onEdit={(id, content) => editComment.mutate({ id, content })}
              onDelete={id => deleteComment.mutate(id)}
            />
          ))
        )}
      </ScrollArea>
      <div className="p-2 border-t flex gap-2">
        <Textarea
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="Write a comment... Use @name to mention"
          className="min-h-[40px] text-xs flex-1 resize-none"
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(); }}
        />
        <Button size="icon" className="h-10 w-10 shrink-0" onClick={handleSubmit} disabled={!newComment.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
