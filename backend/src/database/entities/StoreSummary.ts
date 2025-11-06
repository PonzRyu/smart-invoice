import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CustomerInfo } from './CustomerInfo';

@Entity('store_summary')
export class StoreSummary {
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer', nullable: false })
  company_code: number;

  @Column({ type: 'integer', nullable: false })
  store_code: number;

  @Column({ type: 'text', nullable: false })
  store_name: string;

  @Column({ type: 'date', nullable: false })
  date: Date;

  @Column({ type: 'integer', nullable: false })
  total_labels: number;

  @Column({ type: 'integer', nullable: false })
  product_updated: number;

  @ManyToOne(() => CustomerInfo, (customerInfo: CustomerInfo) => customerInfo.storeSummaries)
  @JoinColumn({ name: 'company_code' })
  customerInfo!: CustomerInfo;
}

