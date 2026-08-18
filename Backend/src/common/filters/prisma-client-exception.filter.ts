import { ArgumentsHost, Catch, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

/**
 * Global exception filter for PrismaClientKnownRequestError.
 * Intercepts common database errors (e.g., unique constraint violations)
 * and formats them as proper HTTP responses, preventing the leak of
 * raw SQL query details or stack traces to the client.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter extends BaseExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    switch (exception.code) {
      case 'P2002': {
        // Unique constraint violation
        const status = HttpStatus.CONFLICT;
        response.status(status).json({
          statusCode: status,
          message: 'A record with this identifier already exists.',
          error: 'Conflict',
        });
        break;
      }
      case 'P2025': {
        // Record not found
        const status = HttpStatus.NOT_FOUND;
        response.status(status).json({
          statusCode: status,
          message: 'The requested resource could not be found.',
          error: 'Not Found',
        });
        break;
      }
      case 'P2003': {
        // Foreign key constraint failed
        const status = HttpStatus.BAD_REQUEST;
        response.status(status).json({
          statusCode: status,
          message: 'A related record does not exist or cannot be modified.',
          error: 'Bad Request',
        });
        break;
      }
      default:
        // Default 500 for unhandled Prisma codes, delegating to NestJS BaseExceptionFilter
        super.catch(exception, host);
        break;
    }
  }
}
