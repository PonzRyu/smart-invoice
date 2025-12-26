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

@Entity('store_master')
export class StoreMaster {
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', nullable: false })
  company_code: string;

  @Column({ type: 'text', nullable: false, unique: true })
  store_code: string;

  @Column({ type: 'text', nullable: false })
  store_name: string;
}
