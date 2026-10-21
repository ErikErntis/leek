import { Brand } from '@leek/ui';
import { AdminLogin } from '../../components/admin-auth';
export default function Login(){return <main className="admin-login"><Brand href={process.env.SITE_URL??'http://localhost:3000'}/><section className="panel"><span className="eyebrow">LEEKI HALDUSKESKOND</span><h1>Hea sind näha.</h1><p>Logi sisse oma LEEKi kontoga. Halduskeskus avaneb ainult administraatori õigusega.</p><AdminLogin/></section></main>;}
