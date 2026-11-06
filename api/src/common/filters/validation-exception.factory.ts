import { BadRequestException } from '@nestjs/common';
import { messages } from '@repo/shared';

// A backstop with no field detail: the web forms check the same shared rules first.
export function validationException(): BadRequestException {
  return new BadRequestException({
    code: 'validation_failed',
    message: messages.request.validationFailed,
  });
}
