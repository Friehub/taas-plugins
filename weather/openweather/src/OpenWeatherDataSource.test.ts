import { describeUcmCompliance } from '@taas/plugin-test-utils';
import { OpenWeatherDataSource } from './OpenWeatherDataSource.js';

describeUcmCompliance('OpenWeatherDataSource', () => new OpenWeatherDataSource({ useMocks: true }));
