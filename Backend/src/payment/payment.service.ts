import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Role, PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  async create(
    createPaymentDto: CreatePaymentDto,
    user: { id: number; role: string },
  ) {
    const { leaseId, amount, method } = createPaymentDto;

    // Verify lease exists and check ownership path: Lease -> Unit -> Property -> ownerId
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        unit: {
          include: {
            property: true,
          },
        },
      },
    });

    if (!lease) {
      throw new NotFoundException(`Lease with ID ${leaseId} not found`);
    }

    if (user.role !== Role.ADMIN && lease.unit.property.ownerId !== user.id) {
      throw new ForbiddenException(
        'You do not own the property associated with this lease',
      );
    }

    return this.prisma.payment.create({
      data: {
        leaseId,
        amount,
        method,
        status: PaymentStatus.PAID,
        paidAt: new Date(),
      },
    });
  }

  async findAll(user: { id: number; role: string }) {
    if (user.role === Role.ADMIN) {
      return this.prisma.payment.findMany();
    }

    if (user.role === Role.TENANT) {
      return this.prisma.payment.findMany({
        where: {
          lease: {
            tenant: {
              userId: user.id,
            },
          },
        },
      });
    }

    // OWNER
    return this.prisma.payment.findMany({
      where: {
        lease: {
          unit: {
            property: {
              ownerId: user.id,
            },
          },
        },
      },
    });
  }

  async findOne(id: number, user: { id: number; role: string }) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        lease: {
          include: {
            unit: {
              include: {
                property: true,
              },
            },
            tenant: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    if (user.role === Role.TENANT && payment.lease.tenant.userId !== user.id) {
      throw new ForbiddenException('You can only access your own payments');
    }

    if (
      user.role === Role.OWNER &&
      payment.lease.unit.property.ownerId !== user.id
    ) {
      throw new ForbiddenException('You do not have access to this payment');
    }

    // Avoid returning deeply nested structures unnecessarily
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { lease: _, ...result } = payment;
    return result;
  }

  async update(
    id: number,
    updatePaymentDto: UpdatePaymentDto,
    user: { id: number; role: string },
  ) {
    // findOne implicitly verifies existence and ownership bounds
    const payment = await this.findOne(id, user);

    let paidAtUpdate = undefined;

    if (updatePaymentDto.status) {
      if (
        updatePaymentDto.status === PaymentStatus.PAID &&
        payment.status !== PaymentStatus.PAID
      ) {
        paidAtUpdate = new Date();
      } else if (updatePaymentDto.status !== PaymentStatus.PAID) {
        paidAtUpdate = null;
      }
    }

    return this.prisma.payment.update({
      where: { id },
      data: {
        amount: updatePaymentDto.amount,
        method: updatePaymentDto.method,
        status: updatePaymentDto.status,
        ...(paidAtUpdate !== undefined ? { paidAt: paidAtUpdate } : {}),
      },
    });
  }
}
