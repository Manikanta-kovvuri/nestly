import { Controller, Get } from '@nestjs/common';

/**
 * AppController handles the root-level health endpoint.
 * This endpoint is excluded from the global /api/v1 prefix so it can be
 * used as a simple liveness probe by Railway, load balancers, or monitoring.
 */
@Controller()
export class AppController {
  /**
   * GET /health
   * Liveness probe — returns 200 with a status payload.
   * No authentication required.
   */
  @Get('health')
  getHealth(): { status: string; timestamp: string; service: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'nestly-api',
    };
  }
}
