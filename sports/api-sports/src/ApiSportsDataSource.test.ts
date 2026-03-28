import { describeUcmCompliance } from '@taas/plugin-test-utils';
import { ApiSportsDataSource } from './ApiSportsDataSource.js';

describeUcmCompliance('ApiSportsDataSource', () => new ApiSportsDataSource({ useMocks: true }));
