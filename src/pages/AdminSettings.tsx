import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Download, FileText, Book, Database, Code } from 'lucide-react';

// Documentation content
const INSTALLATION_MD = `# Installation Guide

## Prerequisites

- Node.js 18+ (recommended: use nvm)
- npm or bun package manager
- Git

## Getting the Code

### Option 1: Clone from GitHub
1. Connect your Lovable project to GitHub (Settings → Connectors → GitHub)
2. Clone the repository:
\`\`\`bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
\`\`\`

### Option 2: Download from Lovable
1. Go to your Lovable project
2. Click on Settings → GitHub → Transfer to GitHub
3. Clone the transferred repository

## Local Development Setup

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev
\`\`\`

The app will be available at \`http://localhost:8080\`

## Environment Variables

Create a \`.env\` file in the root directory:

\`\`\`env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
\`\`\`

## Production Deployment

### Option 1: Self-Hosting with Docker

Create a \`Dockerfile\`:
\`\`\`dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
\`\`\`

Create \`nginx.conf\`:
\`\`\`nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    server {
        listen 80;
        server_name _;
        root /usr/share/nginx/html;
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }

        location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
\`\`\`

Build and run:
\`\`\`bash
docker build -t smart-suite .
docker run -p 80:80 smart-suite
\`\`\`

### Option 2: Static Hosting (Vercel, Netlify, etc.)

\`\`\`bash
# Build production bundle
npm run build

# The dist/ folder contains static files to deploy
\`\`\`

### Option 3: VPS/Cloud Server

1. **Build the application:**
\`\`\`bash
npm run build
\`\`\`

2. **Upload dist/ folder to your server**

3. **Configure Nginx:**
\`\`\`nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/smart-suite;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
\`\`\`

4. **SSL with Let's Encrypt:**
\`\`\`bash
sudo certbot --nginx -d your-domain.com
\`\`\`

## Supabase Backend Setup

### Option 1: Use Existing Lovable Cloud (Recommended)
- Your backend is already configured via Lovable Cloud
- Edge functions are automatically deployed

### Option 2: Self-Hosted Supabase

1. **Install Supabase CLI:**
\`\`\`bash
npm install -g supabase
\`\`\`

2. **Start local Supabase:**
\`\`\`bash
supabase start
\`\`\`

3. **Apply migrations:**
\`\`\`bash
supabase db push
\`\`\`

4. **Deploy Edge Functions:**
\`\`\`bash
supabase functions deploy
\`\`\`

### Option 3: New Supabase Project

1. Create project at https://supabase.com
2. Run migrations from \`supabase/migrations/\` folder
3. Update \`.env\` with new credentials
4. Deploy edge functions

## Changing Public IP / Domain

1. Update \`.env\` file with new Supabase URL if applicable
2. Update CORS settings in Supabase dashboard
3. Rebuild the application:
\`\`\`bash
npm run build
\`\`\`

## Troubleshooting

### Common Issues

1. **CORS Errors**: Add your new domain to Supabase CORS settings
2. **Auth Redirect Issues**: Update redirect URLs in Supabase Auth settings
3. **Edge Function Errors**: Check function logs in Supabase dashboard
`;

const DEVELOPER_MD = `# Developer Documentation

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

\`\`\`
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
\`\`\`

## Core Modules

### 1. Authentication & Authorization

**Files:**
- \`src/contexts/AuthContext.tsx\` - Auth state management
- \`src/components/auth/ProtectedRoute.tsx\` - Route protection
- \`src/pages/Login.tsx\`, \`src/pages/Signup.tsx\`

**Roles:**
- \`admin\` - Full system access
- \`manager\` - Department management
- \`sales_rep\` - Sales operations
- \`user\` - Basic access

**Usage:**
\`\`\`typescript
import { useAuth } from '@/contexts/AuthContext';

const { user, hasRole, hasAnyRole } = useAuth();

// Check role
if (hasRole('admin')) { /* admin only */ }
if (hasAnyRole(['admin', 'manager'])) { /* admin or manager */ }
\`\`\`

### 2. CRM Module

**Tables:** \`leads\`, \`opportunities\`, \`activities\`, \`business_partners\`

**Hooks:**
- \`useLeads()\` - Lead management
- \`useOpportunities()\` - Opportunity pipeline
- \`useActivities()\` - Activity tracking
- \`useBusinessPartners()\` - Customer/vendor management

### 3. HR Module

**Tables:** \`employees\`, \`departments\`, \`positions\`, \`leave_requests\`, \`attendance\`, \`payroll_periods\`, \`payslips\`, \`performance_reviews\`

**Features:**
- Employee management with hierarchy
- Leave request workflow (3-level approval)
- Attendance tracking with geolocation
- Payroll processing
- Performance reviews

### 4. Material Request Module

**Tables:** \`material_requests\`, \`material_request_lines\`, \`mr_workflow_settings\`, \`mr_approvers\`

**Workflow:**
1. Draft → Pending (submit)
2. Level 1 Approval → Level 2 Approval → Level 3 Approval
3. Fully Approved / Rejected

**Hook:** \`useMRWorkflow()\` - Manages approval state transitions

### 5. SAP B1 Integration

**Edge Function:** \`supabase/functions/sap-sync/\`

**Synced Entities:**
- Business Partners
- Items
- Sales Orders
- AR Invoices
- Incoming Payments

**Configuration Secrets:**
- \`SAP_B1_SERVICE_LAYER_URL\`
- \`SAP_B1_COMPANY_DB\`
- \`SAP_B1_USERNAME\`
- \`SAP_B1_PASSWORD\`

### 6. Project Management

**Tables:** \`projects\`, \`project_tasks\`, \`project_milestones\`, \`project_budgets\`

**Views:**
- Project list
- Kanban board
- Gantt chart

## Database Design Patterns

### Row-Level Security (RLS)

All tables use RLS policies. Common patterns:

\`\`\`sql
-- User can view own records or all if admin/manager
CREATE POLICY "view_policy" ON table_name
FOR SELECT USING (
  (owner_id = auth.uid()) OR 
  has_any_role(auth.uid(), ARRAY['admin', 'manager'])
);
\`\`\`

### Helper Functions

\`\`\`sql
-- Check if user has a specific role
has_role(user_id uuid, role app_role) → boolean

-- Check if user has any of the specified roles
has_any_role(user_id uuid, roles app_role[]) → boolean

-- Check if user is HR manager
is_hr_manager(user_id uuid) → boolean
\`\`\`

## Adding New Features

### 1. Create Database Table

\`\`\`sql
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
\`\`\`

### 2. Create Hook

\`\`\`typescript
// src/hooks/useNewFeature.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useNewFeature() {
  const { t } = useLanguage();

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
\`\`\`

### 3. Create Page Component

\`\`\`typescript
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
\`\`\`

### 4. Add Route

\`\`\`typescript
// src/App.tsx
import NewFeature from './pages/NewFeature';

// Add to Routes
<Route path="/new-feature" element={<NewFeature />} />
\`\`\`

## Internationalization

The app supports Arabic (RTL) and English:

\`\`\`typescript
import { useLanguage } from '@/contexts/LanguageContext';

const { language, setLanguage, translations } = useLanguage();

// Usage
<span>{language === 'ar' ? 'عربي' : 'English'}</span>
\`\`\`

## Testing

\`\`\`bash
# Run tests
npm test

# Run specific test file
npm test -- src/test/example.test.ts
\`\`\`

## Code Style

- Use TypeScript strict mode
- Follow React hooks rules
- Use shadcn/ui components for UI
- Apply Tailwind CSS for styling
- Use semantic color tokens from design system
`;

const DATABASE_DIAGRAM_MD = `# Database Schema Diagram

## Entity Relationship Diagram

\`\`\`mermaid
erDiagram
    %% Authentication & Users
    profiles ||--o{ user_roles : has
    profiles {
        uuid id PK
        uuid user_id FK
        text email
        text full_name
        text avatar_url
        text department
        timestamp created_at
    }
    user_roles {
        uuid id PK
        uuid user_id FK
        app_role role
        timestamp created_at
    }

    %% CRM Module
    leads ||--o{ activities : has
    leads {
        uuid id PK
        text name
        text email
        text company
        text phone
        text status
        uuid assigned_to
        integer score
        text source
        timestamp last_contact
    }

    opportunities ||--o{ activities : has
    opportunities {
        uuid id PK
        text name
        text company
        numeric value
        text stage
        integer probability
        date expected_close
        uuid owner_id
        uuid business_partner_id FK
    }

    activities {
        uuid id PK
        text type
        text subject
        text description
        text status
        uuid lead_id FK
        uuid opportunity_id FK
        uuid business_partner_id FK
        uuid assigned_to
        date due_date
    }

    business_partners ||--o{ opportunities : has
    business_partners ||--o{ activities : has
    business_partners ||--o{ sales_orders : places
    business_partners ||--o{ ar_invoices : receives
    business_partners {
        uuid id PK
        text card_code
        text card_name
        text card_type
        text email
        text phone
        text mobile
        numeric balance
        numeric credit_limit
        text billing_address
        text shipping_address
    }

    %% Sales Module
    sales_orders ||--o{ sales_order_lines : contains
    sales_orders {
        uuid id PK
        integer doc_num
        text customer_code
        text customer_name
        uuid customer_id FK
        date doc_date
        date doc_due_date
        numeric total
        text status
    }

    sales_order_lines {
        uuid id PK
        uuid order_id FK
        integer line_num
        text item_code
        text description
        numeric quantity
        numeric unit_price
        numeric line_total
    }

    ar_invoices ||--o{ ar_invoice_lines : contains
    ar_invoices {
        uuid id PK
        integer doc_num
        text customer_code
        text customer_name
        uuid customer_id FK
        date doc_date
        numeric total
        numeric balance_due
        text status
    }

    items {
        uuid id PK
        text item_code
        text description
        text item_type
        text item_group
        numeric default_price
        numeric in_stock
        text warehouse
    }

    %% HR Module
    departments ||--o{ employees : contains
    departments {
        uuid id PK
        text name
        text code
        text description
        uuid manager_id FK
        uuid parent_department_id FK
    }

    positions ||--o{ employees : assigned_to
    positions {
        uuid id PK
        text title
        text code
        text grade
        numeric min_salary
        numeric max_salary
        uuid department_id FK
    }

    employees ||--o{ leave_requests : submits
    employees ||--o{ attendance : records
    employees ||--o{ payslips : receives
    employees ||--o{ performance_reviews : has
    employees {
        uuid id PK
        text employee_code
        text first_name
        text last_name
        text email
        text phone
        date hire_date
        uuid department_id FK
        uuid position_id FK
        uuid manager_id FK
        numeric basic_salary
        text employment_status
    }

    leave_types ||--o{ leave_requests : categorizes
    leave_types {
        uuid id PK
        text name
        text code
        integer default_days_per_year
        boolean is_paid
    }

    leave_requests {
        uuid id PK
        uuid employee_id FK
        uuid leave_type_id FK
        date start_date
        date end_date
        integer total_days
        text status
        text approval_stage
        uuid direct_manager_id FK
        uuid dept_manager_id FK
        uuid hr_manager_id FK
    }

    attendance {
        uuid id PK
        uuid employee_id FK
        date attendance_date
        time check_in_time
        time check_out_time
        numeric work_hours
        text status
        text check_in_location
    }

    payroll_periods ||--o{ payslips : generates
    payroll_periods {
        uuid id PK
        text name
        date start_date
        date end_date
        date pay_date
        text status
        numeric total_gross
        numeric total_net
    }

    payslips {
        uuid id PK
        uuid employee_id FK
        uuid payroll_period_id FK
        numeric basic_salary
        numeric gross_salary
        numeric net_salary
        numeric total_deductions
        text status
    }

    performance_cycles ||--o{ performance_goals : contains
    performance_cycles ||--o{ performance_reviews : schedules
    performance_cycles {
        uuid id PK
        text name
        integer year
        date start_date
        date end_date
        text status
    }

    performance_goals {
        uuid id PK
        uuid employee_id FK
        uuid cycle_id FK
        text title
        text description
        text status
        numeric weight
    }

    performance_reviews {
        uuid id PK
        uuid employee_id FK
        uuid reviewer_id FK
        uuid cycle_id FK
        integer overall_rating
        text status
    }

    %% Material Requests
    material_requests ||--o{ material_request_lines : contains
    material_requests {
        uuid id PK
        text mr_number
        date request_date
        text status
        text department
        text project_name
        text requested_by_name
        uuid approved_by_1_id
        uuid approved_by_2_id
        uuid approved_by_3_id
    }

    material_request_lines {
        uuid id PK
        uuid material_request_id FK
        integer line_num
        text part_no
        text description
        numeric quantity
        text unit_of_measurement
    }

    mr_workflow_settings {
        uuid id PK
        integer approval_level
        app_role role_required
        text position_title
        boolean is_active
    }

    mr_approvers {
        uuid id PK
        uuid user_id FK
        integer approval_level
        text user_name
        text user_email
        boolean is_active
    }

    %% Project Management
    projects ||--o{ project_tasks : contains
    projects ||--o{ project_milestones : has
    projects ||--o{ project_budgets : allocates
    projects {
        uuid id PK
        text name
        text description
        text status
        date start_date
        date end_date
        numeric budget
        uuid manager_id FK
    }

    project_tasks {
        uuid id PK
        uuid project_id FK
        text title
        text description
        text status
        text priority
        uuid assignee_id FK
        date due_date
    }

    project_milestones {
        uuid id PK
        uuid project_id FK
        text name
        date target_date
        text status
    }

    project_budgets {
        uuid id PK
        uuid project_id FK
        text category
        numeric planned_amount
        numeric actual_amount
    }
\`\`\`

## Table Relationships Summary

### One-to-Many Relationships
- **profiles → user_roles**: A user can have multiple roles
- **departments → employees**: A department contains many employees
- **employees → leave_requests**: An employee can submit many leave requests
- **payroll_periods → payslips**: A payroll period generates many payslips
- **projects → project_tasks**: A project contains many tasks
- **material_requests → material_request_lines**: A request has many line items

### Key Foreign Keys
- \`employees.department_id\` → \`departments.id\`
- \`employees.position_id\` → \`positions.id\`
- \`employees.manager_id\` → \`employees.id\` (self-reference)
- \`leave_requests.employee_id\` → \`employees.id\`
- \`opportunities.business_partner_id\` → \`business_partners.id\`

## RLS Policy Structure

All tables implement Row-Level Security with common patterns:

1. **User-owned data**: Users can only access their own records
2. **Role-based access**: Admins and managers can access broader data sets
3. **Department-scoped**: HR managers can access department-level data
`;

const API_REFERENCE_MD = `# API Reference

## Edge Functions

All edge functions are deployed to Supabase and accessible via:
\`\`\`
https://<project-id>.supabase.co/functions/v1/<function-name>
\`\`\`

### 1. Chat Function
**Endpoint:** \`POST /functions/v1/chat\`

AI-powered chat assistant for the application.

**Request:**
\`\`\`json
{
  "messages": [
    { "role": "user", "content": "What are my top opportunities?" }
  ]
}
\`\`\`

**Response:**
\`\`\`json
{
  "response": "Based on your data, your top opportunities are..."
}
\`\`\`

### 2. SAP Sync Function
**Endpoint:** \`POST /functions/v1/sap-sync\`

Synchronizes data with SAP Business One.

**Actions:**

**Test Connection:**
\`\`\`json
{
  "action": "test_connection"
}
\`\`\`

**Sync Data:**
\`\`\`json
{
  "action": "sync",
  "entity": "business_partner",
  "direction": "from_sap",
  "limit": 100
}
\`\`\`

**Entities:** \`business_partner\`, \`item\`, \`sales_order\`, \`incoming_payment\`, \`ar_invoice\`

**Directions:** \`to_sap\`, \`from_sap\`, \`bidirectional\`

### 3. Send Quote Email
**Endpoint:** \`POST /functions/v1/send-quote-email\`

Sends quote PDF to customer via email.

**Request:**
\`\`\`json
{
  "quoteId": "uuid",
  "recipientEmail": "customer@example.com",
  "subject": "Your Quote",
  "message": "Please find attached..."
}
\`\`\`

### 4. WhatsApp Functions

**Send Message:** \`POST /functions/v1/send-whatsapp\`
\`\`\`json
{
  "phone": "+966XXXXXXXXX",
  "message": "Hello from Smart Suite"
}
\`\`\`

**Webhook:** \`POST /functions/v1/whatsapp-webhook\`
Receives incoming WhatsApp messages.

### 5. Activity Summary
**Endpoint:** \`POST /functions/v1/summarize-activities\`

AI-generated summary of recent activities.

**Request:**
\`\`\`json
{
  "userId": "uuid",
  "period": "week"
}
\`\`\`

### 6. Get SAP PDF
**Endpoint:** \`POST /functions/v1/get-sap-pdf\`

Retrieves PDF documents from SAP.

**Request:**
\`\`\`json
{
  "docType": "Invoice",
  "docEntry": "12345"
}
\`\`\`

---

## Supabase Client API

### Authentication

\`\`\`typescript
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
\`\`\`

### Database Operations

**Select:**
\`\`\`typescript
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
  .select(\`
    *,
    department:departments(name),
    position:positions(title)
  \`);
\`\`\`

**Insert:**
\`\`\`typescript
const { data, error } = await supabase
  .from('leads')
  .insert({
    name: 'John Doe',
    email: 'john@example.com',
    company: 'Acme Inc'
  })
  .select()
  .single();
\`\`\`

**Update:**
\`\`\`typescript
const { error } = await supabase
  .from('leads')
  .update({ status: 'Qualified' })
  .eq('id', leadId);
\`\`\`

**Delete:**
\`\`\`typescript
const { error } = await supabase
  .from('leads')
  .delete()
  .eq('id', leadId);
\`\`\`

### Storage

\`\`\`typescript
// Upload file
const { data, error } = await supabase.storage
  .from('visit-images')
  .upload(\`\${userId}/\${fileName}\`, file);

// Get signed URL
const { data } = await supabase.storage
  .from('visit-images')
  .createSignedUrl(filePath, 3600); // 1 hour expiry
\`\`\`

### Realtime

\`\`\`typescript
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
\`\`\`

### RPC (Database Functions)

\`\`\`typescript
// Call database function
const { data, error } = await supabase
  .rpc('get_leave_approval_chain', {
    p_employee_id: employeeId
  });
\`\`\`

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| \`VITE_SUPABASE_URL\` | Supabase project URL | Yes |
| \`VITE_SUPABASE_PUBLISHABLE_KEY\` | Supabase anon key | Yes |
| \`VITE_SUPABASE_PROJECT_ID\` | Project identifier | Yes |

### Edge Function Secrets

| Secret | Description |
|--------|-------------|
| \`SUPABASE_URL\` | Project URL (auto-set) |
| \`SUPABASE_SERVICE_ROLE_KEY\` | Service role key |
| \`SAP_B1_SERVICE_LAYER_URL\` | SAP Service Layer endpoint |
| \`SAP_B1_COMPANY_DB\` | SAP company database |
| \`SAP_B1_USERNAME\` | SAP username |
| \`SAP_B1_PASSWORD\` | SAP password |
| \`RESEND_API_KEY\` | Email service key |
| \`LOVABLE_API_KEY\` | AI features key |
`;

const documentationFiles = [
  {
    id: 'installation',
    title: 'Installation Guide',
    titleAr: 'دليل التثبيت',
    description: 'Server deployment instructions including Docker, Nginx, VPS setup',
    descriptionAr: 'تعليمات نشر الخادم بما في ذلك Docker و Nginx وإعداد VPS',
    icon: FileText,
    filename: 'INSTALLATION.md',
    content: INSTALLATION_MD,
  },
  {
    id: 'developer',
    title: 'Developer Documentation',
    titleAr: 'توثيق المطور',
    description: 'Technical architecture, modules, patterns, and coding guidelines',
    descriptionAr: 'البنية التقنية والوحدات والأنماط وإرشادات البرمجة',
    icon: Code,
    filename: 'DEVELOPER.md',
    content: DEVELOPER_MD,
  },
  {
    id: 'database',
    title: 'Database Diagram',
    titleAr: 'مخطط قاعدة البيانات',
    description: 'Complete ERD with all tables, relationships, and RLS policies',
    descriptionAr: 'مخطط ERD كامل مع جميع الجداول والعلاقات وسياسات RLS',
    icon: Database,
    filename: 'DATABASE_DIAGRAM.md',
    content: DATABASE_DIAGRAM_MD,
  },
  {
    id: 'api',
    title: 'API Reference',
    titleAr: 'مرجع API',
    description: 'Edge functions, Supabase client operations, environment variables',
    descriptionAr: 'وظائف Edge وعمليات عميل Supabase ومتغيرات البيئة',
    icon: Book,
    filename: 'API_REFERENCE.md',
    content: API_REFERENCE_MD,
  },
];

export default function AdminSettings() {
  const { direction, language } = useLanguage();
  const { hasRole } = useAuth();

  const handleDownload = (filename: string, content: string) => {
  const { t } = useLanguage();

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
    documentationFiles.forEach((doc) => {
      setTimeout(() => {
        handleDownload(doc.filename, doc.content);
      }, 100);
    });
  };

  if (!hasRole('admin')) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold">
            {language === 'ar' ? 'الوصول مرفوض' : 'Access Denied'}
          </h2>
          <p className="text-muted-foreground">
            {language === 'ar'
              ? 'تحتاج صلاحيات المسؤول للوصول إلى هذه الصفحة.'
              : 'You need admin privileges to access this page.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={direction}>
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {language === 'ar' ? 'إعدادات المسؤول' : 'Admin Settings'}
        </h1>
        <p className="text-muted-foreground">
          {language === 'ar'
            ? 'تحميل الوثائق وإدارة إعدادات النظام'
            : 'Download documentation and manage system settings'}
        </p>
      </div>

      {/* Documentation Downloads */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Book className="h-5 w-5" />
                {language === 'ar' ? 'توثيق التطبيق' : 'Application Documentation'}
              </CardTitle>
              <CardDescription>
                {language === 'ar'
                  ? 'تحميل أدلة التثبيت والتطوير للنشر على خادم جديد'
                  : 'Download installation and development guides for deploying to a new server'}
              </CardDescription>
            </div>
            <Button onClick={handleDownloadAll} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'تحميل الكل' : 'Download All'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {documentationFiles.map((doc) => {
              const Icon = doc.icon;
              return (
                <Card key={doc.id} className="border-dashed">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <h3 className="font-semibold">
                          {language === 'ar' ? doc.titleAr : doc.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {language === 'ar' ? doc.descriptionAr : doc.description}
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-2 gap-2"
                          onClick={() => handleDownload(doc.filename, doc.content)}
                        >
                          <Download className="h-4 w-4" />
                          {doc.filename}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
