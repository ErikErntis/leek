import { and, eq } from 'drizzle-orm';
import { defaultSiteContent, siteContentSchema, type SiteContent } from '@leek/contracts';
import { siteSettings, siteMedia, type createDatabase } from '@leek/db';
import { CompanyError } from './company-service';

type Database = ReturnType<typeof createDatabase>['db'];

export function createSiteContent(db: Database) {
 return {
  async read() {
   const [row] = await db.select().from(siteSettings).where(eq(siteSettings.id, 'public'));
   return { version: row?.version ?? 0, content: siteContentSchema.parse({ ...defaultSiteContent, ...row?.content }) };
  },
  async save(userId: string, version: number, content: SiteContent) {
   const paths = [content.heroImage, content.coastImage].filter(value => value.startsWith('/api/site-media/'));
   for (const path of paths) {
    const [asset] = await db.select({ id: siteMedia.id }).from(siteMedia).where(eq(siteMedia.id, path.slice('/api/site-media/'.length)));
    if (!asset) throw new CompanyError(400, 'Üleslaaditud pilti ei leitud.');
   }
   const [saved] = version === 0
    ? await db.insert(siteSettings).values({ id: 'public', content, updatedBy: userId })
     .onConflictDoNothing().returning()
    : await db.update(siteSettings).set({ content, version: version + 1, updatedBy: userId, updatedAt: new Date() })
     .where(and(eq(siteSettings.id, 'public'), eq(siteSettings.version, version))).returning();
   if (!saved) throw new CompanyError(409, 'Lehe sisu on vahepeal muudetud. Laadi värske versioon ja proovi uuesti.');
   return { version: saved.version, content: saved.content };
  },
 };
}
