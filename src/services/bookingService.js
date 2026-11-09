import { assertTransition } from '../domain/bookingStateMachine.js';
import { DomainError } from '../domain/errors.js';

export class BookingService {
  constructor(repository, paymentGateway) {
    this.repository = repository;
    this.paymentGateway = paymentGateway;
  }

  async bookTickets({ tierId, userId, quantity }) {
    return this.repository.bookTickets(tierId, userId, quantity);
  }

  async payBooking(reference, userId, card = {}) {
    const booking = await this.repository.getBookingByReference(reference);
    if (!booking) throw new DomainError('NOT_FOUND', 'Booking not found');
    if (booking.userId !== userId) {
      throw new DomainError('FORBIDDEN', 'You can only pay your own booking');
    }

    assertTransition(booking.status, 'paid');

    const result = await this.paymentGateway.charge(card);
    if (!result.approved) {
      throw new DomainError('PAYMENT_DECLINED', 'Payment declined');
    }

    booking.status = 'paid';
    return booking;
  }

  async cancelBooking(reference, userId) {
    const booking = await this.repository.getBookingByReference(reference);
    if (!booking) throw new DomainError('NOT_FOUND', 'Booking not found');
    if (booking.userId !== userId) {
      throw new DomainError('FORBIDDEN', 'You can only cancel your own booking');
    }
    if (booking.status !== 'pending') {
      throw new DomainError('INVALID_STATE', 'Only pending bookings can be cancelled');
    }
    return this.repository.cancelBooking(reference);
  }
}

export default BookingService;
