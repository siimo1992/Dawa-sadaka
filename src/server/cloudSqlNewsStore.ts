import { createPool } from '../db/index.ts';
import type {
  NewsPost,
  NewsStore,
  PostStatus,
  PostCategory,
  ModerationResult,
} from './communityNewsServer.ts';

export class CloudSqlNewsStore implements NewsStore {
  private pool = createPool();

  private async getOrCreateUserUuid(userId: string, userName?: string): Promise<string> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    if (isUuid) {
      const check = await this.pool.query('SELECT uuid FROM users WHERE uuid = $1', [userId]);
      if (check.rows.length > 0) return check.rows[0].uuid;
    }

    const res = await this.pool.query(
      `INSERT INTO users (uid, email, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (uid) DO UPDATE
       SET name = COALESCE(EXCLUDED.name, users.name)
       RETURNING uuid`,
      [userId, `${userId.replace(/[^a-zA-Z0-9_-]/g, '_')}@tidikelt.dz`, userName || 'مستخدم الواحة']
    );
    return res.rows[0].uuid;
  }

  async listPublishedPosts(limit = 100): Promise<NewsPost[]> {
    const query = `
      SELECT
        p.id,
        p.author_id as "authorId",
        u.name as "authorName",
        p.body as text,
        p.category,
        p.source_url as "sourceUrl",
        p.location_label as location,
        p.status,
        p.moderator_note as "moderatorNote",
        p.created_at as "createdAt",
        COALESCE(vo.verified_until IS NOT NULL AND vo.verified_until > NOW() AND vo.revoked_at IS NULL, false) as "officialVerified",
        vo.verified_until as "verifiedUntil",
        COALESCE((SELECT COUNT(*)::int FROM news_reactions r WHERE r.post_id = p.id), 0) as "likeCount",
        COALESCE((SELECT COUNT(*)::int FROM news_comments c WHERE c.post_id = p.id AND c.status = 'published'), 0) as "commentCount",
        COALESCE((SELECT COUNT(*)::int FROM news_reposts rp WHERE rp.post_id = p.id), 0) as "repostCount",
        COALESCE((SELECT COUNT(DISTINCT user_id)::int FROM (
           SELECT user_id FROM news_reactions WHERE post_id = p.id
           UNION
           SELECT user_id FROM news_comments WHERE post_id = p.id
           UNION
           SELECT user_id FROM news_reposts WHERE post_id = p.id
        ) eng), 0) as "uniqueEngagers",
        COALESCE((SELECT COUNT(DISTINCT reporter_id)::int FROM news_reports rep WHERE rep.post_id = p.id), 0) as "uniqueReports"
      FROM news_posts p
      JOIN users u ON u.uuid = p.author_id
      LEFT JOIN verified_organizations vo ON vo.account_id = p.author_id
      WHERE p.status = 'published'
      ORDER BY p.created_at DESC
      LIMIT $1;
    `;
    const res = await this.pool.query(query, [limit]);
    return res.rows.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt),
      verifiedUntil: row.verifiedUntil ? new Date(row.verifiedUntil) : null,
    }));
  }

  async listAllPosts(limit = 200): Promise<NewsPost[]> {
    const query = `
      SELECT
        p.id,
        p.author_id as "authorId",
        u.name as "authorName",
        p.body as text,
        p.category,
        p.source_url as "sourceUrl",
        p.location_label as location,
        p.status,
        p.moderator_note as "moderatorNote",
        p.created_at as "createdAt",
        COALESCE(vo.verified_until IS NOT NULL AND vo.verified_until > NOW() AND vo.revoked_at IS NULL, false) as "officialVerified",
        vo.verified_until as "verifiedUntil",
        COALESCE((SELECT COUNT(*)::int FROM news_reactions r WHERE r.post_id = p.id), 0) as "likeCount",
        COALESCE((SELECT COUNT(*)::int FROM news_comments c WHERE c.post_id = p.id), 0) as "commentCount",
        COALESCE((SELECT COUNT(*)::int FROM news_reposts rp WHERE rp.post_id = p.id), 0) as "repostCount",
        COALESCE((SELECT COUNT(DISTINCT user_id)::int FROM news_reactions WHERE post_id = p.id), 0) as "uniqueEngagers",
        COALESCE((SELECT COUNT(DISTINCT reporter_id)::int FROM news_reports rep WHERE rep.post_id = p.id), 0) as "uniqueReports"
      FROM news_posts p
      JOIN users u ON u.uuid = p.author_id
      LEFT JOIN verified_organizations vo ON vo.account_id = p.author_id
      ORDER BY p.created_at DESC
      LIMIT $1;
    `;
    const res = await this.pool.query(query, [limit]);
    return res.rows.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt),
      verifiedUntil: row.verifiedUntil ? new Date(row.verifiedUntil) : null,
    }));
  }

  async createPost(input: Omit<NewsPost, 'id' | 'createdAt' | 'likeCount' | 'commentCount' | 'repostCount' | 'uniqueEngagers' | 'uniqueReports' | 'officialVerified' | 'verifiedUntil'>): Promise<NewsPost> {
    const authorUuid = await this.getOrCreateUserUuid(input.authorId, input.authorName || undefined);
    const res = await this.pool.query(
      `INSERT INTO news_posts (
         author_id, category, body, source_url, location_label, status,
         moderation_decision, moderator_note, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING id, author_id as "authorId", body as text, category,
                 source_url as "sourceUrl", location_label as location,
                 status, moderator_note as "moderatorNote", created_at as "createdAt"`,
      [
        authorUuid,
        input.category,
        input.text,
        input.sourceUrl || null,
        input.location || null,
        input.status,
        input.status === 'published' ? 'allow' : input.status === 'rejected' ? 'block' : 'review',
        input.moderatorNote || null,
      ]
    );

    const row = res.rows[0];
    return {
      ...row,
      authorName: input.authorName || null,
      authorPhotoUrl: input.authorPhotoUrl || null,
      createdAt: new Date(row.createdAt),
      officialVerified: false,
      verifiedUntil: null,
      likeCount: 0,
      commentCount: 0,
      repostCount: 0,
      uniqueEngagers: 0,
      uniqueReports: 0,
    };
  }

  async updatePostStatus(postId: string, status: PostStatus, moderatorId: string, note?: string): Promise<void> {
    const moderatorUuid = await this.getOrCreateUserUuid(moderatorId, 'مشرف المنصة');
    await this.pool.query(
      `UPDATE news_posts
       SET status = $1, reviewed_by = $2, reviewed_at = NOW(), moderator_note = $3, updated_at = NOW()
       WHERE id = $4`,
      [status, moderatorUuid, note || null, postId]
    );

    // Audit log
    await this.pool.query(
      `INSERT INTO news_admin_audit (actor_id, action, target_type, target_id, note)
       VALUES ($1, $2, 'news_post', $3, $4)`,
      [moderatorUuid, `status_change_to_${status}`, postId, note || 'تحديث حالة المنشور']
    );
  }

  async saveModeration(postId: string, result: ModerationResult): Promise<void> {
    await this.pool.query(
      `UPDATE news_posts
       SET moderation_decision = $1,
           moderation_reasons = $2::jsonb,
           moderator_note = COALESCE(moderator_note, $3)
       WHERE id = $4`,
      [result.decision, JSON.stringify(result.reasons || []), result.moderatorNote || null, postId]
    );
  }

  async findVerificationRequest(requestId: string): Promise<{ id: string; status: 'pending' | 'approved' | 'rejected'; proofPrivateRef: string; organizationName: string; accountId: string } | null> {
    const res = await this.pool.query(
      `SELECT id, status, proof_private_ref as "proofPrivateRef", organization_name as "organizationName", account_id as "accountId"
       FROM organization_verification_requests
       WHERE id = $1`,
      [requestId]
    );
    return res.rows[0] || null;
  }

  // Transaction-safe verification approval with badge creation and audit logging
  async decideVerification(requestId: string, decision: 'approved' | 'rejected', ownerId: string, note: string, verifiedUntil?: Date): Promise<void> {
    const ownerUuid = await this.getOrCreateUserUuid(ownerId, 'مالك النظام');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const reqRes = await client.query(
        `UPDATE organization_verification_requests
         SET status = $1, reviewer_id = $2, reviewer_note = $3, reviewed_at = NOW(), verified_until = $4
         WHERE id = $5
         RETURNING account_id, organization_name`,
        [decision, ownerUuid, note, verifiedUntil || null, requestId]
      );

      if (reqRes.rows.length === 0) {
        throw new Error('طلب التوثيق غير موجود.');
      }

      const { account_id, organization_name } = reqRes.rows[0];

      if (decision === 'approved' && verifiedUntil) {
        await client.query(
          `INSERT INTO verified_organizations (
             account_id, verification_request_id, organization_name, approved_by, approved_at, verified_until
           ) VALUES ($1, $2, $3, $4, NOW(), $5)
           ON CONFLICT (account_id) DO UPDATE
           SET verified_until = EXCLUDED.verified_until,
               revoked_at = NULL,
               approved_by = EXCLUDED.approved_by,
               approved_at = NOW()`,
          [account_id, requestId, organization_name, ownerUuid, verifiedUntil]
        );
      }

      // Record immutable audit entry
      await client.query(
        `INSERT INTO news_admin_audit (actor_id, action, target_type, target_id, note)
         VALUES ($1, $2, 'organization_verification', $3, $4)`,
        [ownerUuid, `verification_${decision}`, requestId, note]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async markPostForReview(postId: string, reason: string): Promise<void> {
    await this.pool.query(
      `UPDATE news_posts
       SET status = 'pending_review',
           moderator_note = CONCAT('[مراجعة تلقائية للبلاغات]: ', $1::text)
       WHERE id = $2`,
      [reason, postId]
    );
  }

  async countRecentRepostsByUser(userId: string, since: Date): Promise<number> {
    const userUuid = await this.getOrCreateUserUuid(userId);
    const res = await this.pool.query(
      `SELECT COUNT(*)::int as count FROM news_reposts
       WHERE user_id = $1 AND created_at >= $2`,
      [userUuid, since]
    );
    return res.rows[0]?.count || 0;
  }

  async hasReposted(postId: string, userId: string): Promise<boolean> {
    const userUuid = await this.getOrCreateUserUuid(userId);
    const res = await this.pool.query(
      `SELECT 1 FROM news_reposts WHERE post_id = $1 AND user_id = $2`,
      [postId, userUuid]
    );
    return res.rows.length > 0;
  }

  async createRepost(postId: string, userId: string): Promise<void> {
    const userUuid = await this.getOrCreateUserUuid(userId);
    await this.pool.query(
      `INSERT INTO news_reposts (post_id, user_id, created_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (post_id, user_id) DO NOTHING`,
      [postId, userUuid]
    );
  }

  async toggleLike(postId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    const userUuid = await this.getOrCreateUserUuid(userId);
    const check = await this.pool.query(
      `SELECT 1 FROM news_reactions WHERE post_id = $1 AND user_id = $2`,
      [postId, userUuid]
    );

    let liked = false;
    if (check.rows.length > 0) {
      await this.pool.query(`DELETE FROM news_reactions WHERE post_id = $1 AND user_id = $2`, [postId, userUuid]);
      liked = false;
    } else {
      await this.pool.query(
        `INSERT INTO news_reactions (post_id, user_id, reaction, created_at)
         VALUES ($1, $2, 'helpful', NOW())
         ON CONFLICT (post_id, user_id) DO NOTHING`,
        [postId, userUuid]
      );
      liked = true;
    }

    const countRes = await this.pool.query(
      `SELECT COUNT(*)::int as count FROM news_reactions WHERE post_id = $1`,
      [postId]
    );
    return { liked, likeCount: countRes.rows[0]?.count || 0 };
  }

  async addReport(postId: string, userId: string, reason: string): Promise<{ totalReports: number }> {
    const userUuid = await this.getOrCreateUserUuid(userId);
    await this.pool.query(
      `INSERT INTO news_reports (post_id, reporter_id, reason, status, created_at)
       VALUES ($1, $2, $3, 'open', NOW())
       ON CONFLICT (post_id, reporter_id) DO NOTHING`,
      [postId, userUuid, reason.trim().slice(0, 120)]
    );

    const countRes = await this.pool.query(
      `SELECT COUNT(DISTINCT reporter_id)::int as count FROM news_reports WHERE post_id = $1`,
      [postId]
    );
    const totalReports = countRes.rows[0]?.count || 0;
    if (totalReports >= 3) {
      await this.markPostForReview(postId, 'وصلت بلاغات فريدة متعددة؛ يلزم فحص مشرف.');
    }
    return { totalReports };
  }

  getModeration(postId: string): ModerationResult | null {
    return null;
  }
}
