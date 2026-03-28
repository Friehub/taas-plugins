import { describeUcmCompliance } from '@taas/plugin-test-utils';
import { SportDBDataSource } from './SportDBDataSource.js';

describeUcmCompliance('SportDBDataSource', () => new SportDBDataSource({ useMocks: true }));
