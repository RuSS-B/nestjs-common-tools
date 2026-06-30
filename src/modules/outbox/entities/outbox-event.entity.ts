import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';
import { OutboxEventStatus } from '../enums';

@Entity()
export class OutboxEvent {
  @PrimaryColumn('uuid', { default: () => 'uuidv7()' })
  id: string;

  @Index()
  @Column({ name: 'event_type', type: 'varchar', length: 100, nullable: false })
  eventType: string;

  @Column({ type: 'jsonb', nullable: false })
  payload: Record<string, any>;

  @Column({
    type: 'enum',
    enum: OutboxEventStatus,
    default: OutboxEventStatus.PENDING,
  })
  status: OutboxEventStatus;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount: number;

  @Column({ name: 'max_retries', type: 'int', nullable: true })
  maxRetries: number | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @Index()
  @Column({
    type: 'timestamptz',
    name: 'processing_started_at',
    nullable: true,
  })
  processingStartedAt: Date | null;

  @Index()
  @Column({ type: 'timestamptz', name: 'next_try_at', nullable: true })
  nextTryAt: Date | null;

  @Column({ type: 'timestamptz', name: 'processed_at', nullable: true })
  processedAt: Date | null;
}
