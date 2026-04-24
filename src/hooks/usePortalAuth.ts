import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PortalClient {
  id: string;
  portal_id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
}

interface PortalConfig {
  id: string;
  customer_name: string;
  portal_slug: string;
  primary_color: string;
  welcome_message: string | null;
  logo_url: string | null;
  company_name_override: string | null;
  white_label: boolean;
  footer_text: string | null;
  show_invoices: boolean;
  show_retainers: boolean;
  show_files: boolean;
  show_pay_button: boolean;
  show_projects: boolean;
  show_change_orders: boolean;
  show_documents: boolean;
  show_messages: boolean;
  allow_client_uploads: boolean;
  allow_co_approval: boolean;
  customer_id: string | null;
  is_enabled: boolean;
}

const SESSION_KEY = 'portal_session';

export function usePortalAuth(slug: string | undefined) {
  const [client, setClient] = useState<PortalClient | null>(null);
  const [portal, setPortal] = useState<PortalConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load portal config
  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data, error: err } = await supabase
        .from('client_portals')
        .select('*')
        .eq('portal_slug', slug)
        .eq('is_enabled', true)
        .single();
      if (err || !data) {
        setError('Portal not found or disabled');
        setLoading(false);
        return;
      }
      setPortal(data as any);
      // Check session
      const session = localStorage.getItem(`${SESSION_KEY}_${slug}`);
      if (session) {
        try {
          const parsed = JSON.parse(session);
          const sessionAge = Date.now() - parsed.timestamp;
          if (sessionAge < 7 * 24 * 60 * 60 * 1000) { // 7 days
            setClient(parsed.client);
          } else {
            localStorage.removeItem(`${SESSION_KEY}_${slug}`);
          }
        } catch { /* ignore */ }
      }
      setLoading(false);
    })();
  }, [slug]);

  const login = useCallback(async (email: string, password: string) => {
    if (!portal) throw new Error('Portal not loaded');
    
    const { data: accounts, error: err } = await supabase
      .from('portal_client_accounts')
      .select('*')
      .eq('portal_id', portal.id)
      .eq('email', email.toLowerCase().trim())
      .eq('is_active', true);

    if (err || !accounts || accounts.length === 0) {
      throw new Error('Invalid email or password');
    }

    const account = accounts[0] as any;
    // Simple password check (stored as plain hash for demo - in production use bcrypt via edge function)
    if (account.password_hash !== password) {
      throw new Error('Invalid email or password');
    }

    // Update login stats
    await supabase
      .from('portal_client_accounts')
      .update({
        last_login_at: new Date().toISOString(),
        login_count: (account.login_count || 0) + 1,
      })
      .eq('id', account.id);

    // Log analytics
    await supabase.from('portal_analytics').insert({
      portal_id: portal.id,
      client_account_id: account.id,
      event_type: 'login',
      page_path: `/portal/${portal.portal_slug}`,
    });

    const clientData: PortalClient = {
      id: account.id,
      portal_id: account.portal_id,
      email: account.email,
      full_name: account.full_name,
      is_active: account.is_active,
    };

    setClient(clientData);
    localStorage.setItem(`${SESSION_KEY}_${portal.portal_slug}`, JSON.stringify({
      client: clientData,
      timestamp: Date.now(),
    }));

    return clientData;
  }, [portal]);

  const logout = useCallback(() => {
    if (portal) {
      localStorage.removeItem(`${SESSION_KEY}_${portal.portal_slug}`);
    }
    setClient(null);
  }, [portal]);

  const trackEvent = useCallback(async (eventType: string, pagePath?: string, metadata?: any) => {
    if (!portal || !client) return;
    await supabase.from('portal_analytics').insert({
      portal_id: portal.id,
      client_account_id: client.id,
      event_type: eventType,
      page_path: pagePath,
      metadata: metadata || {},
    });
  }, [portal, client]);

  return { client, portal, loading, error, login, logout, trackEvent };
}
