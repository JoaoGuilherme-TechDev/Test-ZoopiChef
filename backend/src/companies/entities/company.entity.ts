import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, OneToMany } from 'typeorm';
import { CompanyPublicLinks } from './company-public-links.entity';
import { User } from '../../users/entities/user.entity';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToMany(() => User, (user) => user.company)
  users: User[];

  @OneToOne(() => CompanyPublicLinks, (links) => links.company)
  publicLinks: CompanyPublicLinks;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  whatsapp: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ name: 'default_printer', nullable: true })
  defaultPrinter: string;

  @Column({ name: 'order_sound_enabled', default: true })
  orderSoundEnabled: boolean;

  @Column({ name: 'auto_print_enabled', nullable: true })
  autoPrintEnabled: boolean;

  @Column({ name: 'logo_url', nullable: true })
  logoUrl: string;

  @Column({ name: 'primary_color', nullable: true })
  primaryColor: string;

  @Column({ name: 'secondary_color', nullable: true })
  secondaryColor: string;

  @Column({ name: 'background_color', nullable: true })
  backgroundColor: string;

  @Column({ name: 'public_menu_layout', nullable: true })
  publicMenuLayout: string;

  @Column({ name: 'welcome_message', nullable: true })
  welcomeMessage: string;

  @Column({ name: 'opening_hours', type: 'jsonb', nullable: true })
  openingHours: any;

  @Column({ name: 'store_profile', default: 'restaurant' })
  storeProfile: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_template', default: false })
  isTemplate: boolean;

  @Column({ name: 'trial_ends_at', type: 'timestamptz', nullable: true })
  trialEndsAt: Date;

  @Column({ name: 'owner_user_id', type: 'uuid', nullable: true })
  ownerUserId: string;

  @Column({ name: 'suspended_reason', nullable: true })
  suspendedReason: string;

  @Column({ name: 'menu_token', default: '' })
  menuToken: string;

  @Column({ name: 'totem_token', nullable: true })
  totemToken: string;

  @Column({ name: 'print_footer_site', nullable: true })
  printFooterSite: string;

  @Column({ name: 'print_footer_phone', nullable: true })
  printFooterPhone: string;

  @Column({ name: 'tax_regime', nullable: true })
  taxRegime: string;

  @Column({ name: 'state_registration', nullable: true })
  stateRegistration: string;

  @Column({ name: 'municipal_registration', nullable: true })
  municipalRegistration: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
