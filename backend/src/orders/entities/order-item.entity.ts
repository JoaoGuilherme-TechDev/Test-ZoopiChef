import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'product_name' })
  productName: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ nullable: true })
  notes: string;

  @Column({ name: 'selected_options_json', type: 'jsonb', nullable: true })
  selectedOptionsJson: any;

  @Column({ name: 'sommelier_suggested', default: false })
  sommelierSuggested: boolean;

  @Column({ name: 'sommelier_wine_id', type: 'uuid', nullable: true })
  sommelierWineId: string;

  @Column({ name: 'sommelier_tip', nullable: true })
  sommelierTip: string;

  @Column({ name: 'item_status', default: 'pendente' })
  itemStatus: string; // pendente, preparando, preparo, pronto, cancelado

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ name: 'finished_at', type: 'timestamp', nullable: true })
  finishedAt: Date;

  @Column({ name: 'edit_status', nullable: true })
  editStatus: string; // new, modified, removed

  @Column({ name: 'previous_quantity', type: 'int', nullable: true })
  previousQuantity: number;

  @Column({ name: 'previous_notes', nullable: true })
  previousNotes: string;
}
