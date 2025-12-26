import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { StoreSummary } from './StoreSummary';
import { IssuedInvoice } from './IssuedInvoice';

@Entity('customer_info')
export class CustomerInfo {
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', nullable: false, unique: true })
  company_code: string;

  @Column({ type: 'text', nullable: false })
  company_name: string;

  @Column({ type: 'text', nullable: false })
  si_partner_name: string;

  @Column({
    type: 'numeric',
    precision: 15,
    scale: 6,
    nullable: false,
  })
  unit_price: number;

  @Column({ type: 'text', nullable: false })
  currency: string;

  @OneToMany(
    () => StoreSummary,
    (storeSummary: StoreSummary) => storeSummary.customerInfo
  )
  storeSummaries!: StoreSummary[];

  @OneToMany(
    () => IssuedInvoice,
    (issuedInvoice: IssuedInvoice) => issuedInvoice.customerInfo
  )
  issuedInvoices!: IssuedInvoice[];
}
