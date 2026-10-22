import type { Express, Request, Response } from 'express';
import {
  getOasisPlaces,
  getCommunityTasks,
  createCommunityTask,
  updateCommunityTaskStatus,
  deleteCommunityTask,
  getOrCreateUser,
} from '../db/repository.ts';

const FALLBACK_PLACES = [
  {
    id: 1,
    name: 'Ain Salah Public Hospital',
    nameAr: 'مستشفى عين صالح العمومي',
    category: 'health',
    lat: '27.1952',
    lng: '2.4820',
    description: 'المستشفى الرئيسي لخدمات الطوارئ والرعاية الصحية بالواحة',
    phone: '+213 29 73 11 11',
  },
  {
    id: 2,
    name: 'Old Ksar of In Salah',
    nameAr: 'قصر عين صالح الأثري والعتيق',
    category: 'heritage',
    lat: '27.2005',
    lng: '2.4780',
    description: 'معلم تاريخي يعبر عن العمارة الطينية الصحراوية العريقة',
    phone: null,
  },
  {
    id: 3,
    name: 'Martyrs Square & Palm Grove',
    nameAr: 'ساحة الشهداء وبساتين النخيل',
    category: 'oasis',
    lat: '27.1980',
    lng: '2.4845',
    description: 'قلب الواحة الأخضر وبساتين التمور العريقة والممشى الترفيهي',
    phone: null,
  },
  {
    id: 4,
    name: 'Ain Salah Municipality Council',
    nameAr: 'مقر بلدية عين صالح والمجلس الشعبي',
    category: 'public_service',
    lat: '27.1940',
    lng: '2.4860',
    description: 'مركز الخدمات الإدارية والمجتمعية للمواطنين',
    phone: '+213 29 73 20 20',
  },
  {
    id: 5,
    name: 'In Salah Meteorological Station',
    nameAr: 'محطة رصد الطقس والمناخ الصحراوي',
    category: 'weather',
    lat: '27.2180',
    lng: '2.5120',
    description: 'محطة رصد درجات الحرارة والرياح والعواصف الرملية بمنطقة تيديكلت',
    phone: null,
  },
  {
    id: 6,
    name: 'Traditional Crafts & Date Market',
    nameAr: 'سوق التمور والحرف التقليدية',
    category: 'market',
    lat: '27.1965',
    lng: '2.4830',
    description: 'سوق أسبوعي لمنتجات الواحة وأواني الفخار وزراعة النخيل',
    phone: null,
  },
  {
    id: 7,
    name: 'Historic Foggara Irrigation System',
    nameAr: 'نظام فقارة عين صالح للري التقليدي',
    category: 'oasis',
    lat: '27.1890',
    lng: '2.4910',
    description: 'شبكة توزيع المياه الجوفية التراثية التي غذت بساتين الواحة لقرون',
    phone: null,
  },
];

export function registerCloudSqlAndTasksRoutes(app: Express) {
  // Maps API Key endpoint
  app.get('/api/maps/config', (_req: Request, res: Response) => {
    res.json({
      apiKey: process.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCllkJGcequpdYXfB5Eg6Qyu5ZEUqfCsRk',
    });
  });

  // Oasis places from Cloud SQL
  app.get('/api/oasis-places', async (_req: Request, res: Response) => {
    try {
      const places = await getOasisPlaces();
      if (places && places.length > 0) {
        return res.json({ success: true, places });
      }
      return res.json({ success: true, places: FALLBACK_PLACES });
    } catch (err) {
      console.warn('Falling back to default oasis places:', err);
      return res.json({ success: true, places: FALLBACK_PLACES });
    }
  });

  // Community tasks from Cloud SQL
  app.get('/api/community-tasks', async (_req: Request, res: Response) => {
    try {
      const tasks = await getCommunityTasks();
      res.json({ success: true, tasks });
    } catch (err: any) {
      console.warn('Failed to fetch tasks from Cloud SQL:', err);
      res.json({ success: true, tasks: [] });
    }
  });

  // Create community task in Cloud SQL
  app.post('/api/community-tasks', async (req: Request, res: Response) => {
    try {
      const { title, notes, status, dueDate, locationName, category, googleTaskId } = req.body;
      if (!title || typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: 'العنوان مطلوب' });
      }

      const newTask = await createCommunityTask({
        title: title.trim(),
        notes: notes?.trim() || null,
        status: status || 'needsAction',
        dueDate: dueDate || null,
        locationName: locationName || null,
        category: category || 'community',
        googleTaskId: googleTaskId || null,
      });

      res.status(201).json({ success: true, task: newTask });
    } catch (err: any) {
      console.error('Failed to create task in Cloud SQL:', err);
      res.status(500).json({ error: 'تعذر حفظ المهمة في قاعدة البيانات' });
    }
  });

  // Update task status
  app.patch('/api/community-tasks/:id', async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.id, 10);
      const { status } = req.body;
      if (isNaN(taskId) || !status) {
        return res.status(400).json({ error: 'معرّف المهمة أو الحالة غير صالح' });
      }

      const updated = await updateCommunityTaskStatus(taskId, status);
      res.json({ success: true, task: updated });
    } catch (err: any) {
      console.error('Failed to update task in Cloud SQL:', err);
      res.status(500).json({ error: 'تعذر تعديل المهمة' });
    }
  });

  // Delete task
  app.delete('/api/community-tasks/:id', async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.id, 10);
      if (isNaN(taskId)) {
        return res.status(400).json({ error: 'معرّف المهمة غير صالح' });
      }

      await deleteCommunityTask(taskId);
      res.json({ success: true, message: 'تم حذف المهمة بنجاح' });
    } catch (err: any) {
      console.error('Failed to delete task from Cloud SQL:', err);
      res.status(500).json({ error: 'تعذر حذف المهمة' });
    }
  });

  // Sync authenticated user into Cloud SQL
  app.post('/api/sync-user', async (req: Request, res: Response) => {
    try {
      const { uid, email, name } = req.body;
      if (!uid || !email) {
        return res.status(400).json({ error: 'بيانات المستخدم غير مكتملة' });
      }

      const user = await getOrCreateUser(uid, email, name);
      res.json({ success: true, user });
    } catch (err: any) {
      console.error('Failed to sync user with Cloud SQL:', err);
      res.status(500).json({ error: 'تعذر مزامنة المستخدم' });
    }
  });
}
