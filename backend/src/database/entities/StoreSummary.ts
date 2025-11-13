import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CustomerInfo } from './CustomerInfo';

@Entity('store_summary')
@Index(['company_code', 'store_code', 'date'], { unique: true })
export class StoreSummary {
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', nullable: false })
  company_code: string;

  @Column({ type: 'text', nullable: false })
  store_code: string;

  @Column({ type: 'text', nullable: true })
  store_name: string | null;

  @Column({ type: 'date', nullable: false })
  date: Date;

  @Column({ type: 'integer', nullable: false })
  total_labels: number;

  @Column({ type: 'integer', nullable: false })
  product_updated: number;

  @ManyToOne(
    () => CustomerInfo,
    (customerInfo: CustomerInfo) => customerInfo.storeSummaries,
    { nullable: false }
  )
  @JoinColumn({ name: 'company_code', referencedColumnName: 'company_code' })
  customerInfo!: CustomerInfo;
}
