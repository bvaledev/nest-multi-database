import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString } from "class-validator";

export class TenantDatabaseDto {
  @IsString()
  host: string;

  @Type(() => Number)
  @IsInt()
  port: number;

  @IsString()
  database: string;

  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  certificate?: string | null;
}
