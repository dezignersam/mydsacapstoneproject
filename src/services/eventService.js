import { searchEvents } from '../domain/eventSearch.js';

export class EventService {
  constructor(repository) {
    this.repository = repository;
  }

  async createEvent(details) {
    return this.repository.createEvent(details);
  }

  async addTier(eventId, details) {
    return this.repository.addTier(eventId, details);
  }

  async publishEvent(eventId) {
    return this.repository.publishEvent(eventId);
  }

  async unpublishEvent(eventId) {
    return this.repository.unpublishEvent(eventId);
  }

  async listEvents(criteria = {}, sortBy = 'date') {
    return searchEvents(await this.repository.listEvents({ publishedOnly: true }), criteria, sortBy);
  }
}

export default EventService;
