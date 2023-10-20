import { Module } from '@nestjs/common';
import { PixKeysService } from './pix-keys.service';
import { PixKeysController } from './pix-keys.controller';
import { PixKey } from './entities/pix-key.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankAccount } from 'src/bank-accounts/entities/bank-account.entity';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'PIX_PACKAGE',
        transport: Transport.GRPC,
        options: {
          url: 'host.docker.internal:50051',
          package: 'github.com.codeedu.codepix',
          protoPath: join(__dirname, 'proto/pixkey.proto'),
        },
      },
    ]),
    TypeOrmModule.forFeature([PixKey, BankAccount]),
  ],
  controllers: [PixKeysController],
  providers: [PixKeysService],
})
export class PixKeysModule {}
