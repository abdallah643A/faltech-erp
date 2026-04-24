import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SubPortalAccount {
  id: string;
  subcontractor_id: string;
  email: string;
  contact_name: string | null;
  company_id: string | null;
}

export interface SubPortalSubcontractor {
  id: string;
  name: string;
  code: string;
  trade: string | null;
  company_id: string | null;
}

const STORAGE_KEY = 'sub_portal_session';

export function useSubcontractorPortalAuth() {
  const [account, setAccount] = useState<SubPortalAccount | null>(null);
  const [subcontractor, setSubcontractor] = useState<SubPortalSubcontractor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setAccount(parsed.account);
        setSubcontractor(parsed.subcontractor);
      } catch {}
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data: accounts, error } = await supabase
      .from('subcontractor_portal_accounts')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('is_active', true)
      .limit(1) as any;

    if (error || !accounts?.length) {
      throw new Error('Invalid credentials or account disabled');
    }

    const acc = accounts[0];
    // Simple password check (in production use bcrypt via edge function)
    if (acc.password_hash !== password) {
      throw new Error('Invalid credentials');
    }

    // Get subcontractor info
    const { data: sub } = await supabase
      .from('cpms_subcontractors')
      .select('id, name, code, trade, company_id')
      .eq('id', acc.subcontractor_id)
      .single() as any;

    if (!sub) throw new Error('Subcontractor record not found');

    const acctData: SubPortalAccount = {
      id: acc.id,
      subcontractor_id: acc.subcontractor_id,
      email: acc.email,
      contact_name: acc.contact_name,
      company_id: acc.company_id,
    };

    setAccount(acctData);
    setSubcontractor(sub);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ account: acctData, subcontractor: sub }));

    // Update last login
    await supabase
      .from('subcontractor_portal_accounts')
      .update({ last_login_at: new Date().toISOString() } as any)
      .eq('id', acc.id);

    return { account: acctData, subcontractor: sub };
  }, []);

  const logout = useCallback(() => {
    setAccount(null);
    setSubcontractor(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  return { account, subcontractor, loading, login, logout, isAuthenticated: !!account };
}