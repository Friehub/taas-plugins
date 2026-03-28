import { describeUcmCompliance } from '@taas/plugin-test-utils';
import { ExchangeRateDataSource } from './ExchangeRateDataSource.js';

describeUcmCompliance('ExchangeRateDataSource', () => new ExchangeRateDataSource({ useMocks: true }));
