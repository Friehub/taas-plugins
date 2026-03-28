import { describeUcmCompliance } from '@taas/plugin-test-utils';
import { CryptoCompareDataSource } from './CryptoCompareDataSource.js';

describeUcmCompliance('CryptoCompareDataSource', () => new CryptoCompareDataSource({ useMocks: true }));
