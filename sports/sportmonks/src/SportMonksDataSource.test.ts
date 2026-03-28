import { describeUcmCompliance } from '@taas/plugin-test-utils';
import { SportMonksDataSource } from './SportMonksDataSource.js';

describeUcmCompliance('SportMonksDataSource', () => new SportMonksDataSource({ useMocks: true }));
