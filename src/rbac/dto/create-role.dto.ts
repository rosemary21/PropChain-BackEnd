import { IsString, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ description: 'Role name', example: 'property-manager' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Role description',
    example: 'Manages properties and listings',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Role hierarchy level (higher = more privileges)',
    example: 40,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  level?: number;
}
