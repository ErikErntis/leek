import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, lt } from 'drizzle-orm';
import { portalTickets, type createDatabase } from '@leek/db';
export function createPortalTransfer(db: ReturnType<typeof createDatabase>['db']) {
 const hash=(code:string)=>createHash('sha256').update(code).digest('hex');
 return {
  async issue(header:string) {
   const cookie=header.split(';').map(x=>x.trim()).find(x=>/^(?:__Secure-)?leek\.session_token=/.test(x));
   if (!cookie) throw new Error('Missing session cookie');
   const code=randomBytes(32).toString('hex');
   await db.delete(portalTickets).where(lt(portalTickets.expiresAt,new Date()));
   await db.insert(portalTickets).values({tokenHash:hash(code),cookie,expiresAt:new Date(Date.now()+60000)});
   return {code};
  },
  async redeem(code:string) {
   const [ticket]=await db.delete(portalTickets).where(and(eq(portalTickets.tokenHash,hash(code)),gt(portalTickets.expiresAt,new Date()))).returning();
   return ticket?.cookie;
  },
 };
}
