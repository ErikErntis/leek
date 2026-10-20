'use client';
export default function Error({reset}:{reset:()=>void}){return <div className="not-found"><h1>Andmete laadimine katkes.</h1><p>Palun proovi mõne hetke pärast uuesti.</p><button className="button" onClick={reset}>Proovi uuesti</button></div>;}
