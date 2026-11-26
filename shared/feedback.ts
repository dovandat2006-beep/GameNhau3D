import {z} from 'zod';
export const FEEDBACK_CATEGORIES=['idea','bug','graphics','gameplay','social','other'] as const;
export const FEEDBACK_LABELS:Record<typeof FEEDBACK_CATEGORIES[number],string>={idea:'Ý tưởng tính năng',bug:'Báo lỗi',graphics:'Đồ họa / nhân vật',gameplay:'Điều khiển / lối chơi',social:'Giao lưu / âm thanh',other:'Khác'};
export const feedbackSchema=z.object({category:z.enum(FEEDBACK_CATEGORIES),text:z.string().transform(s=>s.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g,'').trim()).pipe(z.string().min(10).max(1000))}).strict();
export type FeedbackInput=z.infer<typeof feedbackSchema>;
export const feedbackEntrySchema=feedbackSchema.extend({id:z.string().uuid(),createdAt:z.string().datetime(),playerName:z.string().max(24),roomCode:z.string().regex(/^[A-Z2-9]{6}$/)}).strict();
export type FeedbackEntry=z.infer<typeof feedbackEntrySchema>;
