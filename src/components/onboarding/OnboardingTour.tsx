import { useEffect, useCallback } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function useOnboardingTour() {
  const { user, profile } = useAuth();

  const startTour = useCallback(() => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      overlayColor: 'hsl(var(--background) / 0.75)',
      steps: [
        {
          element: '[data-tour="sidebar"]',
          popover: {
            title: 'Sidebar Navigation',
            description: 'Browse all modules: Sales, CRM, HR, Finance, Inventory and more. Click any section to expand.',
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '[data-tour="company-selector"]',
          popover: {
            title: 'Company Selector',
            description: 'Switch between companies. All data is filtered by the selected company.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '[data-tour="search"]',
          popover: {
            title: 'Global Search',
            description: 'Press Ctrl+K to instantly search across customers, invoices, projects, employees, and pages.',
            side: 'bottom',
            align: 'center',
          },
        },
        {
          element: '[data-tour="notifications"]',
          popover: {
            title: 'Notifications',
            description: 'Real-time alerts for approvals, payments, and workflow updates appear here.',
            side: 'bottom',
            align: 'end',
          },
        },
        {
          element: '[data-tour="kpi-cards"]',
          popover: {
            title: 'Dashboard KPIs',
            description: 'Key performance indicators update in real-time. Click any card to drill down into details.',
            side: 'bottom',
            align: 'center',
          },
        },
      ],
      onDestroyStarted: () => {
        driverObj.destroy();
        // Mark onboarding completed
        if (user?.id) {
          supabase.from('profiles').update({ has_completed_onboarding: true } as any).eq('user_id', user.id).then();
        }
      },
    });
    driverObj.drive();
  }, [user]);

  // Auto-start on first login
  useEffect(() => {
    if (profile && !(profile as any).has_completed_onboarding) {
      const timer = setTimeout(startTour, 1500);
      return () => clearTimeout(timer);
    }
  }, [profile, startTour]);

  return { startTour };
}

export function OnboardingTour() {
  useOnboardingTour();
  return null;
}
