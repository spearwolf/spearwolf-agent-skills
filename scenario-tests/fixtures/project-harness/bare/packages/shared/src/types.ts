export interface Vec2 { x: number; y: number }
export interface Entity { id: number; pos: Vec2; sprite: string }
export type WorkerMessage = { type: 'snapshot'; entities: Entity[] };
