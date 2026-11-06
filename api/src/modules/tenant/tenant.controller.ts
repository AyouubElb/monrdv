import { Controller, Get } from '@nestjs/common';
import { ApiNotFoundResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentBusiness } from '../../common/tenancy/current-business.decorator.js';
import { TenantResponseDto } from './dto/tenant-response.dto.js';
import { TenantService } from './tenant.service.js';

@ApiTags('tenant')
@Controller('tenant')
export class TenantController {
  constructor(private readonly tenant: TenantService) {}

  /** The business named by the request host. The web app calls it before rendering a business page. */
  @Get()
  @Public()
  @ApiNotFoundResponse({
    description: 'No business on this host (`business_not_found`)',
  })
  get(@CurrentBusiness() businessId: string): Promise<TenantResponseDto> {
    return this.tenant.getBusiness(businessId);
  }
}
