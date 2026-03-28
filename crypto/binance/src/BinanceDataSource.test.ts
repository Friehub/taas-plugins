import { describeUcmCompliance } from '@taas/plugin-test-utils';
import { BinanceDataSource } from './BinanceDataSource.js';

describeUcmCompliance('BinanceDataSource', () => new BinanceDataSource({ useMocks: true }));
