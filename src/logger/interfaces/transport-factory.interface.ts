import * as Transport from 'winston-transport';

export interface TransportFactory<T extends Transport = Transport> {
  createTransport(): T;
}
