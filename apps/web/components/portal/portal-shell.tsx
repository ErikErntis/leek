import type { ReactNode } from 'react';
import { Brand } from '@leek/ui';
import { ArrowUpRight, Building2, LayoutDashboard, Layers, Tags, BriefcaseBusiness } from 'lucide-react';
import { LogoutButton } from '../auth/logout-button';
import type { PortalCompany } from '../../lib/portal';

const navigation = [
  ['Ülevaade', '/portaal', LayoutDashboard],
  ['Ettevõtte profiil', '/portaal/profiil', Building2],
  ['Teenused', '/portaal/teenused', Tags],
  ['Töökuulutused', '/portaal/tookuulutused', BriefcaseBusiness],
  ['Pakett ja maksmine', '/portaal/pakett', Layers],
] as const;

export function PortalShell({ company, active, children }: {
  company?: PortalCompany;
  active: string;
  children: ReactNode;
}) {
  const selected = active === '/' ? '/portaal' : `/portaal${active}`;
  const suffix = company ? `?company=${encodeURIComponent(company.id)}` : '';
  return (
    <div className="workspace web-portal">
      <aside className="sidebar">
        <Brand href="/" />
        <div className="workspace-label">ETTEVÕTJA ISETEENINDUS</div>
        <div className="company-switch">
          <Building2 size={19} aria-hidden="true" />
          <div><strong>{company?.name ?? 'Minu ettevõte'}</strong><small>LEEKi ettevõtteportaal</small></div>
        </div>
        <nav aria-label="Portaali navigatsioon">
          {navigation.map(([label, path, Icon]) => (
            <a key={path} href={`${path}${suffix}`} className={selected === path ? 'active' : undefined} aria-current={selected === path ? 'page' : undefined}>
              <Icon size={20} aria-hidden="true" />{label}
            </a>
          ))}
        </nav>
        <a href="/" className="back-link">← Tagasi veebilehele</a>
      </aside>
      <div className="workspace-body">
        <header className="workspace-header">
          <span>Minu ettevõte</span>
          {company?.status === 'published' && (
            <a href={`/ettevotted/${company.slug}`} className="text-link">Vaata avalikku profiili <ArrowUpRight size={16} aria-hidden="true" /></a>
          )}
          <LogoutButton />
        </header>
        <main id="main" className="workspace-main">{children}</main>
      </div>
    </div>
  );
}
