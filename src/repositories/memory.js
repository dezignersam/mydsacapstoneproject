import {
  addTier,
  bookTickets,
  cancelBooking,
  createEvent,
  createStore,
  findBookingByReference,
  listEventSummaries,
  publishEvent,
  unpublishEvent,
} from '../domain/inventory.js';
import { searchEvents } from '../domain/eventSearch.js';

export class MemoryRepository {
  constructor() {
    this.store = createStore();
  }

  async createEvent(details) {
    return createEvent(this.store, details);
  }

  async findEventById(eventId) {
    const event = this.store.events.get(eventId);
    if (!event) {
      const { DomainError } = await import('../domain/errors.js');
      throw new DomainError('NOT_FOUND', 'Event not found');
    }
    return event;
  }

  async addTier(eventId, details) {
    return addTier(this.store, eventId, details);
  }

  async publishEvent(eventId) {
    return publishEvent(this.store, eventId);
  }

  async unpublishEvent(eventId) {
    return unpublishEvent(this.store, eventId);
  }

  async listEvents(options = {}) {
    return listEventSummaries(this.store, options);
  }

  async searchEvents(criteria = {}, sortBy = 'date') {
    return searchEvents(await this.listEvents({ publishedOnly: true }), criteria, sortBy);
  }

  async bookTickets(tierId, userId, quantity) {
    return bookTickets(this.store, tierId, userId, quantity);
  }

  async getBookingByReference(reference) {
    return findBookingByReference(this.store, reference);
  }

  async cancelBooking(reference) {
    return cancelBooking(this.store, reference);
  }
}

export default MemoryRepository;
