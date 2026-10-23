import {Logout} from './logout';
import type {ReactNode} from 'react';
import {WorkspaceShell} from '@leek/ui';
import type {PortalCompany} from '../lib/portal';
import {webOrigin} from '../lib/portal';
export function PortalShell({company,active,children}:{company?:PortalCompany;active:string;children:ReactNode}){return <WorkspaceShell kind="portal" active={active} demo={false} actions={<Logout/>} siteUrl={webOrigin()} companyName={company?.name} companySlug={company?.status==='published'?company.slug:undefined}>{children}</WorkspaceShell>;}
