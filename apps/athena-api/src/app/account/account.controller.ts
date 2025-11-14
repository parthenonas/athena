import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";

import { AccountService } from "./account.service";
import { FilterAccountDto } from "./dto/filter.dto";
import { LoginDto } from "./dto/login.dto";
import { TokenResponseDto } from "./dto/token.dto";
import { UpdateAccountDto } from "./dto/update.dto";
import { JwtAuthGuard } from "./guards/jwt.guard";

@Controller("accounts")
@UseGuards(JwtAuthGuard)
export class AccountController {
  private readonly logger = new Logger(AccountController.name);

  constructor(private readonly service: AccountService) {}

  @Get()
  async findAll(@Query() filters: FilterAccountDto) {
    try {
      return await this.service.findAll(filters);
    } catch (error: unknown) {
      this.logger.error(`findAll() | ${(error as Error).message}`);
      throw new BadRequestException("Failed to fetch accounts");
    }
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    try {
      return await this.service.findOne(id);
    } catch (error: unknown) {
      this.logger.error(`findOne() | ${(error as Error).message}`);
      throw new BadRequestException("Failed to fetch account");
    }
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateAccountDto) {
    try {
      return await this.service.update(id, dto);
    } catch (error: unknown) {
      this.logger.error(`update() | ${(error as Error).message}`);
      throw new BadRequestException("Failed to update account");
    }
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    try {
      return await this.service.softDelete(id);
    } catch (error: unknown) {
      this.logger.error(`delete() | ${(error as Error).message}`);
      throw new BadRequestException("Failed to delete account");
    }
  }

  @Get("me/:id")
  async findOwn(@Param("id") id: string, @Req() req: Request) {
    const user = req.user;
    if (user.id !== id) throw new BadRequestException("Access denied");

    try {
      return await this.service.findOne(id);
    } catch (error: unknown) {
      this.logger.error(`findOwn() | ${(error as Error).message}`);
      throw new BadRequestException("Failed to fetch your account");
    }
  }

  @Post("login")
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response): Promise<TokenResponseDto> {
    try {
      const account = await this.service.validateCredentials(dto.login, dto.password);
      const accessToken = await this.service.generateAccessToken(account);
      const refreshToken = await this.service.generateRefreshToken(account);
      this.service.setRefreshCookie(res, refreshToken);

      return { accessToken };
    } catch (error: unknown) {
      this.logger.error(`login() | ${(error as Error).message}`);
      throw new BadRequestException("Invalid login or password");
    }
  }
}
