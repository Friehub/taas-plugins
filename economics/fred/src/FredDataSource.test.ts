import { describeUcmCompliance } from '@taas/plugin-test-utils';
import { FredDataSource } from './FredDataSource.js';

describeUcmCompliance('FredDataSource', () => new FredDataSource({ useMocks: true }));
