import { describeUcmCompliance } from '@taas/plugin-test-utils';
import { WorldBankDataSource } from './WorldBankDataSource.js';

describeUcmCompliance('WorldBankDataSource', () => new WorldBankDataSource({ useMocks: true }));
