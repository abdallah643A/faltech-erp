import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, CheckCircle, XCircle, Loader2, Eye, EyeOff,
  Server, Database, User, Lock, Save
} from 'lucide-react';
import { useSAPSync } from '@/hooks/useSAPSync';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ConnectionStatus {
  isConnected: boolean;
  lastTested: Date | null;
  error?: string;
}

interface ConnectionFields {
  service_layer_url: string;
  company_db: string;
  username: string;
  password: string;
}

export function SAPConnectionSettings() {
  const { testConnection, isLoading } = useSAPSync();
  const { toast } = useToast();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    lastTested: null,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [fields, setFields] = useState<ConnectionFields>({
    service_layer_url: '',
    company_db: '',
    username: '',
    password: '',
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // Load saved settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('sap_connection_settings')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (data) {
          setFields({
            service_layer_url: data.service_layer_url || '',
            company_db: data.company_db || '',
            username: data.username || '',
            password: data.password || '',
          });
        }
      } catch (err) {
        console.error('Failed to load SAP settings:', err);
      } finally {
        setIsLoadingSettings(false);
      }
    };
    loadSettings();
  }, []);

  const connectionFieldsConfig = [
    { id: 'service_layer_url' as keyof ConnectionFields, label: 'Service Layer URL', placeholder: 'https://your-sap-server:50000/b1s/v1', icon: Server, description: 'SAP B1 Service Layer endpoint URL' },
    { id: 'company_db' as keyof ConnectionFields, label: 'Company Database', placeholder: 'SBODEMOUS', icon: Database, description: 'SAP B1 company database name' },
    { id: 'username' as keyof ConnectionFields, label: 'Username', placeholder: 'manager', icon: User, description: 'SAP B1 user for API access' },
    { id: 'password' as keyof ConnectionFields, label: 'Password', placeholder: 'Enter password', icon: Lock, description: 'SAP B1 user password', isPassword: true },
  ];

  const handleFieldChange = (field: keyof ConnectionFields, value: string) => {
    setFields(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleTestConnection = async () => {
    if (!fields.service_layer_url || !fields.company_db || !fields.username || !fields.password) {
      toast({ title: 'Missing Fields', description: 'Please fill in all connection fields before testing.', variant: 'destructive' });
      return;
    }
    const success = await testConnection();
    setConnectionStatus({
      isConnected: success,
      lastTested: new Date(),
      error: success ? undefined : 'Failed to connect to SAP Business One. Please verify your credentials.',
    });
  };

  const handleSaveSettings = async () => {
    if (!fields.service_layer_url || !fields.company_db || !fields.username || !fields.password) {
      toast({ title: 'Missing Fields', description: 'Please fill in all connection fields.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      // Check if a row already exists
      const { data: existing } = await supabase
        .from('sap_connection_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('sap_connection_settings')
          .update(fields)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('sap_connection_settings')
          .insert(fields);
        if (error) throw error;
      }

      toast({ title: 'Settings Saved', description: 'SAP connection settings have been saved successfully.' });
      setHasChanges(false);
    } catch (err: any) {
      toast({ title: 'Save Failed', description: err.message || 'Failed to save settings.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingSettings) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading settings...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>SAP B1 Connection Settings</CardTitle>
          </div>
          <Badge 
            variant={connectionStatus.isConnected ? 'default' : 'secondary'}
            className={connectionStatus.isConnected ? 'bg-green-500' : ''}
          >
            {connectionStatus.isConnected ? (
              <><CheckCircle className="h-3 w-3 mr-1" /> Connected</>
            ) : (
              <><XCircle className="h-3 w-3 mr-1" /> Not Connected</>
            )}
          </Badge>
        </div>
        <CardDescription>
          Enter your SAP Business One Service Layer connection details to enable synchronization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {connectionFieldsConfig.map((field) => (
            <div key={field.id} className="space-y-1.5">
              <Label htmlFor={field.id} className="flex items-center gap-2 text-xs">
                <field.icon className="h-3.5 w-3.5 text-muted-foreground" />
                {field.label}
              </Label>
              <div className="relative">
                <Input
                  id={field.id}
                  type={field.isPassword && !showPassword ? 'password' : 'text'}
                  placeholder={field.placeholder}
                  value={fields[field.id]}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  className="h-8 text-sm"
                />
                {field.isPassword && (
                  <Button
                    type="button" variant="ghost" size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">{field.description}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-3 border-t">
          <div className="text-xs text-muted-foreground">
            {connectionStatus.lastTested ? (
              <span>Last tested: {connectionStatus.lastTested.toLocaleString()}</span>
            ) : (
              <span>Fill in the fields and test the connection</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSaveSettings} disabled={isSaving || !hasChanges}>
              {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
            <Button size="sm" onClick={handleTestConnection} disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Testing...</>
              ) : (
                <><Server className="h-3.5 w-3.5 mr-1.5" /> Test Connection</>
              )}
            </Button>
          </div>
        </div>

        {connectionStatus.error && (
          <div className="p-2.5 rounded-md bg-destructive/10 text-destructive text-xs">
            <XCircle className="h-3.5 w-3.5 inline mr-1.5" />
            {connectionStatus.error}
          </div>
        )}
        {connectionStatus.isConnected && (
          <div className="p-2.5 rounded-md bg-primary/10 text-primary text-xs">
            <CheckCircle className="h-3.5 w-3.5 inline mr-1.5" />
            Successfully connected to SAP Business One. You can now sync data.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
