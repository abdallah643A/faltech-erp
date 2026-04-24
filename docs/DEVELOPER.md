# Developer Documentation

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS + shadcn/ui |
| State Management | TanStack Query (React Query) |
| Routing | React Router v6 |
| Backend | Supabase (PostgreSQL + Edge Functions) |
| Authentication | Supabase Auth |

## Project Structure

```
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/              # shadcn/ui base components
│   │   ├── layout/          # Layout components (Header, Sidebar, MainLayout)
│   │   ├── auth/            # Authentication components
│   │   ├── hr/              # HR module components
│   │   ├── pm/              # Project Management components
│   │   ├── leads/           # Leads management components
│   │   ├── material-request/# Material Request components
│   │   ├── visits/          # Visit tracking components
│   │   └── ...
│   ├── pages/               # Page components (routes)
│   │   ├── hr/              # HR module pages
│   │   ├── pm/              # Project Management pages
│   │   └── ...
│   ├── hooks/               # Custom React hooks
│   │   ├── useLeads.ts      # Leads data operations
│   │   ├── useEmployees.ts  # Employee management
│   │   ├── useMaterialRequests.ts
│   │   └── ...
│   ├── contexts/            # React Context providers
│   │   ├── AuthContext.tsx  # Authentication state
│   │   └── LanguageContext.tsx # i18n support
│   ├── integrations/
│   │   └── supabase/        # Supabase client & types
│   └── lib/                 # Utility functions
├── supabase/
│   ├── functions/           # Edge Functions (Deno)
│   │   ├── chat/            # AI chat functionality
│   │   ├── sap-sync/        # SAP B1 integration
│   │   ├── send-whatsapp/   # WhatsApp messaging
│   │   └── ...
│   └── migrations/          # Database migrations
└── public/                  # Static assets
```

## Core Modules

### 1. Authentication & Authorization

**Files:**
- `src/contexts/AuthContext.tsx` - Auth state management
- `src/components/auth/ProtectedRoute.tsx` - Route protection
- `src/pages/Login.tsx`, `src/pages/Signup.tsx`

**Roles:**
- `admin` - Full system access
- `manager` - Department management
- `sales_rep` - Sales operations
- `user` - Basic access

**Usage:**
```typescript
import { useAuth } from '@/contexts/AuthContext';

const { user, hasRole, hasAnyRole } = useAuth();

// Check role
if (hasRole('admin')) { /* admin only */ }
if (hasAnyRole(['admin', 'manager'])) { /* admin or manager */ }
```

### 2. CRM Module

**Tables:** `leads`, `opportunities`, `activities`, `business_partners`

**Hooks:**
- `useLeads()` - Lead management
- `useOpportunities()` - Opportunity pipeline
- `useActivities()` - Activity tracking
- `useBusinessPartners()` - Customer/vendor management

### 3. HR Module

**Tables:** `employees`, `departments`, `positions`, `leave_requests`, `attendance`, `payroll_periods`, `payslips`, `performance_reviews`

**Features:**
- Employee management with hierarchy
- Leave request workflow (3-level approval)
- Attendance tracking with geolocation
- Payroll processing
- Performance reviews

### 4. Universal Print & WhatsApp Sharing System

**Files:**
- `src/components/shared/UniversalPrintLayout.tsx` - A4 print layout engine
- `src/components/shared/UniversalPrintDialog.tsx` - Print preview with Print/PDF/WhatsApp actions
- `src/components/shared/WhatsAppShareDialog.tsx` - WhatsApp message composer
- `src/hooks/useWhatsAppSharing.ts` - WhatsApp sharing logic

**Supported Document Types:**
- AR Invoices, AR Credit Memos, AR Returns
- Sales Orders, Quotes, Delivery Notes
- Purchase Orders, AP Invoices, Goods Receipts
- Incoming Payments, Material Requests
- And all other system transactions

**Features:**
- Professional A4 print layout with company branding
- RTL/LTR support (Arabic/English)
- Dynamic columns (tax, discount, warehouse toggles)
- Browser-based PDF generation (Print → Save as PDF)
- Direct WhatsApp sharing via edge function or WhatsApp Web fallback
- Row-level "Send to WhatsApp" action in all transaction tables

**Usage:**
```typescript
import { UniversalPrintDialog } from '@/components/shared/UniversalPrintDialog';

<UniversalPrintDialog
  open={printOpen}
  onOpenChange={setPrintOpen}
  documentType="AR Invoice"
  documentNumber="INV-001"
  partnerName="Customer Name"
  lines={invoiceLines}
  subtotal={1000}
  taxAmount={150}
  total={1150}
/>
```

### 4. Material Request Module

**Tables:** `material_requests`, `material_request_lines`, `mr_workflow_settings`, `mr_approvers`

**Workflow:**
1. Draft → Pending (submit)
2. Level 1 Approval → Level 2 Approval → Level 3 Approval
3. Fully Approved / Rejected

**Hook:** `useMRWorkflow()` - Manages approval state transitions

### 5. SAP B1 Integration

**Edge Function:** `supabase/functions/sap-sync/`

**Synced Entities:**
- Business Partners
- Items
- Sales Orders
- AR Invoices
- Incoming Payments

**Configuration Secrets:**
- `SAP_B1_SERVICE_LAYER_URL`
- `SAP_B1_COMPANY_DB`
- `SAP_B1_USERNAME`
- `SAP_B1_PASSWORD`

### 6. Project Management

**Tables:** `projects`, `project_tasks`, `project_milestones`, `project_budgets`

**Views:**
- Project list
- Kanban board
- Gantt chart

## Database Design Patterns

### Row-Level Security (RLS)

All tables use RLS policies. Common patterns:

```sql
-- User can view own records or all if admin/manager
CREATE POLICY "view_policy" ON table_name
FOR SELECT USING (
  (owner_id = auth.uid()) OR 
  has_any_role(auth.uid(), ARRAY['admin', 'manager'])
);
```

### Helper Functions

```sql
-- Check if user has a specific role
has_role(user_id uuid, role app_role) → boolean

-- Check if user has any of the specified roles
has_any_role(user_id uuid, roles app_role[]) → boolean

-- Check if user is HR manager
is_hr_manager(user_id uuid) → boolean
```

## Adding New Features

### 1. Create Database Table

```sql
-- Use migration tool
CREATE TABLE public.new_feature (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.new_feature ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own records"
ON public.new_feature FOR ALL
USING (user_id = auth.uid());
```

### 2. Create Hook

```typescript
// src/hooks/useNewFeature.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useNewFeature() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['new-feature'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('new_feature')
        .select('*');
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newItem) => {
      const { error } = await supabase
        .from('new_feature')
        .insert(newItem);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['new-feature'] });
    },
  });

  return { data, isLoading, create: createMutation.mutate };
}
```

### 3. Create Page Component

```typescript
// src/pages/NewFeature.tsx
import { useNewFeature } from '@/hooks/useNewFeature';

export default function NewFeature() {
  const { data, isLoading } = useNewFeature();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">New Feature</h1>
      {/* Component content */}
    </div>
  );
}
```

### 4. Add Route

```typescript
// src/App.tsx
import NewFeature from './pages/NewFeature';

// Add to Routes
<Route path="/new-feature" element={<NewFeature />} />
```

## Internationalization

The app supports Arabic (RTL) and English:

```typescript
import { useLanguage } from '@/contexts/LanguageContext';

const { language, setLanguage, translations } = useLanguage();

// Usage
<span>{language === 'ar' ? 'عربي' : 'English'}</span>
```

## Testing

```bash
# Run tests
npm test

# Run specific test file
npm test -- src/test/example.test.ts
```

## Code Style

- Use TypeScript strict mode
- Follow React hooks rules
- Use shadcn/ui components for UI
- Apply Tailwind CSS for styling
- Use semantic color tokens from design system

