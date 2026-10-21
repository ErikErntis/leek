import type { CompanySummary } from '@leek/contracts';
import { statusNames, planLabels } from '../lib/data';
export function CompaniesTable({items}:{items:CompanySummary[]}) {
 if(!items.length)return <div className="empty-state"><h2>Ettevõtteid selles vaates ei ole</h2><p>Uued taotlused ilmuvad siia pärast ettevõtte andmete esitamist.</p></div>;
 return <div className="table-wrap"><table><thead><tr><th>Ettevõte</th><th>Piirkond</th><th>Soovitud pakett</th><th>Staatus</th><th>Esitatud</th></tr></thead><tbody>{items.map(c=><tr key={c.id}><td><a className="text-link" href={`/ettevotted/${c.id}`}><strong>{c.name}</strong> →</a><small>{c.category}</small></td><td>{c.municipality}</td><td>{planLabels[c.requestedPlan]}</td><td><span className="badge" data-status={c.status}>{statusNames[c.status]}</span></td><td>{new Date(c.createdAt).toLocaleDateString('et-EE')}</td></tr>)}</tbody></table></div>;
}
