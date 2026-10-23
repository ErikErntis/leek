'use client';
export default function PortalError({ reset }: { reset: () => void }) {
  return <section className="container section"><h1>Portaali ei saanud laadida.</h1><p>Proovi mõne hetke pärast uuesti.</p><button type="button" className="button" onClick={reset}>Proovi uuesti</button><p><a href="/">Tagasi veebilehele</a></p></section>;
}
