import { Property as PrismaProperty, PropertyStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export { PropertyStatus };

export class Property implements PrismaProperty {
    id: string;
    title: string;
    description: string | null;
    location: string;
    price: Decimal;
    status: PropertyStatus;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
}

export type CreatePropertyInput = {
    title: string;
    description?: string;
    location: string;
    price: number | Decimal;
    status?: PropertyStatus;
    ownerId: string;
};

export type UpdatePropertyInput = Partial<Omit<CreatePropertyInput, 'ownerId'>>;
