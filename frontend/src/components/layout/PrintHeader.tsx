import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Print-only header rendered once at the top of every page.
 * Hidden on screen via the `print-only` utility class (see index.css).
 * Auto-populates from the active engagement, current user, and route.
 */

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/firm-overview': 'Firm Overview',
  '/clients': 'Client Selection',
  '/findings': 'Findings Register',
  '/audit-report': 'Audit Report',
  '/msb-registration': 'MSB Registration Review',
  '/kyc-review': 'KYC Review',
  '/governance': 'Governance Review',
  '/transaction-reporting': 'Transaction Reporting Review',
  '/transaction-monitoring': 'Transaction Monitoring Review',
  '/aml-program': 'AML Program Review',
  '/aml-program/policies': 'AML Policies & Procedures Review',
  '/aml-program/risk-assessment': 'AML Risk Assessment Review',
  '/aml-program/training': 'AML Training Review',
  '/aml-program/effectiveness': 'AML Effectiveness Review',
  '/client-files': 'Client Files — Document Request List & Sample Evidence',
};

function titleForPath(path: string): string {
  if (ROUTE_TITLES[path]) return ROUTE_TITLES[path];
  // Longest-prefix match for nested routes
  const match = Object.keys(ROUTE_TITLES)
    .filter((k) => path.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  if (match) return ROUTE_TITLES[match];
  return 'Working Paper';
}

function fmtDate(d?: string | null): string {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: '2-digit' });
}

export function PrintHeader() {
  const { selectedClient, selectedEngagement, user } = useApp();
  const location = useLocation();

  const [analystName, setAnalystName] = useState<string>('');
  const [reviewerName, setReviewerName] = useState<string>('');

  // Analyst = current user (full_name from profile, fallback to email)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) { setAnalystName(''); return; }
      const { data } = await supabase
        .from('profiles').select('full_name, email').eq('id', user.id).maybeSingle();
      if (!cancelled) {
        setAnalystName(data?.full_name || data?.email || user.email || '');
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Reviewer / Manager = first manager-or-above assigned to this engagement (excluding the analyst)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selectedEngagement) { setReviewerName(''); return; }
      const { data: assigns } = await supabase
        .from('engagement_assignments')
        .select('user_id, role')
        .eq('engagement_id', selectedEngagement.id);
      if (!assigns || assigns.length === 0) { if (!cancelled) setReviewerName(''); return; }

      const reviewerRoles = new Set(['manager', 'partner', 'admin', 'reviewer']);
      const reviewer = assigns.find(
        (a) => a.role && reviewerRoles.has(String(a.role).toLowerCase()) && a.user_id !== user?.id,
      ) ?? assigns.find((a) => a.user_id !== user?.id);
      if (!reviewer) { if (!cancelled) setReviewerName(''); return; }

      const { data: prof } = await supabase
        .from('profiles').select('full_name, email').eq('id', reviewer.user_id).maybeSingle();
      if (!cancelled) setReviewerName(prof?.full_name || prof?.email || '');
    })();
    return () => { cancelled = true; };
  }, [selectedEngagement, user]);

  const documentTitle = useMemo(() => titleForPath(location.pathname), [location.pathname]);
  const completionDate = useMemo(() => fmtDate(new Date().toISOString()), []);

  const period = selectedEngagement
    ? `${fmtDate(selectedEngagement.period_start)} – ${fmtDate(selectedEngagement.period_end)}`
    : '—';

  return (
    <div className="print-header" aria-hidden="true">
      <div className="print-header-top">
        <div className="print-header-brand">Veritas AML Audit — Working Paper</div>
        <div className="print-header-title">{documentTitle}</div>
      </div>
      <table className="print-header-meta">
        <tbody>
          <tr>
            <th>Client</th><td>{selectedClient?.name ?? '—'}</td>
            <th>Engagement</th><td>{selectedEngagement?.name ?? '—'}</td>
          </tr>
          <tr>
            <th>Review period</th><td>{period}</td>
            <th>Document</th><td>{documentTitle}</td>
          </tr>
          <tr>
            <th>Analyst</th><td>{analystName || '—'}</td>
            <th>Reviewer / Manager</th><td>{reviewerName || '—'}</td>
          </tr>
          <tr>
            <th>Date completed</th><td>{completionDate}</td>
            <th>Printed</th><td>{completionDate}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
