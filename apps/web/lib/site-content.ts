import 'server-only';
import { cache } from 'react';
import { defaultSiteContent, siteContentSchema } from '@leek/contracts';
import { apiURL } from './portal';

export const getSiteContent = cache(async () => {
 if (process.env.DEMO_MODE === 'true') return defaultSiteContent;
 const response = await fetch(apiURL('/v1/site-content'), { cache: 'no-store', signal: AbortSignal.timeout(8000) });
 if (!response.ok) throw new Error('Lehe sisu ei saanud laadida.');
 const { content } = await response.json();
 return siteContentSchema.parse(content);
});
