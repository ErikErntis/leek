import { getSiteContent } from '../../lib/site-content';

export const metadata = { title: 'Loode-Eesti ettevõtlusklubist', alternates: { canonical: '/klubist' } };

export default async function About() {
 const content = await getSiteContent();
 return <div className="container"><article className="prose">
  <span className="eyebrow">{content.aboutEyebrow}</span>
  <h1 className="site-copy-lines">{content.aboutTitle}</h1>
  <p className="site-copy-lines">{content.aboutLead}</p>
  <h2>{content.aboutSubtitle}</h2><p className="site-copy-lines">{content.aboutBody}</p>
  <h2>{content.aboutSecondTitle}</h2><p className="site-copy-lines">{content.aboutSecondBody}</p>
  <a className="button" href={content.aboutLink}>{content.aboutButton}</a>
 </article></div>;
}
