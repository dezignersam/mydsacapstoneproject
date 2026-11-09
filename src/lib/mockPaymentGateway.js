import { DomainError } from '../domain/errors.js';

export class MockPaymentGateway {
  async charge(card = {}) {
    if (!card || typeof card !== 'object') {
      throw new DomainError('VALIDATION', 'A valid mock card is required');
    }

    if (card.declined === true || card.declined === 'true' || card.status === 'declined') {
      return { approved: false, reason: 'declined' };
    }

    return { approved: true, reference: 'mock-payment-approval' };
  }
}

export default MockPaymentGateway;
