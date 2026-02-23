import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Company } from './company.entity';

@Entity('company_public_links')
export class CompanyPublicLinks {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @OneToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'menu_token', nullable: true })
  menuToken: string;

  @Column({ name: 'tv_token', nullable: true })
  tvToken: string;

  @Column({ name: 'roleta_token', nullable: true })
  roletaToken: string;

  @Column({ name: 'kds_token', nullable: true })
  kdsToken: string;

  @Column({ name: 'scale_token', nullable: true })
  scaleToken: string;

  @Column({ name: 'menu_token_v2', nullable: true })
  menuTokenV2: string;

  @Column({ name: 'tv_token_v2', nullable: true })
  tvTokenV2: string;

  @Column({ name: 'roleta_token_v2', nullable: true })
  roletaTokenV2: string;

  @Column({ name: 'kds_token_v2', nullable: true })
  kdsTokenV2: string;

  @Column({ name: 'scale_token_v2', nullable: true })
  scaleTokenV2: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
