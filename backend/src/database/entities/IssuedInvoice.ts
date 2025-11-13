import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CustomerInfo } from './CustomerInfo';

@Entity('issued_invoice')
export class IssuedInvoice {
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', nullable: false })
  company_code: string;

  @Column({ type: 'text', nullable: false })
  company_name: string;

  @Column({ type: 'text', nullable: false })
  issued_date: string;

  @Column({ type: 'integer', nullable: false })
  invoice_code: number;

  @Column({ type: 'text', nullable: false })
  currency: string;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  ttm: number | null;

  @ManyToOne(
    () => CustomerInfo,
    (customerInfo: CustomerInfo) => customerInfo.issuedInvoices,
    { nullable: false }
  )
  @JoinColumn({ name: 'company_code', referencedColumnName: 'company_code' })
  customerInfo!: CustomerInfo;
}
