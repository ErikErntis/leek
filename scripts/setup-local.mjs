import { copyFileSync, existsSync } from 'node:fs';
for(const path of ['apps/web','apps/portal','apps/admin','apps/api','packages/db']) {
 const target=`${path}/.env`;
 if(!existsSync(target)){copyFileSync(`${path}/.env.example`,target);console.log(`Created ${target}`);}
}
console.log('Local demo ready: pnpm dev');
