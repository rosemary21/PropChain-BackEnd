import { IsString, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignPermissionsDto {
  @ApiProperty({
    description: 'Array of permission IDs to assign',
    example: ['perm1', 'perm2'],
  })
  @IsArray()
  @IsString({ each: true })
  permissionIds: string[];
}
