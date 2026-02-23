import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('reservation_blocks')
export class ReservationBlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'block_date' })
  blockDate: string;

  @Column({ name: 'start_time', nullable: true })
  startTime: string;

  @Column({ name: 'end_time', nullable: true })
  endTime: string;

  @Column({ name: 'all_day', default: false })
  allDay: boolean;

  @Column({ nullable: true })
  reason: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
