import { Injectable, Inject } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { DataSource, Repository } from 'typeorm';
import {
  Transaction,
  TransactionOperation,
} from './entities/transaction.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { BankAccount } from 'src/bank-accounts/entities/bank-account.entity';
import { ClientKafka } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,

    @InjectRepository(BankAccount)
    private bankAccountRepo: Repository<BankAccount>,

    private dataSource: DataSource,

    @Inject('KAFKA_SERVICE')
    private kafkaService: ClientKafka,
  ) {}

  async create(
    bankAccountId: string,
    createTransactionDto: CreateTransactionDto,
  ) {
    const transaction = await this.dataSource.transaction(async (manager) => {
      const bankAccount = await manager.findOneOrFail(BankAccount, {
        where: {
          id: bankAccountId,
        },
        lock: {
          mode: 'pessimistic_write',
        },
      });

      const transaction = manager.create(Transaction, {
        ...createTransactionDto,
        amount: createTransactionDto.amount * -1,
        bank_account_id: bankAccountId,
        operation: TransactionOperation.debit,
      });

      await manager.save(transaction);

      bankAccount.balance += transaction.amount;
      await manager.save(bankAccount);
      return transaction;
    });

    const sendData = {
      id: transaction.id,
      accountId: bankAccountId,
      amount: createTransactionDto.amount,
      pixkeyto: createTransactionDto.pix_key_key,
      pixKeyKindTo: createTransactionDto.pix_key_kind,
      description: createTransactionDto.description,
    };

    await lastValueFrom(this.kafkaService.emit('transactions', sendData));

    return transaction;
  }

  findAll(bankAccountId: string) {
    return this.transactionRepo.find({
      where: {
        bank_account_id: bankAccountId,
      },
      order: {
        created_at: 'DESC',
      },
    });
  }
}
