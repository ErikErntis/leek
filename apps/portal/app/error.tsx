'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="container section"><h1>Andmeid ei saanud laadida.</h1><p>Proovi mõne hetke pärast uuesti.</p><button className="button" onClick={reset}>Proovi uuesti</button></main>;}
