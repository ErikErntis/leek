import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import '@leek/ui/styles.css';
export const metadata: Metadata={title:{default:'LEEKi halduskeskond | LEEK',template:'%s | LEEK'},robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default function Layout({children}:{children:React.ReactNode}){if(process.env.DEMO_MODE!=='true')notFound();return <html lang="et"><body>{children}</body></html>;}
