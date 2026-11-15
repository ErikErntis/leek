import { Mail, MessageCircle } from 'lucide-react';

export function InquiryContactActions({ portalHref, emailHref, signedIn, portalLabel }: {
 portalHref: string;
 emailHref?: string;
 signedIn: boolean;
 portalLabel: string;
}) {
 return <div className="inquiry-contact-actions">
  <a className="button" href={portalHref}>
   {signedIn ? portalLabel : 'Suhtle LEEKi portaalis'} <MessageCircle size={16} aria-hidden="true" />
  </a>
  {!signedIn && <p className="muted inquiry-signin-note">Logi sisse või loo kliendikonto, et vestlust alustada.</p>}
  {emailHref && <a className="button secondary" href={emailHref}>
   Saada e-kiri <Mail size={16} aria-hidden="true" />
  </a>}
 </div>;
}
