import { AdminLogout } from '../../components/admin-auth';
export default function Denied(){return <main className="admin-login"><section className="panel"><h1>Administraatori ligipääs puudub.</h1><p>Sinu kontol ei ole halduskeskuse õigust. Võid välja logida ja kasutada teist kontot.</p><AdminLogout/></section></main>;}
