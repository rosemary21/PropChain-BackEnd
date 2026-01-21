import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Resource } from '../enums/resource.enum';
import { Action } from '../enums/action.enum';

export class CreatePermissionDto {
  @ApiProperty({ enum: Resource, description: 'Resource type' })
  @IsEnum(Resource)
  resource: Resource;

  @ApiProperty({ enum: Action, description: 'Action type' })
  @IsEnum(Action)
  action: Action;

  @ApiProperty({
    description: 'Permission description',
    example: 'Allows creating new properties',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
