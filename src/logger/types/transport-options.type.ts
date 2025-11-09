import { LokiTransportOptions } from '../interfaces';
import { JsonTransportOptions } from '../interfaces/json-transport-options';

export type TransportOptions = {
  loki?: LokiTransportOptions;
  json?: JsonTransportOptions;
  nest?: {};
};
