import { useState } from "react";
import { useCRMTemplates, useUpsertTemplate } from "@/hooks/useCRMLifecycle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Loader2, Mail, MessageSquare, Smartphone, Bell } from "lucide-react";

const channelIcons: Record<string, any> = { email: Mail, whatsapp: MessageSquare, sms: Smartphone, in_app: Bell };

export default function CRMMessageTemplates() {
  const [channel, setChannel] = useState<string | undefined>(undefined);
  const [language, setLanguage] = useState("en");
  const { data: templates, isLoading } = useCRMTemplates({ channel, language });
  const upsert = useUpsertTemplate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    template_code: "", template_name: "", channel: "email", category: "general",
    language: "en", subject: "", body: "", region: "",
  });

  const handleSave = async () => {
    if (!form.template_code || !form.template_name || !form.body) return;
    await upsert.mutateAsync(form);
    setOpen(false);
    setForm({ template_code: "", template_name: "", channel: "email", category: "general", language: "en", subject: "", body: "", region: "" });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Multilingual Message Templates</h1>
          <p className="text-muted-foreground mt-1">Email, WhatsApp & SMS templates in EN / AR / UR / HI.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Template</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Create Message Template</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Code *</Label><Input value={form.template_code} onChange={e => setForm({ ...form, template_code: e.target.value })} /></div>
                <div><Label>Name *</Label><Input value={form.template_name} onChange={e => setForm({ ...form, template_name: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Channel</Label>
                  <Select value={form.channel} onValueChange={v => setForm({ ...form, channel: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="in_app">In-App</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Language</Label>
                  <Select value={form.language} onValueChange={v => setForm({ ...form, language: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">العربية</SelectItem>
                      <SelectItem value="ur">اردو</SelectItem>
                      <SelectItem value="hi">हिन्दी</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Category</Label><Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
              </div>
              {form.channel === "email" && (
                <div><Label>Subject</Label><Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></div>
              )}
              <div>
                <Label>Body * <span className="text-xs text-muted-foreground">(use {"{{variable}}"})</span></Label>
                <Textarea rows={6} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} dir={form.language === "ar" || form.language === "ur" ? "rtl" : "ltr"} />
              </div>
              <div><Label>Region (optional)</Label><Input value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} placeholder="SA, AE, IN…" /></div>
              <Button onClick={handleSave} disabled={upsert.isPending} className="w-full">
                {upsert.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Tabs value={language} onValueChange={setLanguage}>
          <TabsList>
            <TabsTrigger value="en">English</TabsTrigger>
            <TabsTrigger value="ar">العربية</TabsTrigger>
            <TabsTrigger value="ur">اردو</TabsTrigger>
            <TabsTrigger value="hi">हिन्दी</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={channel ?? "all"} onValueChange={v => setChannel(v === "all" ? undefined : v)}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Channel" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All channels</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="in_app">In-App</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates?.map(t => {
            const Icon = channelIcons[t.channel] || Mail;
            return (
              <Card key={t.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Icon className="h-4 w-4" /> {t.template_name}
                    </CardTitle>
                    <div className="flex gap-1">
                      <Badge variant="outline">{t.language.toUpperCase()}</Badge>
                      {t.is_default && <Badge>Default</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {t.subject && <p className="text-sm font-medium mb-2">{t.subject}</p>}
                  <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap" dir={t.language === "ar" || t.language === "ur" ? "rtl" : "ltr"}>
                    {t.body}
                  </p>
                  <div className="flex gap-2 mt-3 text-xs text-muted-foreground">
                    <span>{t.category}</span>
                    {t.region && <span>• {t.region}</span>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {templates?.length === 0 && (
            <p className="col-span-full text-center text-muted-foreground py-8">No templates yet for this language.</p>
          )}
        </div>
      )}
    </div>
  );
}
