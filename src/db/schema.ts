import { relations } from 'drizzle-orm';
import {
  bigint,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

// PostgreSQL Enums requested for Community News & Verification
export const newsStatusEnum = pgEnum('news_status', [
  'pending_review',
  'published',
  'rejected',
  'removed',
]);

export const newsCategoryEnum = pgEnum('news_category', [
  'local_daily',
  'invitation',
  'condolence',
  'services',
  'roads',
  'health',
  'education',
  'weather',
  'community',
  'other',
]);

export const verificationStatusEnum = pgEnum('verification_status', [
  'pending',
  'approved',
  'rejected',
  'expired',
]);

// Users table authenticated via Firebase Auth / Cloud SQL
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().notNull(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Community and Oasis Tasks (integrated with Google Tasks)
export const communityTasks = pgTable('community_tasks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  googleTaskId: text('google_task_id'),
  title: text('title').notNull(),
  notes: text('notes'),
  status: text('status').notNull().default('needsAction'),
  dueDate: text('due_date'),
  locationName: text('location_name'),
  category: text('category').default('community'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Oasis places shown on Google Maps
export const oasisPlaces = pgTable('oasis_places', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  nameAr: text('name_ar').notNull(),
  category: text('category').notNull(),
  lat: text('lat').notNull(),
  lng: text('lng').notNull(),
  description: text('description'),
  phone: text('phone'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Organization Verification Requests
export const organizationVerificationRequests = pgTable(
  'organization_verification_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => users.uuid, { onDelete: 'cascade' }),
    organizationName: text('organization_name').notNull(),
    officialDomain: text('official_domain'),
    publicContactUrl: text('public_contact_url'),
    proofPrivateRef: text('proof_private_ref').notNull(),
    status: verificationStatusEnum('status').notNull().default('pending'),
    reviewerId: uuid('reviewer_id').references(() => users.uuid),
    reviewerNote: text('reviewer_note'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    verifiedUntil: timestamp('verified_until', { withTimezone: true }),
  }
);

// Verified Organizations (Badge & Official Accreditation)
export const verifiedOrganizations = pgTable('verified_organizations', {
  accountId: uuid('account_id')
    .primaryKey()
    .references(() => users.uuid, { onDelete: 'cascade' }),
  verificationRequestId: uuid('verification_request_id')
    .notNull()
    .references(() => organizationVerificationRequests.id),
  organizationName: text('organization_name').notNull(),
  approvedBy: uuid('approved_by')
    .notNull()
    .references(() => users.uuid),
  approvedAt: timestamp('approved_at', { withTimezone: true }).notNull().defaultNow(),
  verifiedUntil: timestamp('verified_until', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  revocationReason: text('revocation_reason'),
});

// Community News Posts
export const newsPosts = pgTable('news_posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.uuid, { onDelete: 'cascade' }),
  category: newsCategoryEnum('category').notNull().default('other'),
  body: text('body').notNull(),
  sourceUrl: text('source_url'),
  locationLabel: text('location_label'),
  status: newsStatusEnum('status').notNull().default('pending_review'),
  moderationDecision: text('moderation_decision'),
  moderationReasons: jsonb('moderation_reasons').notNull().default([]),
  moderatorNote: text('moderator_note'),
  reviewedBy: uuid('reviewed_by').references(() => users.uuid),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// News Reactions (helpful feedback)
export const newsReactions = pgTable('news_reactions', {
  postId: uuid('post_id')
    .notNull()
    .references(() => newsPosts.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.uuid, { onDelete: 'cascade' }),
  reaction: text('reaction').notNull().default('helpful'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// News Comments
export const newsComments = pgTable('news_comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  postId: uuid('post_id')
    .notNull()
    .references(() => newsPosts.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.uuid, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  status: newsStatusEnum('status').notNull().default('pending_review'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// News Reposts
export const newsReposts = pgTable('news_reposts', {
  postId: uuid('post_id')
    .notNull()
    .references(() => newsPosts.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.uuid, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// News Reports
export const newsReports = pgTable('news_reports', {
  postId: uuid('post_id')
    .notNull()
    .references(() => newsPosts.id, { onDelete: 'cascade' }),
  reporterId: uuid('reporter_id')
    .notNull()
    .references(() => users.uuid, { onDelete: 'cascade' }),
  reason: text('reason').notNull(),
  details: text('details'),
  status: text('status').notNull().default('open'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Administrative & Verification Audit Log
export const newsAdminAudit = pgTable('news_admin_audit', {
  id: bigint('id', { mode: 'number' }).primaryKey(),
  actorId: uuid('actor_id')
    .notNull()
    .references(() => users.uuid),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: uuid('target_id').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  tasks: many(communityTasks),
  newsPosts: many(newsPosts),
  verificationRequests: many(organizationVerificationRequests),
  verifiedOrganizations: many(verifiedOrganizations),
}));

export const communityTasksRelations = relations(communityTasks, ({ one }) => ({
  user: one(users, {
    fields: [communityTasks.userId],
    references: [users.id],
  }),
}));

export const newsPostsRelations = relations(newsPosts, ({ one, many }) => ({
  author: one(users, {
    fields: [newsPosts.authorId],
    references: [users.uuid],
  }),
  reviewer: one(users, {
    fields: [newsPosts.reviewedBy],
    references: [users.uuid],
  }),
  reactions: many(newsReactions),
  comments: many(newsComments),
  reposts: many(newsReposts),
  reports: many(newsReports),
}));
