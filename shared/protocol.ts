import {z} from 'zod';
import {CHARACTERS,FACES,COLORS} from './appearance';
import {feedbackSchema} from './feedback';
import {GESTURES,DANCE_STYLES} from './social';
export const appearanceSchema=z.object({color:z.enum(COLORS),avatar:z.number().int().min(0).max(CHARACTERS.length-1),face:z.number().int().min(0).max(FACES.length-1).default(0),height:z.number().finite().min(1).max(2).default(1.7),weight:z.number().int().min(40).max(150).default(65)}).strict();
export const profileSchema=appearanceSchema.extend({name:z.string().trim().min(1).max(24)}).strict();
export const enterSchema=z.object({mode:z.enum(['create','join','resume']),profile:profileSchema,code:z.string().regex(/^[A-Z2-9]{6}$/).optional(),name:z.string().trim().min(1).max(40).optional(),private:z.boolean().optional(),token:z.string().max(100).optional()}).strict();
export type Enter=z.infer<typeof enterSchema>;
export const inputSchema=z.object({x:z.number().finite().min(-1).max(1),z:z.number().finite().min(-1).max(1),run:z.boolean().default(false)}).strict();
export const commandSchema=z.discriminatedUnion('type',[
 z.object({type:z.literal('sit'),table:z.number().int().min(1).max(17),seat:z.number().int().min(0).max(5)}).strict(),
 z.object({type:z.literal('stand')}).strict(),
 z.object({type:z.literal('lie'),enabled:z.boolean()}).strict(),
 feedbackSchema.extend({type:z.literal('feedback')}).strict(),
 z.object({type:z.literal('appearance'),appearance:appearanceSchema}).strict(),
 z.object({type:z.literal('reception'),text:z.string().trim().min(1).max(160)}).strict(),
 z.object({type:z.literal('chat'),channel:z.enum(['room','table']),text:z.string().trim().min(1).max(240)}).strict(),
 z.object({type:z.literal('order'),item:z.enum(['peanut','nem','squid','tofu','beer','soda','tea'])}).strict(),
 z.object({type:z.literal('clear')}).strict(),
 z.object({type:z.literal('emote'),emote:z.enum(GESTURES)}).strict(),
 z.object({type:z.literal('carry'),enabled:z.boolean()}).strict(),
 z.object({type:z.literal('sober')}).strict(),
 z.object({type:z.literal('invite'),table:z.number().int().min(1).max(17)}).strict(),
 z.object({type:z.literal('dance'),style:z.enum([...DANCE_STYLES,'stop'])}).strict(),
 z.object({type:z.literal('battle'),action:z.enum(['challenge','accept','decline','vote']),target:z.string().uuid().optional()}).strict(),
 z.object({type:z.literal('round'),action:z.enum(['start','next','skip','end'])}).strict(),
 z.object({type:z.literal('kick'),target:z.string().uuid()}).strict(),
 z.object({type:z.literal('voice')}).strict(),
]);
export type Command=z.infer<typeof commandSchema>;
