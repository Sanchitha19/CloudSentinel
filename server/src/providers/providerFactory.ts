import { CloudProvider } from '../../../shared/src/types/provider';
import { MockCloudProvider } from './MockCloudProvider';
import { AWSCloudProvider } from './AWSCloudProvider';
import { GCPCloudProvider } from './GCPCloudProvider';

export function getProvider(): CloudProvider {
  const provider = process.env.CLOUD_PROVIDER || 'mock';

  switch (provider.toLowerCase()) {
    case 'aws':
      return new AWSCloudProvider();
    case 'gcp':
      return new GCPCloudProvider();
    case 'mock':
    default:
      return new MockCloudProvider();
  }
}
