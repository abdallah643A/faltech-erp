-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'sales_rep', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  department TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create business_partners table
CREATE TABLE public.business_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_code TEXT NOT NULL UNIQUE,
  card_name TEXT NOT NULL,
  card_type TEXT NOT NULL DEFAULT 'customer' CHECK (card_type IN ('customer', 'vendor', 'lead')),
  group_code TEXT,
  phone TEXT,
  mobile TEXT,
  email TEXT,
  website TEXT,
  contact_person TEXT,
  billing_address TEXT,
  shipping_address TEXT,
  tax_id TEXT,
  currency TEXT DEFAULT 'SAR',
  payment_terms TEXT,
  credit_limit DECIMAL(15,2) DEFAULT 0,
  balance DECIMAL(15,2) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create items table
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'inventory' CHECK (item_type IN ('inventory', 'service', 'non-inventory')),
  item_group TEXT,
  uom TEXT DEFAULT 'EA',
  barcode TEXT,
  manufacturer TEXT,
  shipping_type TEXT,
  preferred_vendor TEXT,
  purchase_uom TEXT DEFAULT 'EA',
  items_per_purchase_unit INTEGER DEFAULT 1,
  purchase_packaging TEXT,
  last_purchase_price DECIMAL(15,2) DEFAULT 0,
  purchase_currency TEXT DEFAULT 'SAR',
  sales_uom TEXT DEFAULT 'EA',
  items_per_sales_unit INTEGER DEFAULT 1,
  sales_packaging TEXT,
  default_price DECIMAL(15,2) DEFAULT 0,
  sales_currency TEXT DEFAULT 'SAR',
  warehouse TEXT DEFAULT 'WH01',
  in_stock INTEGER DEFAULT 0,
  committed INTEGER DEFAULT 0,
  ordered INTEGER DEFAULT 0,
  min_inventory INTEGER DEFAULT 0,
  max_inventory INTEGER DEFAULT 0,
  reorder_point INTEGER DEFAULT 0,
  planning_method TEXT DEFAULT 'mrp' CHECK (planning_method IN ('mrp', 'none')),
  procurement_method TEXT DEFAULT 'buy' CHECK (procurement_method IN ('make', 'buy')),
  order_interval INTEGER DEFAULT 7,
  order_multiple INTEGER DEFAULT 1,
  lead_time INTEGER DEFAULT 7,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales_orders table
CREATE TABLE public.sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_num SERIAL,
  doc_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  customer_id UUID REFERENCES public.business_partners(id),
  customer_code TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  contact_person TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('draft', 'open', 'closed', 'cancelled')),
  currency TEXT DEFAULT 'SAR',
  subtotal DECIMAL(15,2) DEFAULT 0,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  shipping_address TEXT,
  billing_address TEXT,
  payment_terms TEXT,
  shipping_method TEXT,
  sales_rep_id UUID REFERENCES auth.users(id),
  remarks TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales_order_lines table
CREATE TABLE public.sales_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID REFERENCES public.sales_orders(id) ON DELETE CASCADE NOT NULL,
  line_num INTEGER NOT NULL,
  item_id UUID REFERENCES public.items(id),
  item_code TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(15,3) NOT NULL DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  tax_code TEXT,
  tax_percent DECIMAL(5,2) DEFAULT 15,
  line_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  warehouse TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_lines ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user roles (prevents infinite recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user has any of the specified roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles (only admins can manage)
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for business_partners
CREATE POLICY "Authenticated users can view business partners"
  ON public.business_partners FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Sales reps and above can create business partners"
  ON public.business_partners FOR INSERT
  TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'sales_rep']::app_role[]));

CREATE POLICY "Sales reps can update their assigned partners"
  ON public.business_partners FOR UPDATE
  TO authenticated
  USING (
    assigned_to = auth.uid() OR 
    public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[])
  );

CREATE POLICY "Only admins can delete business partners"
  ON public.business_partners FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for items
CREATE POLICY "Authenticated users can view items"
  ON public.items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and admins can create items"
  ON public.items FOR INSERT
  TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[]));

CREATE POLICY "Managers and admins can update items"
  ON public.items FOR UPDATE
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[]));

CREATE POLICY "Only admins can delete items"
  ON public.items FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for sales_orders
CREATE POLICY "Users can view their own orders or all if manager/admin"
  ON public.sales_orders FOR SELECT
  TO authenticated
  USING (
    sales_rep_id = auth.uid() OR 
    created_by = auth.uid() OR
    public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[])
  );

CREATE POLICY "Sales reps and above can create orders"
  ON public.sales_orders FOR INSERT
  TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'manager', 'sales_rep']::app_role[]));

CREATE POLICY "Users can update their own orders or all if manager/admin"
  ON public.sales_orders FOR UPDATE
  TO authenticated
  USING (
    sales_rep_id = auth.uid() OR 
    created_by = auth.uid() OR
    public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[])
  );

CREATE POLICY "Only admins can delete orders"
  ON public.sales_orders FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for sales_order_lines (follow parent order access)
CREATE POLICY "Users can view order lines for accessible orders"
  ON public.sales_order_lines FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sales_orders so
      WHERE so.id = sales_order_id
      AND (
        so.sales_rep_id = auth.uid() OR 
        so.created_by = auth.uid() OR
        public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[])
      )
    )
  );

CREATE POLICY "Users can manage order lines for accessible orders"
  ON public.sales_order_lines FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sales_orders so
      WHERE so.id = sales_order_id
      AND (
        so.sales_rep_id = auth.uid() OR 
        so.created_by = auth.uid() OR
        public.has_any_role(auth.uid(), ARRAY['admin', 'manager']::app_role[])
      )
    )
  );

-- Trigger to create profile and assign default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create update triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_partners_updated_at
  BEFORE UPDATE ON public.business_partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_orders_updated_at
  BEFORE UPDATE ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_business_partners_card_code ON public.business_partners(card_code);
CREATE INDEX idx_business_partners_assigned_to ON public.business_partners(assigned_to);
CREATE INDEX idx_items_item_code ON public.items(item_code);
CREATE INDEX idx_sales_orders_customer_id ON public.sales_orders(customer_id);
CREATE INDEX idx_sales_orders_sales_rep_id ON public.sales_orders(sales_rep_id);
CREATE INDEX idx_sales_order_lines_order_id ON public.sales_order_lines(sales_order_id);