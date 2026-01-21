import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignRoleDto {
  @ApiProperty({ description: 'Role ID to assign', example: 'role123' })
  @IsString()
  roleId: string;

  @ApiProperty({
    description: 'Reason for role assignment',
    example: 'User promoted to agent',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
