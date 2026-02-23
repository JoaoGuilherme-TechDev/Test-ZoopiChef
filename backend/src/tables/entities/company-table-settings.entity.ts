import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('company_table_settings')
export class CompanyTableSettings {
  @PrimaryColumn({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'no_consumption_minutes', type: 'int', default: 30 })
  noConsumptionMinutes: number;

  @Column({ name: 'request_table_number', type: 'boolean', default: false })
  requestTableNumber: boolean;

  @Column({ name: 'allow_mobile_delete_printed_items', type: 'boolean', default: false })
  allowMobileDeletePrintedItems: boolean;

  @Column({ name: 'request_people_count', type: 'text', default: 'none' })
  requestPeopleCount: string;

  @Column({ name: 'require_customer_identification', type: 'boolean', default: false })
  requireCustomerIdentification: boolean;

  @Column({ name: 'cash_register_mode', type: 'text', default: 'open' })
  cashRegisterMode: string;

  @Column({ name: 'show_weather_on_closing', type: 'boolean', default: false })
  showWeatherOnClosing: boolean;

  @Column({ name: 'shift_report_email', type: 'text', nullable: true })
  shiftReportEmail: string;

  @Column({ name: 'location_latitude', type: 'float', nullable: true })
  locationLatitude: number;

  @Column({ name: 'location_longitude', type: 'float', nullable: true })
  locationLongitude: number;

  @Column({ name: 'smtp_host', type: 'text', nullable: true })
  smtpHost: string;

  @Column({ name: 'smtp_port', type: 'int', nullable: true })
  smtpPort: number;

  @Column({ name: 'smtp_user', type: 'text', nullable: true })
  smtpUser: string;

  @Column({ name: 'smtp_password', type: 'text', nullable: true })
  smtpPassword: string;

  @Column({ name: 'smtp_from_email', type: 'text', nullable: true })
  smtpFromEmail: string;

  @Column({ name: 'smtp_from_name', type: 'text', nullable: true })
  smtpFromName: string;

  @Column({ name: 'smtp_enabled', type: 'boolean', default: false })
  smtpEnabled: boolean;

  @Column({ name: 'geo_security_enabled', type: 'boolean', default: false })
  geoSecurityEnabled: boolean;

  @Column({ name: 'geo_security_radius_meters', type: 'float', default: 100 })
  geoSecurityRadiusMeters: number;

  @Column({ name: 'geo_session_duration_minutes', type: 'int', default: 30 })
  geoSessionDurationMinutes: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
