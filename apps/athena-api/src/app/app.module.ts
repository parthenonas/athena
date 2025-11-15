import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CommandModule } from "nestjs-command";

import { AccountModule } from "./account";
import { AclModule } from "./acl";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ProfileRecordModule } from "./profile-record";

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get("DATABASE_HOST"),
        port: configService.get("DATABASE_PORT"),
        username: configService.get("DATABASE_USERNAME"),
        password: configService.get("DATABASE_PASSWORD"),
        database: configService.get("DATABASE_NAME"),
        synchronize: false,
        autoLoadEntities: true,
      }),
      inject: [ConfigService],
    }),
    CommandModule,
    AccountModule,
    ProfileRecordModule,
    AclModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
