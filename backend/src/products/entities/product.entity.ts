import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToOne, OneToMany } from 'typeorm';
import { Subcategory } from '../../subcategories/entities/subcategory.entity';
import { ProductPizzaConfig } from './product-pizza-config.entity';
import { ProductFlavor } from '../../flavors/entities/product-flavor.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column()
  name: string;

  @OneToOne(() => ProductPizzaConfig, (config) => config.product, { cascade: true })
  pizzaConfig: ProductPizzaConfig;

  @OneToMany(() => ProductFlavor, (productFlavor) => productFlavor.product, { cascade: true })
  productFlavors: ProductFlavor[];

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'price_cents', type: 'int' })
  priceCents: number;

  @Column({ name: 'promotional_price_cents', type: 'int', nullable: true })
  promotionalPriceCents: number;

  @Column({ name: 'subcategory_id', type: 'uuid', nullable: true })
  subcategoryId: string;

  @ManyToOne(() => Subcategory, (subcategory) => subcategory.products)
  @JoinColumn({ name: 'subcategory_id' })
  subcategory: Subcategory;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'image_url', nullable: true })
  imageUrl: string;

  // New fields
  @Column({ name: 'aparece_delivery', default: true })
  apareceDelivery: boolean;

  @Column({ name: 'aparece_qrcode', default: true })
  apareceQrcode: boolean;

  @Column({ name: 'aparece_totem', default: true })
  apareceTotem: boolean;

  @Column({ name: 'aparece_tablet', default: true })
  apareceTablet: boolean;

  @Column({ name: 'aparece_tv', default: true })
  apareceTv: boolean;

  @Column({ name: 'destaque_horario', type: 'simple-array', nullable: true })
  destaqueHorario: string[];

  @Column({ name: 'ordem_destaque', nullable: true })
  ordemDestaque: number;

  @Column({ name: 'print_sector_id', nullable: true })
  printSectorId: string;

  @Column({ name: 'is_on_sale', default: false })
  isOnSale: boolean;

  @Column({ name: 'sale_price_cents', type: 'int', nullable: true })
  salePriceCents: number;

  @Column({ name: 'sale_hours', type: 'simple-array', nullable: true })
  saleHours: string[];

  @Column({ name: 'is_featured', default: false })
  isFeatured: boolean;

  @Column({ name: 'ean_code', nullable: true })
  eanCode: string;

  @Column({ name: 'internal_code', nullable: true })
  internalCode: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
