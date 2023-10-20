import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { lastValueFrom } from 'rxjs';
import { CreatePixKeyDto } from './dto/create-pix-key.dto';
import { PixKey, PixKeyKind } from './entities/pix-key.entity';
import { BankAccount } from 'src/bank-accounts/entities/bank-account.entity';
import { PixKeyClientGrpc, RegisterPixKeyRpcResponse } from './pix-keys.grpc';
import { PixKeyAlreadyExistsError, PixKeyGrpcUnknownError } from './errors';

@Injectable()
export class PixKeysService implements OnModuleInit {
  private pixGrpcService: PixKeyClientGrpc;

  constructor(
    @InjectRepository(PixKey)
    private pixKeyRepo: Repository<PixKey>,

    @InjectRepository(BankAccount)
    private bankAccountRepo: Repository<BankAccount>,

    @Inject('PIX_PACKAGE')
    private pixGrpcPackage: ClientGrpc,
  ) {}

  onModuleInit() {
    this.pixGrpcService = this.pixGrpcPackage.getService('PixService');
  }

  findAll(bank_account_id: string) {
    return this.pixKeyRepo.find({
      where: {
        bank_account_id: bank_account_id,
      },
      order: {
        created_at: 'DESC',
      },
    });
  }

  async create(bankAccountId: string, createPixKeyDto: CreatePixKeyDto) {
    await this.bankAccountRepo.findOneOrFail({
      where: {
        id: bankAccountId,
      },
    });

    const remotePixKey = await this.findRemotePixKey(createPixKeyDto);
    if (remotePixKey) {
      return this.createIfNotExists(bankAccountId, remotePixKey);
    } else {
      const createdRemotePixKey = await lastValueFrom(
        this.pixGrpcService.registerPixKey({
          ...createPixKeyDto,
          accountId: bankAccountId,
        }),
      );

      return this.pixKeyRepo.save({
        id: createdRemotePixKey.id,
        bank_account_id: bankAccountId,
        ...createPixKeyDto,
      });
    }
  }

  async findRemotePixKey(data: {
    kind: string;
    key: string;
  }): Promise<RegisterPixKeyRpcResponse | null> {
    try {
      return await lastValueFrom(this.pixGrpcService.find(data));
    } catch (e) {
      console.error(e);
      if (e.details == 'no key was found') {
        return null;
      }

      throw new PixKeyGrpcUnknownError('Grpc Internal Error');
    }
  }

  private async createIfNotExists(
    bankAccountId: string,
    remotePixKey: RegisterPixKeyRpcResponse,
  ) {
    const hasLocalPixKey = await this.pixKeyRepo.exist({
      where: {
        key: remotePixKey.key,
      },
    });
    if (hasLocalPixKey) {
      throw new PixKeyAlreadyExistsError('Pix Key already exists');
    } else {
      return this.pixKeyRepo.save({
        id: remotePixKey.id,
        bank_account_id: bankAccountId,
        key: remotePixKey.key,
        kind: remotePixKey.kind as PixKeyKind,
      });
    }
  }
}
