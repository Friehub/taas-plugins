import { describeUcmCompliance } from '@taas/plugin-test-utils';
import { TheOddsApiDataSource } from './TheOddsApiDataSource.js';

describeUcmCompliance('TheOddsApiDataSource', () => new TheOddsApiDataSource({ useMocks: true }));
