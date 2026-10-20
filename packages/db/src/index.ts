import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
export * from './schema';
export function createDatabase(url: string) {
 const client = postgres(url,{max:5,connect_timeout:10,idle_timeout:20,prepare:false,connection:{statement_timeout:15000,lock_timeout:5000}});
 return { db:drizzle(client,{schema}), close:()=>client.end({timeout:5}) };
}
