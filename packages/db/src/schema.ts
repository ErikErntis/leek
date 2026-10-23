import { pgTable, uuid, text, timestamp, boolean, uniqueIndex, index, primaryKey, pgEnum, integer, bigint } from 'drizzle-orm/pg-core';
export const publicationStatus = pgEnum('publication_status', ['draft','pending','published','rejected']);
export const contentStatus = pgEnum('content_status', ['draft','pending','published','closed']);
export const plan = pgEnum('plan', ['free','visibility','employer']);
export const companyRole = pgEnum('company_role', ['owner','editor']);
export const platformRole = pgEnum('platform_role', ['member','admin']);
const created = () => timestamp('created_at', {withTimezone:true}).notNull().defaultNow();
export const users = pgTable('users', {id:uuid().primaryKey().defaultRandom(), name:text().notNull(), email:text().notNull(), role:platformRole().notNull().default('member'), emailVerified:boolean('email_verified').notNull().default(false), image:text(), updatedAt:timestamp('updated_at',{withTimezone:true}).notNull().defaultNow(), createdAt:created()}, t=>[uniqueIndex('users_email_unique').on(t.email)]);
export const companies = pgTable('companies', {
 id:uuid().primaryKey().defaultRandom(), slug:text().notNull(), name:text().notNull(), registrationCode:text('registration_code').notNull(), category:text().notNull(), municipality:text().notNull(), tagline:text().notNull().default(''), description:text().notNull().default(''), email:text().notNull(), phone:text().notNull().default(''), website:text().notNull(), address:text().notNull().default(''), image:text().notNull().default('/images/workshop.webp'), services:text().array().notNull().default([]), additionalCategories:text('additional_categories').array().notNull().default([]), settlement:text().notNull().default(''), employees:text().notNull().default(''), paidUntil:timestamp('paid_until',{withTimezone:true}), requestedPlan:plan('requested_plan').notNull().default('free'), submittedBy:uuid('submitted_by').references(()=>users.id,{onDelete:'set null'}), reviewedBy:uuid('reviewed_by').references(()=>users.id,{onDelete:'set null'}), reviewedAt:timestamp('reviewed_at',{withTimezone:true}), reviewNote:text('review_note').notNull().default(''), plan:plan().notNull().default('free'), status:publicationStatus().notNull().default('draft'), featured:boolean().notNull().default(false), createdAt:created(), updatedAt:timestamp('updated_at',{withTimezone:true}).notNull().defaultNow()
},t=>[uniqueIndex('companies_slug_unique').on(t.slug),uniqueIndex('companies_registration_unique').on(t.registrationCode),index('companies_directory_idx').on(t.status,t.category,t.municipality)]);
export const memberships = pgTable('company_memberships',{userId:uuid('user_id').notNull().references(()=>users.id,{onDelete:'cascade'}),companyId:uuid('company_id').notNull().references(()=>companies.id,{onDelete:'cascade'}),role:companyRole().notNull().default('editor'),createdAt:created()},t=>[primaryKey({columns:[t.userId,t.companyId]})]);
export const subscriptions = pgTable('subscriptions',{id:uuid().primaryKey().defaultRandom(),companyId:uuid('company_id').notNull().references(()=>companies.id,{onDelete:'cascade'}),plan:plan().notNull(),status:text().notNull().default('pending'),startsAt:timestamp('starts_at',{withTimezone:true}),expiresAt:timestamp('expires_at',{withTimezone:true}),createdAt:created()},t=>[index('subscriptions_company_idx').on(t.companyId)]);
export const jobs = pgTable('jobs',{id:uuid().primaryKey().defaultRandom(),slug:text().notNull().unique(),companyId:uuid('company_id').notNull().references(()=>companies.id,{onDelete:'cascade'}),title:text().notNull(),municipality:text().notNull(),type:text().notNull(),description:text().notNull(),expiresAt:timestamp('expires_at',{withTimezone:true}).notNull(),status:contentStatus().notNull().default('draft'),createdAt:created()},t=>[index('jobs_public_idx').on(t.status,t.expiresAt)]);
export const offers = pgTable('offers',{id:uuid().primaryKey().defaultRandom(),companyId:uuid('company_id').notNull().references(()=>companies.id,{onDelete:'cascade'}),title:text().notNull(),description:text().notNull(),expiresAt:timestamp('expires_at',{withTimezone:true}).notNull(),status:contentStatus().notNull().default('draft'),createdAt:created()},t=>[index('offers_public_idx').on(t.status,t.expiresAt)]);

// Better Auth core tables; existing users and company memberships retain their UUIDs.
export const authSessions = pgTable('auth_sessions', {
 id:uuid().primaryKey().defaultRandom(), token:text().notNull().unique(),
 userId:uuid('user_id').notNull().references(()=>users.id,{onDelete:'cascade'}),
 expiresAt:timestamp('expires_at',{withTimezone:true}).notNull(),
 ipAddress:text('ip_address'), userAgent:text('user_agent'), createdAt:created(),
 updatedAt:timestamp('updated_at',{withTimezone:true}).notNull().defaultNow(),
},t=>[index('auth_sessions_user_idx').on(t.userId)]);
export const authAccounts = pgTable('auth_accounts', {
 id:uuid().primaryKey().defaultRandom(), accountId:text('account_id').notNull(), providerId:text('provider_id').notNull(),
 userId:uuid('user_id').notNull().references(()=>users.id,{onDelete:'cascade'}),
 accessToken:text('access_token'), refreshToken:text('refresh_token'), idToken:text('id_token'),
 accessTokenExpiresAt:timestamp('access_token_expires_at',{withTimezone:true}),
 refreshTokenExpiresAt:timestamp('refresh_token_expires_at',{withTimezone:true}),
 scope:text(), password:text(), createdAt:created(), updatedAt:timestamp('updated_at',{withTimezone:true}).notNull().defaultNow(),
},t=>[index('auth_accounts_user_idx').on(t.userId),uniqueIndex('auth_accounts_provider_unique').on(t.providerId,t.accountId)]);
export const authVerifications = pgTable('auth_verifications', {
 id:uuid().primaryKey().defaultRandom(), identifier:text().notNull(), value:text().notNull(),
 expiresAt:timestamp('expires_at',{withTimezone:true}).notNull(), createdAt:created(),
 updatedAt:timestamp('updated_at',{withTimezone:true}).notNull().defaultNow(),
},t=>[index('auth_verifications_identifier_idx').on(t.identifier)]);
export const authRateLimits = pgTable('auth_rate_limits', {
 id:uuid().primaryKey().defaultRandom(), key:text().notNull().unique(), count:integer().notNull(), lastRequest:bigint('last_request',{mode:'number'}).notNull(),
});

// Contact-person data never belongs in public company responses.
export const companyContacts = pgTable('company_contacts', {
 companyId:uuid('company_id').primaryKey().references(()=>companies.id,{onDelete:'cascade'}),
 name:text().notNull(), role:text().notNull().default(''), email:text().notNull(), phone:text().notNull().default(''),
});

export const billingCheckouts = pgTable('billing_checkouts', {
 id: uuid().primaryKey().defaultRandom(), companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
 plan: plan().notNull(), amount: integer().notNull(), status: text().notNull().default('pending'),
 stripeSessionId: text('stripe_session_id').unique(), paidAt: timestamp('paid_at', { withTimezone: true }), createdAt: created(),
}, t => [index('billing_checkouts_company_idx').on(t.companyId)]);
export const portalTickets = pgTable('portal_tickets', {
 tokenHash: text('token_hash').primaryKey(), cookie: text().notNull(), expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});
