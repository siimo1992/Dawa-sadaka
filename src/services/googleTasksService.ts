export interface GoogleTaskItem {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  updated?: string;
  position?: string;
}

export interface GoogleTaskList {
  id: string;
  title: string;
  updated?: string;
}

/**
 * Lists the user's task lists from Google Tasks API.
 */
export async function fetchGoogleTaskLists(accessToken: string): Promise<GoogleTaskList[]> {
  try {
    const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.items || [];
  } catch (error) {
    console.error('Failed to fetch Google Task lists:', error);
    throw error;
  }
}

/**
 * Lists tasks in a specific Google Tasks list.
 */
export async function fetchGoogleTasks(
  accessToken: string,
  taskListId = '@default'
): Promise<GoogleTaskItem[]> {
  try {
    const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks?showCompleted=true&showHidden=true`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.items || [];
  } catch (error) {
    console.error('Failed to fetch Google tasks:', error);
    throw error;
  }
}

/**
 * Creates a new task in Google Tasks.
 */
export async function createGoogleTask(
  accessToken: string,
  task: { title: string; notes?: string; due?: string },
  taskListId = '@default'
): Promise<GoogleTaskItem> {
  try {
    const body: Record<string, any> = {
      title: task.title,
    };
    if (task.notes) body.notes = task.notes;
    if (task.due) body.due = new Date(task.due).toISOString();

    const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error('Failed to create Google task:', error);
    throw error;
  }
}

/**
 * Updates status of a task in Google Tasks.
 */
export async function updateGoogleTaskStatus(
  accessToken: string,
  taskId: string,
  status: 'needsAction' | 'completed',
  taskListId = '@default'
): Promise<GoogleTaskItem> {
  try {
    const res = await fetch(
      `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          completed: status === 'completed' ? new Date().toISOString() : null,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error('Failed to update Google task:', error);
    throw error;
  }
}

/**
 * Deletes a task from Google Tasks. Requires user confirmation before calling!
 */
export async function deleteGoogleTask(
  accessToken: string,
  taskId: string,
  taskListId = '@default'
): Promise<void> {
  try {
    const res = await fetch(
      `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!res.ok && res.status !== 204) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }
  } catch (error) {
    console.error('Failed to delete Google task:', error);
    throw error;
  }
}
