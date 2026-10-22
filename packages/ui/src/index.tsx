import type { ReactNode } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  MapPin,
  Menu,
  Building2,
  LayoutDashboard,
  FileText,
  Tags,
  BriefcaseBusiness,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import type { Company } from '@leek/contracts';

export function Brand({ href = '/' }: { href?: string }) {
  return (
    <a href={href} className="brand" aria-label="LEEK avaleht">
      <svg
        width={34}
        height={46}
        viewBox="0 0 40 54"
        aria-hidden="true"
        focusable="false"
        style={{
          flexShrink: 0,
          fill: 'var(--petrol, #005b63)',
          stroke: 'none',
        }}
      >
        <path
          fillRule="evenodd"
          d="
            M23 1
            C24 12 5 20 3 33
            C1 42 7 49 16 53
            C10 47 9 41 12 35
            C16 27 30 20 23 1
            Z

            M28 13
            C39 24 40 32 35 40
            C32 45 25 49 21 53
            C21 45 27 40 30 34
            C34 27 32 20 28 13
            Z
          "
        />
      </svg>

      <strong>LEEK</strong>

      <span>
        Loode-Eesti
        <br />
        ettevõtlusklubi
      </span>
    </a>
  );
}

export function PublicHeader({
  portalUrl = 'http://localhost:3001',
}: {
  portalUrl?: string;
}) {
  return (
    <header className="site-header">
      <div className="container nav">
        <Brand />

        <nav className="desktop-nav" aria-label="Põhinavigatsioon">
          <a href="/ettevotted">Ettevõtted</a>
          <a href="/pakkumised">Pakkumised</a>
          <a href="/tookohad">Tööpakkumised</a>
          <a href="/klubist">Klubist</a>
        </nav>

        <div className="nav-actions">
          <a className="login-link" href={portalUrl}>
            Ettevõtjale <ArrowUpRight size={15} />
          </a>

          <a className="button small" href="/liitu">
            Liitu LEEKiga <ArrowRight size={16} />
          </a>
        </div>

        <details className="mobile-nav">
          <summary aria-label="Ava menüü">
            <Menu />
          </summary>

          <nav aria-label="Mobiilinavigatsioon">
            <a href="/ettevotted">Ettevõtted</a>
            <a href="/pakkumised">Pakkumised</a>
            <a href="/tookohad">Tööpakkumised</a>
            <a href="/klubist">Klubist</a>
            <a href={portalUrl}>Ettevõtjale</a>
          </nav>
        </details>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <Brand />

          <p>
            Kohalikud tegijad. Ühised võimalused.
            <br />
            Loode-Eesti ettevõtlus saab kokku siin.
          </p>
        </div>

        <div>
          <span className="eyebrow">AVASTA</span>
          <a href="/ettevotted">Ettevõtted</a>
          <a href="/pakkumised">Pakkumised</a>
          <a href="/tookohad">Tööpakkumised</a>
        </div>

        <div>
          <span className="eyebrow">LEEK</span>
          <a href="/klubist">Meie klubist</a>
          <a href="/liitu">Liitumisvõimalused</a>
        </div>
      </div>

      <div className="container footer-bottom">
        <span>
          © {new Date().getFullYear()} LEEK · Loode-Eesti ettevõtlusklubi
        </span>
        <span>Koos on rohkem võimalik.</span>
      </div>
    </footer>
  );
}

export function CompanyCard({ company }: { company: Company }) {
  return (
    <a href={`/ettevotted/${company.slug}`} className="company-card">
      <div
        className="card-photo"
        style={{ backgroundImage: `url("${company.image}")` }}
        role="img"
        aria-label={company.name}
      >
        {company.featured && (
          <span className="badge featured">ESILE TÕSTETUD</span>
        )}

        <span className="photo-arrow">
          <ArrowUpRight size={20} />
        </span>
      </div>

      <div className="card-copy">
        <div className="card-category">{company.category}</div>
        <h3>{company.name}</h3>

        <span className="location">
          <MapPin size={13} />
          {company.municipality}
        </span>

        <p>{company.tagline}</p>
      </div>
    </a>
  );
}

export function DemoNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`demo-notice${compact ? ' compact' : ''}`}>
      <span className="status-dot" />
      DEMOVAADE
      <span>· Ettevõtted ja andmed on näidised.</span>
    </div>
  );
}

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <Building2 size={36} />
      <h2>{title}</h2>
      <p>{children}</p>

      <a href="/ettevotted" className="text-link">
        Vaata ettevõtteid <ArrowRight size={16} />
      </a>
    </div>
  );
}

const portalNav = [
  ['Ülevaade', '/', LayoutDashboard],
  ['Ettevõtte profiil', '/profiil', Building2],
  ['Pakkumised', '/pakkumised', Tags],
  ['Töökuulutused', '/tookuulutused', BriefcaseBusiness],
  ['Pakett ja arved', '/pakett', Layers],
] as const;

const adminNav = [
  ['Ülevaade', '/', LayoutDashboard],
  ['Ettevõtted', '/ettevotted', Building2],
  ['Sisu ülevaatus', '/ulevaatus', ShieldCheck],
  ['Paketid', '/paketid', Layers],
] as const;

type WorkspaceShellProps = {
  kind: 'portal' | 'admin';
  active: string;
  children: ReactNode;
  siteUrl?: string;
  demo?: boolean;
  actions?: ReactNode;
};

export function WorkspaceShell({
  kind,
  active,
  children,
  siteUrl = 'http://localhost:3000',
  demo = true,
  actions,
}: WorkspaceShellProps) {
  const admin = kind === 'admin';
  const navigation = admin ? adminNav : portalNav;

  return (
    <div className="workspace">
      <aside className="sidebar">
        <Brand href="/" />

        <div className="workspace-label">
          {admin ? 'LEEKI HALDUS' : 'ETTEVÕTJA ISETEENINDUS'}
        </div>

        <div className="company-switch">
          <Building2 size={19} />

          <div>
            <strong>{admin ? 'LEEK' : 'Ranniku Puit'}</strong>
            <small>
              {admin
                ? demo
                  ? 'Administraatori demovaade'
                  : 'LEEKi haldur'
                : 'Ettevõtte demovaade'}
            </small>
          </div>
        </div>

        <nav aria-label="Töölaua menüü">
          {navigation.map(([label, path, Icon]) => (
            <a
              key={path}
              href={path}
              className={active === path ? 'active' : ''}
              aria-current={active === path ? 'page' : undefined}
            >
              <Icon size={20} />
              {label}
            </a>
          ))}
        </nav>

        <a href={siteUrl} className="back-link">
          ← Tagasi portaali
        </a>
      </aside>

      <div className="workspace-body">
        <header className="workspace-header">
          <span>{admin ? 'Halduskeskond' : 'Minu ettevõte'}</span>

          <a
            href={`${siteUrl}${admin ? '' : '/ettevotted/ranniku-puit'}`}
            className="text-link"
          >
            Vaata avalikku {admin ? 'veebi' : 'profiili'}
            <ArrowUpRight size={16} />
          </a>

          {actions}

          <span className="avatar">{admin ? 'L' : 'M'}</span>
        </header>

        <main className="workspace-main">
          {demo && <DemoNotice />}
          {children}
        </main>
      </div>
    </div>
  );
}

export function StatCard({
  title,
  value,
  detail,
  icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon?: ReactNode;
}) {
  return (
    <div className="stat-card">
      <span className="stat-icon">{icon ?? <FileText size={22} />}</span>
      <span className="muted">{title}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}