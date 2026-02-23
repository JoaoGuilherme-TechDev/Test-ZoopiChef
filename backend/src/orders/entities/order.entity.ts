import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { OrderItem } from './order-item.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Deliverer } from '../../deliverers/entities/deliverer.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId: string;

  @Column({ name: 'deliverer_id', type: 'uuid', nullable: true })
  delivererId: string;

  @Column({ name: 'customer_name', nullable: true })
  customerName: string;

  @Column({ name: 'customer_phone', nullable: true })
  customerPhone: string;

  @Column({ name: 'customer_address', nullable: true })
  customerAddress: string;

  @Column({ name: 'address_notes', nullable: true })
  addressNotes: string;

  @Column({ name: 'delivery_address_id', type: 'uuid', nullable: true })
  deliveryAddressId: string;

  @Column({ default: 'novo' })
  status: string; // novo, preparo, pronto, em_rota, entregue

  @Column({ name: 'order_type', default: 'delivery' })
  orderType: string;

  @Column({ name: 'receipt_type', nullable: true })
  receiptType: string;

  @Column({ name: 'payment_method', nullable: true })
  paymentMethod: string;

  @Column({ name: 'change_for', type: 'decimal', precision: 10, scale: 2, nullable: true })
  changeFor: number;

  @Column({ name: 'delivery_fee', type: 'decimal', precision: 10, scale: 2, nullable: true })
  deliveryFee: number;

  @Column({ name: 'delivery_distance_km', type: 'decimal', precision: 10, scale: 2, nullable: true })
  deliveryDistanceKm: number;

  @Column({ name: 'table_number', nullable: true })
  tableNumber: string;

  @Column({ name: 'comanda_number', nullable: true })
  comandaNumber: number;

  @Column({ name: 'comanda_id', type: 'uuid', nullable: true })
  comandaId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({ nullable: true })
  notes: string;

  @Column({ nullable: true })
  source: string;

  @Column({ name: 'fulfillment_type', default: 'delivery' })
  fulfillmentType: string;

  @Column({ name: 'delivery_fee_cents', type: 'int', default: 0 })
  deliveryFeeCents: number;

  @Column({ name: 'delivery_mode', nullable: true })
  deliveryMode: string;

  @Column({ name: 'delivery_rule_id', type: 'uuid', nullable: true })
  deliveryRuleId: string;

  @Column({ name: 'delivery_rule_snapshot', type: 'jsonb', nullable: true })
  deliveryRuleSnapshot: any;

  @Column({ name: 'destination_cep', nullable: true })
  destinationCep: string;

  @Column({ name: 'destination_address', type: 'jsonb', nullable: true })
  destinationAddress: any;

  @Column({ name: 'eta_minutes', type: 'int', nullable: true })
  etaMinutes: number;

  @Column({ name: 'accepted_at', type: 'timestamp', nullable: true })
  acceptedAt: Date;

  @Column({ name: 'ready_at', type: 'timestamp', nullable: true })
  readyAt: Date;

  @Column({ name: 'dispatched_at', type: 'timestamp', nullable: true })
  dispatchedAt: Date;

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @Column({ name: 'order_number', generated: 'increment' })
  orderNumber: number;

  @Column({ name: 'settled_at', type: 'timestamp', nullable: true })
  settledAt: Date;

  @Column({ name: 'settlement_id', type: 'uuid', nullable: true })
  settlementId: string;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt: Date;

  @Column({ name: 'cancelled_by', type: 'uuid', nullable: true })
  cancelledBy: string;

  @Column({ name: 'cancel_reason', nullable: true })
  cancelReason: string;

  @Column({ name: 'cash_session_id', type: 'uuid', nullable: true })
  cashSessionId: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => Deliverer)
  @JoinColumn({ name: 'deliverer_id' })
  deliverer: Deliverer;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
