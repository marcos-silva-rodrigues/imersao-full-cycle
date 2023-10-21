import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { PixKeyAlreadyExistsErrorFilter } from './pix-keys/filters/pix-key-already-exists.error';
import { PixKeyGrpcUnknownErrorFilter } from './pix-keys/filters/pix-key-unknown.error';
import { Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(
    new PixKeyAlreadyExistsErrorFilter(),
    new PixKeyGrpcUnknownErrorFilter(),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      errorHttpStatusCode: 422,
    }),
  );

  app.connectMicroservice({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: 'host.docker.internal:9094',
      },
      consumer: {
        groupId: 'transactions-consumer',
      },
    },
  });
  await app.startAllMicroservices();
  await app.listen(3000);
}
bootstrap();
