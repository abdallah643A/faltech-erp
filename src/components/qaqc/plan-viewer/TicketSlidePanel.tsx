import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { X, Save, MapPin, Camera, Paperclip, MessageSquare, ChevronDown } from 'lucide-react';
import { TICKET_TYPES, TICKET_STATUSES, PRIORITIES, SEVERITIES, TRADES, STATUS_COLORS, PRIORITY_COLORS } from './types';
import { useUpdateQATicket, useUploadQAMedia, useQATicketMedia } from '@/hooks/useQAPlanViewer';
import type { QATicket } from './types';

interface Props {
  ticket: QATicket | null;
  isCreating: boolean;
  hasPinLocation: boolean;
  onClose: () => void;
  onSave: (data: Partial<QATicket>) => void;
  onShowChat: (ticket: QATicket) => void;
  isAr: boolean;
}

const emptyForm = {
  title: '',
  description: '',
  ticket_type: 'defect',
  status: 'open',
  priority: 'medium',
  severity: 'minor',
  building: '',
  floor: '',
  zone: '',
  room: '',
  area: '',
  trade: '',
  assignee_name: '',
  due_date: '',
  subcontractor_name: '',
  progress: 0,
  root_cause: '',
  resolution_notes: '',
};

export function TicketSlidePanel({ ticket, isCreating, hasPinLocation, onClose, onSave, onShowChat, isAr }: Props) {
  const [form, setForm] = useState(() => {
    if (ticket && !isCreating) {
      return {
        title: ticket.title,
        description: ticket.description || '',
        ticket_type: ticket.ticket_type,
        status: ticket.status,
        priority: ticket.priority,
        severity: ticket.severity,
        building: ticket.building || '',
        floor: ticket.floor || '',
        zone: ticket.zone || '',
        room: ticket.room || '',
        area: ticket.area || '',
        trade: ticket.trade || '',
        assignee_name: ticket.assignee_name || '',
        due_date: ticket.due_date || '',
        subcontractor_name: ticket.subcontractor_name || '',
        progress: ticket.progress,
        root_cause: ticket.root_cause || '',
        resolution_notes: ticket.resolution_notes || '',
      };
    }
    return emptyForm;
  });

  const updateTicket = useUpdateQATicket();
  const uploadMedia = useUploadQAMedia();
  const { data: media = [] } = useQATicketMedia(ticket?.id || null);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = () => {
    if (!form.title.trim()) return;
    if (isCreating) {
      onSave(form);
    } else if (ticket) {
      updateTicket.mutate({ id: ticket.id, ...form });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isBefore = false) => {
    if (!e.target.files || !ticket) return;
    for (const file of Array.from(e.target.files)) {
      await uploadMedia.mutateAsync({ ticketId: ticket.id, file, isBefore });
    }
    e.target.value = '';
  };

  return (
    <div className="w-[380px] lg:w-[420px] border-l bg-background shadow-xl flex flex-col z-20 shrink-0 animate-in slide-in-from-right-5 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
          <div>
            <h3 className="text-sm font-semibold">
              {isCreating ? (isAr ? 'إنشاء تذكرة' : 'Create Ticket') : (isAr ? 'تعديل تذكرة' : 'Edit Ticket')}
            </h3>
            {ticket && !isCreating && (
              <p className="text-[10px] text-muted-foreground font-mono">{ticket.ticket_number}</p>
            )}
          </div>
        </div>
        <Button size="sm" onClick={handleSave} disabled={!form.title.trim() || updateTicket.isPending} className="h-8">
          <Save className="h-3.5 w-3.5 mr-1" />{isAr ? 'حفظ' : 'Save'}
        </Button>
      </div>

      {/* Body */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Pin location indicator */}
          {hasPinLocation && isCreating && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <MapPin className="h-4 w-4 text-emerald-600" />
              <span className="text-xs text-emerald-700 dark:text-emerald-400">{isAr ? 'تم تحديد الموقع على المخطط' : 'Location pinned on plan'}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <Label className="text-xs">{isAr ? 'العنوان' : 'Title'} *</Label>
            <Input value={form.title} onChange={e => update('title', e.target.value)} placeholder={isAr ? 'وصف المشكلة...' : 'Describe the issue...'} className="h-9" />
          </div>

          {/* Type + Priority row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{isAr ? 'النوع' : 'Type'}</Label>
              <Select value={form.ticket_type} onValueChange={v => update('ticket_type', v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{TICKET_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize text-xs">{t.replace('_', ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{isAr ? 'الأولوية' : 'Priority'}</Label>
              <Select value={form.priority} onValueChange={v => update('priority', v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize text-xs">{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* Status + Severity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{isAr ? 'الحالة' : 'Status'}</Label>
              <Select value={form.status} onValueChange={v => update('status', v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{TICKET_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize text-xs">{s.replace('_', ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{isAr ? 'الشدة' : 'Severity'}</Label>
              <Select value={form.severity} onValueChange={v => update('severity', v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{SEVERITIES.map(s => <SelectItem key={s} value={s} className="capitalize text-xs">{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* Location section */}
          <div className="border rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{isAr ? 'الموقع' : 'Location'}</p>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-[10px]">{isAr ? 'المبنى' : 'Building'}</Label><Input value={form.building} onChange={e => update('building', e.target.value)} className="h-8 text-xs" /></div>
              <div><Label className="text-[10px]">{isAr ? 'الطابق' : 'Floor'}</Label><Input value={form.floor} onChange={e => update('floor', e.target.value)} className="h-8 text-xs" /></div>
              <div><Label className="text-[10px]">{isAr ? 'المنطقة' : 'Zone'}</Label><Input value={form.zone} onChange={e => update('zone', e.target.value)} className="h-8 text-xs" /></div>
              <div><Label className="text-[10px]">{isAr ? 'الغرفة' : 'Room'}</Label><Input value={form.room} onChange={e => update('room', e.target.value)} className="h-8 text-xs" /></div>
            </div>
          </div>

          {/* Trade + Assignment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{isAr ? 'التخصص' : 'Trade'}</Label>
              <Select value={form.trade} onValueChange={v => update('trade', v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{TRADES.map(t => <SelectItem key={t} value={t} className="capitalize text-xs">{t.replace('_', ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{isAr ? 'المسؤول' : 'Assignee'}</Label>
              <Input value={form.assignee_name} onChange={e => update('assignee_name', e.target.value)} className="h-9 text-xs" placeholder="Name..." />
            </div>
          </div>

          {/* Due date + Subcontractor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</Label>
              <Input type="date" value={form.due_date} onChange={e => update('due_date', e.target.value)} className="h-9 text-xs" />
            </div>
            <div>
              <Label className="text-xs">{isAr ? 'المقاول' : 'Subcontractor'}</Label>
              <Input value={form.subcontractor_name} onChange={e => update('subcontractor_name', e.target.value)} className="h-9 text-xs" placeholder="Company..." />
            </div>
          </div>

          {/* Progress */}
          {!isCreating && (
            <div>
              <div className="flex justify-between">
                <Label className="text-xs">{isAr ? 'التقدم' : 'Progress'}</Label>
                <span className="text-xs text-muted-foreground">{form.progress}%</span>
              </div>
              <Slider value={[form.progress]} onValueChange={([v]) => update('progress', v)} max={100} step={5} className="mt-2" />
            </div>
          )}

          {/* Description */}
          <div>
            <Label className="text-xs">{isAr ? 'الوصف' : 'Description'}</Label>
            <Textarea value={form.description} onChange={e => update('description', e.target.value)} rows={3} className="text-xs" placeholder={isAr ? 'تفاصيل إضافية...' : 'Additional details...'} />
          </div>

          {/* Media section for existing tickets */}
          {!isCreating && ticket && (
            <div className="border rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{isAr ? 'الوسائط' : 'Media'} ({media.length})</p>
              <input ref={photoRef} type="file" accept="image/*,video/*" multiple capture="environment" className="hidden" onChange={e => handleFileUpload(e)} />
              <input ref={fileRef} type="file" multiple className="hidden" onChange={e => handleFileUpload(e)} />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs flex-1" onClick={() => photoRef.current?.click()}>
                  <Camera className="h-3.5 w-3.5 mr-1" />{isAr ? 'صورة' : 'Photo'}
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-xs flex-1" onClick={() => fileRef.current?.click()}>
                  <Paperclip className="h-3.5 w-3.5 mr-1" />{isAr ? 'ملف' : 'File'}
                </Button>
              </div>
              {media.length > 0 && (
                <div className="grid grid-cols-3 gap-1.5 mt-2">
                  {media.map(m => (
                    <div key={m.id} className="aspect-square rounded bg-muted overflow-hidden border">
                      {m.media_type === 'photo' ? (
                        <img src={m.file_url} alt={m.file_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground p-1 text-center">
                          {m.file_name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Root cause + Resolution */}
          {!isCreating && (
            <>
              <div>
                <Label className="text-xs">{isAr ? 'السبب الجذري' : 'Root Cause'}</Label>
                <Input value={form.root_cause} onChange={e => update('root_cause', e.target.value)} className="h-9 text-xs" />
              </div>
              <div>
                <Label className="text-xs">{isAr ? 'ملاحظات الحل' : 'Resolution Notes'}</Label>
                <Textarea value={form.resolution_notes} onChange={e => update('resolution_notes', e.target.value)} rows={2} className="text-xs" />
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Bottom quick actions */}
      <div className="flex items-center gap-1 p-2 border-t bg-muted/30">
        {hasPinLocation && <Badge variant="secondary" className="text-[9px]"><MapPin className="h-3 w-3 mr-0.5" />Pinned</Badge>}
        {!isCreating && ticket && (
          <Button variant="ghost" size="sm" className="h-7 text-xs ml-auto" onClick={() => onShowChat(ticket)}>
            <MessageSquare className="h-3.5 w-3.5 mr-1" />{isAr ? 'محادثة' : 'Chat'}
          </Button>
        )}
      </div>
    </div>
  );
}
