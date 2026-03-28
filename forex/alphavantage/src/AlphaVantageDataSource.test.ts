import { describeUcmCompliance } from '@taas/plugin-test-utils';
import { AlphaVantageDataSource } from './AlphaVantageDataSource.js';

describeUcmCompliance('AlphaVantageDataSource', () => new AlphaVantageDataSource({ useMocks: true }));
