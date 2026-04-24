# API Reference

## Edge Functions

All edge functions are deployed to Supabase and accessible via:
```
https://<project-id>.supabase.co/functions/v1/<function-name>
```

### 1. Chat Function
**Endpoint:** `POST /functions/v1/chat`

AI-powered chat assistant for the application.

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "What are my top opportunities?" }
  ]
}
```

**Response:**
```json
{
  "response": "Based on your data, your top opportunities are..."
}
```

### 2. SAP Sync Function
**Endpoint:** `POST /functions/v1/sap-sync`

Synchronizes data with SAP Business One.

**Actions:**

**Test Connection:**
```json
{
  "action": "test_connection"
}
```

**Sync Data:**
```json
{
  "action": "sync",
  "entity": "business_partner",
  "direction": "from_sap",
  "limit": 100
}
```

**Entities:** `business_partner`, `item`, `sales_order`, `incoming_payment`, `ar_invoice`

**Directions:** `to_sap`, `from_sap`, `bidirectional`

### 3. Send Quote Email
**Endpoint:** `POST /functions/v1/send-quote-email`

Sends quote PDF to customer via email.

**Request:**
```json
{
  "quoteId": "uuid",
  "recipientEmail": "customer@example.com",
  "subject": "Your Quote",
  "message": "Please find attached..."
}
```

### 4. WhatsApp Functions

**Send Message:** `POST /functions/v1/send-whatsapp`
```json
{
  "phone": "+966XXXXXXXXX",
  "message": "Hello from Smart Suite"
}
```

**Webhook:** `POST /functions/v1/whatsapp-webhook`
Receives incoming WhatsApp messages.

**WhatsApp Invoice:** `POST /functions/v1/whatsapp-invoice`
Sends formatted invoice details via WhatsApp.

### 5. Activity Summary
**Endpoint:** `POST /functions/v1/summarize-activities`

AI-generated summary of recent activities.

**Request:**
```json
{
  "userId": "uuid",
  "period": "week"
}
```

### 6. Get SAP PDF
**Endpoint:** `POST /functions/v1/get-sap-pdf`

Retrieves PDF documents from SAP.

**Request:**
```json
{
  "docType": "Invoice",
  "docEntry": "12345"
}
```

---

## Supabase Client API

### Authentication

```typescript
import { supabase } from '@/integrations/supabase/client';

// Sign Up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
});

// Sign In
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// Sign Out
await supabase.auth.signOut();

// Get Current User
const { data: { user } } = await supabase.auth.getUser();
```

### Database Operations

**Select:**
```typescript
// Get all leads
const { data, error } = await supabase
  .from('leads')
  .select('*');

// With filters
const { data, error } = await supabase
  .from('leads')
  .select('*')
  .eq('status', 'New')
  .order('created_at', { ascending: false });

// With joins
const { data, error } = await supabase
  .from('employees')
  .select(`
    *,
    department:departments(name),
    position:positions(title)
  `);
```

**Insert:**
```typescript
const { data, error } = await supabase
  .from('leads')
  .insert({
    name: 'John Doe',
    email: 'john@example.com',
    company: 'Acme Inc'
  })
  .select()
  .single();
```

**Update:**
```typescript
const { error } = await supabase
  .from('leads')
  .update({ status: 'Qualified' })
  .eq('id', leadId);
```

**Delete:**
```typescript
const { error } = await supabase
  .from('leads')
  .delete()
  .eq('id', leadId);
```

### Storage

```typescript
// Upload file
const { data, error } = await supabase.storage
  .from('visit-images')
  .upload(`${userId}/${fileName}`, file);

// Get signed URL
const { data } = await supabase.storage
  .from('visit-images')
  .createSignedUrl(filePath, 3600); // 1 hour expiry
```

### Realtime

```typescript
// Subscribe to changes
const channel = supabase
  .channel('leads-changes')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'leads' },
    (payload) => {
      console.log('Change:', payload);
    }
  )
  .subscribe();

// Unsubscribe
supabase.removeChannel(channel);
```

### RPC (Database Functions)

```typescript
// Call database function
const { data, error } = await supabase
  .rpc('get_leave_approval_chain', {
    p_employee_id: employeeId
  });
```

---

## React Query Hooks

All data operations use TanStack Query for caching and state management.

### Pattern:
```typescript
// Query
const { data, isLoading, error } = useQuery({
  queryKey: ['entity-name', filters],
  queryFn: async () => {
    const { data, error } = await supabase.from('table').select('*');
    if (error) throw error;
    return data;
  }
});

// Mutation
const mutation = useMutation({
  mutationFn: async (newData) => {
    const { error } = await supabase.from('table').insert(newData);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['entity-name'] });
    toast({ title: 'Success!' });
  }
});
```

---

## Universal Print & WhatsApp Sharing

### Print System

All transactions support a universal print dialog accessible via row actions:

```typescript
import { UniversalPrintDialog } from '@/components/shared/UniversalPrintDialog';
import { WhatsAppShareDialog } from '@/components/shared/WhatsAppShareDialog';
import { useWhatsAppSharing } from '@/hooks/useWhatsAppSharing';
```

**Supported Actions:**
- **Print** - Opens browser print dialog (supports physical printers)
- **Save as PDF** - Uses browser's "Save as PDF" print destination
- **Send via WhatsApp** - Opens WhatsApp share dialog with pre-formatted message

### WhatsApp Sharing Hook

```typescript
const { shareViaWhatsApp, isSharing } = useWhatsAppSharing();

shareViaWhatsApp({
  phone: '+966XXXXXXXXX',
  documentType: 'AR Invoice',
  documentNumber: 'INV-001',
  customerName: 'Customer',
  total: 1150,
  currency: 'SAR',
});
```

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key | Yes |
| `VITE_SUPABASE_PROJECT_ID` | Project identifier | Yes |

### Edge Function Secrets

| Secret | Description |
|--------|-------------|
| `SUPABASE_URL` | Project URL (auto-set) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `SAP_B1_SERVICE_LAYER_URL` | SAP Service Layer endpoint |
| `SAP_B1_COMPANY_DB` | SAP company database |
| `SAP_B1_USERNAME` | SAP username |
| `SAP_B1_PASSWORD` | SAP password |
| `RESEND_API_KEY` | Email service key |
| `LOVABLE_API_KEY` | AI features key |

