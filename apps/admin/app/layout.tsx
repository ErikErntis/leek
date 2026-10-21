import type { Metadata } from 'next';
import '@leek/ui/styles.css';
import './admin.css';
export const metadata: Metadata={title:{default:'LEEKi halduskeskond | LEEK',template:'%s | LEEK'},robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default function Layout({children}:{children:React.ReactNode}){return <html lang="et"><body>{children}</body></html>;}
