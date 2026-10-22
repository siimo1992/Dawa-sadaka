import { db } from './index.ts';
import { users, communityTasks, oasisPlaces } from './schema.ts';
import { eq, desc } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string, name?: string) {
  try {
    const result = await db.insert(users)
      .values({
        uid,
        email,
        name: name || null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          ...(name ? { name } : {}),
        },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database user upsert failed:', error);
    throw new Error('Failed to sync user with database', { cause: error });
  }
}

export async function getOasisPlaces() {
  try {
    return await db.select().from(oasisPlaces);
  } catch (error) {
    console.error('Database query failed for oasis places:', error);
    throw new Error('Failed to load oasis places', { cause: error });
  }
}

export async function getCommunityTasks(userId?: number) {
  try {
    if (userId) {
      return await db.select().from(communityTasks).where(eq(communityTasks.userId, userId)).orderBy(desc(communityTasks.createdAt));
    }
    return await db.select().from(communityTasks).orderBy(desc(communityTasks.createdAt));
  } catch (error) {
    console.error('Database query failed for tasks:', error);
    throw new Error('Failed to load tasks', { cause: error });
  }
}

export async function createCommunityTask(taskData: {
  userId?: number;
  googleTaskId?: string;
  title: string;
  notes?: string;
  status?: string;
  dueDate?: string;
  locationName?: string;
  category?: string;
}) {
  try {
    const result = await db.insert(communityTasks).values(taskData).returning();
    return result[0];
  } catch (error) {
    console.error('Database task create failed:', error);
    throw new Error('Failed to create task', { cause: error });
  }
}

export async function updateCommunityTaskStatus(taskId: number, status: string) {
  try {
    const result = await db.update(communityTasks)
      .set({ status })
      .where(eq(communityTasks.id, taskId))
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database task update failed:', error);
    throw new Error('Failed to update task', { cause: error });
  }
}

export async function deleteCommunityTask(taskId: number) {
  try {
    await db.delete(communityTasks).where(eq(communityTasks.id, taskId));
    return { success: true };
  } catch (error) {
    console.error('Database task delete failed:', error);
    throw new Error('Failed to delete task', { cause: error });
  }
}
