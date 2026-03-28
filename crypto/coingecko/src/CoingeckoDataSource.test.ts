import { describeUcmCompliance } from '@taas/plugin-test-utils';
import { CoingeckoDataSource } from './CoingeckoDataSource.js';

describeUcmCompliance('CoingeckoDataSource', () => new CoingeckoDataSource({ useMocks: true }));
