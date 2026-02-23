import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('delivery_config')
export class DeliveryConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ default: 'neighborhood' })
  mode: string;

  @Column({ name: 'origin_address', nullable: true })
  originAddress: string;

  @Column({ name: 'origin_latitude', type: 'float', nullable: true })
  originLatitude: number;

  @Column({ name: 'origin_longitude', type: 'float', nullable: true })
  originLongitude: number;

  @Column({ name: 'max_distance_km', type: 'float', default: 10 })
  maxDistanceKm: number;

  @Column({ name: 'fallback_fee', type: 'int', default: 0 })
  fallbackFee: number;

  @Column({ name: 'allow_manual_override', default: false })
  allowManualOverride: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
