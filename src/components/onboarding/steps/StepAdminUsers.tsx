import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Shield, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface UserEntry {
  id: string;
  full_name: string;
  username: string;
  email: string;
  mobile: string;
  password: string;
  role: string;
  is_super_admin: boolean;
}

interface Props {
  data: Record<string, any>;
  onChange: (field: string, value: any) => void;
}

const ROLES = ['Super Admin', 'Admin', 'Finance Manager', 'Sales Manager', 'Warehouse Manager', 'HR Manager', 'Project Manager', 'User', 'Viewer'];

export function StepAdminUsers({ data, onChange }: Props) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [showPw, setShowPw] = useState<Record<string, boolean>>({});

  const users: UserEntry[] = data.users || [{
    id: '1', full_name: '', username: '', email: '', mobile: '', password: '', role: 'Super Admin', is_super_admin: true
  }];

  const updateUser = (id: string, field: string, value: any) => {
    const updated = users.map(u => u.id === id ? { ...u, [field]: value } : u);
    onChange('users', updated);
  };

  const addUser = () => {
    onChange('users', [...users, {
      id: String(Date.now()),
      full_name: '', username: '', email: '', mobile: '', password: '', role: 'User', is_super_admin: false
    }]);
  };

  const removeUser = (id: string) => {
    if (users.length <= 1) return;
    onChange('users', users.filter(u => u.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm">
        <div className="flex items-center gap-2 font-medium text-primary mb-1">
          <Shield className="h-4 w-4" />
          {isAr ? 'ملاحظة أمان' : 'Security Note'}
        </div>
        <p className="text-muted-foreground text-xs">
          {isAr
            ? 'المستخدم الأول يتم تعيينه كمسؤول رئيسي تلقائياً. يمكنك إضافة مستخدمين إضافيين اختيارياً.'
            : 'The first user is automatically designated as the primary administrator. Additional users can be added optionally.'}
        </p>
      </div>

      {users.map((user, idx) => (
        <Card key={user.id}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">
                  {idx === 0 ? (isAr ? 'المسؤول الرئيسي' : 'Primary Administrator') : `${isAr ? 'مستخدم' : 'User'} ${idx + 1}`}
                </CardTitle>
                {user.is_super_admin && <Badge variant="default" className="text-[10px]">Super Admin</Badge>}
              </div>
              {idx > 0 && (
                <Button variant="ghost" size="icon" onClick={() => removeUser(user.id)} className="text-destructive h-8 w-8">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{isAr ? 'الاسم الكامل' : 'Full Name'} <span className="text-destructive">*</span></Label>
              <Input value={user.full_name} onChange={e => updateUser(user.id, 'full_name', e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{isAr ? 'اسم المستخدم' : 'Username'} <span className="text-destructive">*</span></Label>
              <Input value={user.username} onChange={e => updateUser(user.id, 'username', e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{isAr ? 'البريد الإلكتروني' : 'Email'} <span className="text-destructive">*</span></Label>
              <Input type="email" value={user.email} onChange={e => updateUser(user.id, 'email', e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{isAr ? 'رقم الجوال' : 'Mobile Number'}</Label>
              <Input value={user.mobile} onChange={e => updateUser(user.id, 'mobile', e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{isAr ? 'كلمة المرور' : 'Password'} <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input
                  type={showPw[user.id] ? 'text' : 'password'}
                  value={user.password}
                  onChange={e => updateUser(user.id, 'password', e.target.value)}
                  className="h-9 pr-9"
                />
                <button type="button" className="absolute right-2 top-2 text-muted-foreground" onClick={() => setShowPw(p => ({ ...p, [user.id]: !p[user.id] }))}>
                  {showPw[user.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{isAr ? 'الدور' : 'Role'} <span className="text-destructive">*</span></Label>
              <Select value={user.role} onValueChange={v => updateUser(user.id, 'role', v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button variant="outline" onClick={addUser} className="gap-2 w-full">
        <Plus className="h-4 w-4" />
        {isAr ? 'إضافة مستخدم آخر' : 'Add Another User'}
      </Button>
    </div>
  );
}
