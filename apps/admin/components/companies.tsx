import { demoCompanies } from '@leek/contracts/demo';
import { planNames } from '@leek/contracts';
export function CompaniesTable(){return <div className="table-wrap"><table><thead><tr><th>Ettevõte</th><th>Piirkond</th><th>Pakett</th><th>Staatus</th></tr></thead><tbody>{demoCompanies.map(c=><tr key={c.id}><td><strong>{c.name}</strong><small>{c.category}</small></td><td>{c.municipality}</td><td>{planNames[c.plan]}</td><td><span className="badge">Avaldatud</span></td></tr>)}</tbody></table></div>;}
