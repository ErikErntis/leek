import { ArrowRight, ChevronLeft, MessageSquare } from 'lucide-react';
import { formatServicePrice, type InquirySummary, type InquiryThread } from '@leek/contracts';
import { inboxHref } from '../../lib/inquiry-links';
import { InquiryActionForm } from './inquiry-forms';

const kindLabels = { product: 'Tootepäring', fixed_service: 'Teenuse tellimissoov', service_quote: 'Teenuse hinnapäring' };
const statusLabels = { open: 'Avatud', accepted: 'Kinnitatud', declined: 'Tagasi lükatud' };
const offerLabels = { pending: 'Ootab vastust', accepted: 'Kinnitatud', declined: 'Tagasi lükatud', replaced: 'Asendatud' };
const time = new Intl.DateTimeFormat('et-EE', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Tallinn' });
const date = new Intl.DateTimeFormat('et-EE', { dateStyle: 'long', timeZone: 'Europe/Tallinn' });
const localDate = (value: string) => date.format(new Date(value + 'T12:00:00Z'));

export function InquiryList({ items, company, offset, nextOffset }: {
 items: InquirySummary[]; company?: string; offset: number; nextOffset: number | null;
}) {
 return <section className="panel inbox-list-panel">
  {items.length ? <ul className="inbox-list">{items.map(item => <li key={item.id}>
   <a href={inboxHref(company, item.id)}>
    <span className="inbox-list-icon"><MessageSquare size={19} aria-hidden="true" /></span>
    <span className="inbox-list-content">
     <strong>{item.snapshot.title}</strong>
     <span>{company ? item.customerName : item.companyName} · {kindLabels[item.kind]}{item.snapshot.optionTitle && ` · ${item.snapshot.optionTitle}`}</span>
    </span>
    <span className="inbox-list-meta"><span className="inbox-status">{statusLabels[item.status]}</span><time dateTime={item.updatedAt}>{time.format(new Date(item.updatedAt))}</time></span>
    <ArrowRight size={17} aria-hidden="true" />
   </a>
  </li>)}</ul> : <p className="muted">{offset ? 'Sellel lehel päringuid pole.' : company ? 'Ettevõttele pole veel päringuid tulnud.' : 'Sul pole veel päringuid.'}</p>}
  {(offset > 0 || nextOffset !== null) && <nav className="inbox-actions" aria-label="Päringute leheküljed">
   {offset > 0 && <a className="text-link" href={inboxHref(company, undefined, Math.max(0, offset - 30))}>Uuemad päringud</a>}
   {nextOffset !== null && <a className="text-link" href={inboxHref(company, undefined, nextOffset)}>Vanemad päringud</a>}
  </nav>}
 </section>;
}

export function InquiryConversation({ thread, company, offset }: { thread: InquiryThread; company?: string; offset: number }) {
 const { snapshot, kind, status, id } = thread;
 const ownSide = company ? 'company' : 'customer';
 const acceptedOffer = thread.offers.find(offer => offer.status === 'accepted');
 const activeOffer = thread.offers.find(offer => offer.status === 'pending');
 return <>
  <a className="text-link inbox-back" href={inboxHref(company)}><ChevronLeft size={16} aria-hidden="true" /> Tagasi päringute juurde</a>
  <div className="inbox-thread-heading">
   <div><p className="muted">{kindLabels[kind]} · {company ? thread.customerName : thread.companyName}</p><h1>{snapshot.title}</h1></div>
   <span className="inbox-status">{statusLabels[status]}</span>
  </div>
  <div className="inbox-thread-grid">
   <section className="panel inbox-conversation">
    <h2>Vestlus</h2>
    {(thread.hasOlder || offset > 0) && <nav className="inbox-actions" aria-label="Vestluse ajalugu">
     {thread.hasOlder && <a className="text-link" href={inboxHref(company, id, offset + 60)}>Vanemad sõnumid</a>}
     {offset > 0 && <a className="text-link" href={inboxHref(company, id, Math.max(0, offset - 60))}>Uuemad sõnumid</a>}
    </nav>}
    <ol className="inbox-messages">{thread.messages.map(message => <li key={message.id} className={message.side === ownSide ? 'is-own' : undefined}>
     <div><strong>{message.side === ownSide ? 'Sina' : message.side === 'company' ? thread.companyName : thread.customerName}</strong>
      <time dateTime={message.createdAt}>{time.format(new Date(message.createdAt))}</time></div>
     <p>{message.body}</p>
    </li>)}</ol>
    {offset === 0 && <InquiryActionForm id={id} company={company} kind="reply" />}
   </section>
   <aside className="panel inbox-context">
    <h2>Päringu andmed</h2>
    <dl>
     {snapshot.optionTitle && <><dt>{kind === 'product' ? 'Variant' : 'Pakett'}</dt><dd>{snapshot.optionTitle}</dd></>}
     {kind === 'product' && <><dt>Kogus</dt><dd>{snapshot.quantity} tk</dd></>}
     {snapshot.priceCents !== null && <><dt>{kind === 'product' ? 'Ühiku hind päringu saatmisel' : 'Teenuse hind'}</dt><dd>{formatServicePrice(snapshot.priceCents)}</dd></>}
     {thread.location && <><dt>Töö asukoht</dt><dd>{thread.location}</dd></>}
     {thread.desiredDate && <><dt>Soovitud kuupäev</dt><dd>{localDate(thread.desiredDate)}</dd></>}
     {acceptedOffer && <><dt>Kokkulepitud hind</dt><dd>{formatServicePrice(acceptedOffer.priceCents)}</dd>
      {acceptedOffer.proposedDate && <><dt>Kokkulepitud kuupäev</dt><dd>{localDate(acceptedOffer.proposedDate)}</dd></>}</>}
    </dl>
    {company && kind === 'fixed_service' && status === 'open' && <InquiryActionForm id={id} company={company} kind="decide" />}
    {kind === 'service_quote' && <>
     {thread.offers.length > 0 && <section className="inbox-offers"><h3>Hinnapakkumised</h3>
      {thread.offers.map(offer => <article className="inbox-offer" key={offer.id}>
       <strong>{formatServicePrice(offer.priceCents)}</strong><span className="inbox-status">{offerLabels[offer.status]}</span>
       {offer.proposedDate && <p>{localDate(offer.proposedDate)}</p>}<p>{offer.message}</p>
       {!company && status === 'open' && offer.id === activeOffer?.id && <InquiryActionForm key={offer.id} id={id} kind="decide" offerId={offer.id} />}
      </article>)}
     </section>}
     {company && status === 'open' && <section className="inbox-offers">
      <h3>{activeOffer ? 'Saada uus pakkumine' : 'Tee hinnapakkumine'}</h3>
      {activeOffer && <p className="muted">Uus pakkumine asendab ootel pakkumise.</p>}
      <InquiryActionForm id={id} company={company} kind="offer" />
     </section>}
    </>}
   </aside>
  </div>
 </>;
}
