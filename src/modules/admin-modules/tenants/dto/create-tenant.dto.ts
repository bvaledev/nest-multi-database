import { IsBoolean, IsString, ValidateNested } from "class-validator"
import { TenantDatabaseDto } from "./tenant-database.dto"
import { Type } from "class-transformer"

export class CreateTenantDto {
  @IsString()
  name: string
  @IsString()
  slug: string
  @IsBoolean()
  isEnabled: boolean
  @ValidateNested() // Valida o objeto aninhado
  @Type(() => TenantDatabaseDto) // Transforma o campo em TenantDatabaseDto
  database: TenantDatabaseDto
}
