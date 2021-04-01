import { metricScope, Unit } from 'aws-embedded-metrics';
import os from 'os';

type Dimensions = Record<string, string>;
type Property = Record<string, string | Record<string, string>>;

export function AWSExecutionTimeMetric(
  nameSpace?: string,
  dimensions?: Dimensions,
  properties?: Property[],
  unit: Unit = Unit.Milliseconds
) {
  return function (
    target: Object,
    key: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const origFunc = descriptor.value;

    descriptor.value = function (...args: any[]) {
      metricScope(function (metrics) {
        const t0 = new Date();
        let t1: Date;

        try {
          const result = origFunc.apply(this, args);
          t1 = new Date();
          return result;
        } catch (error) {
          t1 = new Date();
          throw error;
        } finally {
          const tDelta = Math.abs(t0.valueOf() - t1.valueOf());

          metrics.setNamespace(nameSpace);
          metrics.putDimensions(dimensions);
          metrics.putMetric(`ExecutionTime`, tDelta, unit);
        }
      });
    };
  };
}

export function AWSExecutionTimeMetricAsync(
  nameSpace?: string,
  dimensions?: Dimensions,
  properties?: Property[],
  unit: Unit = Unit.Milliseconds
) {
  return function (
    target: Object,
    key: string | symbol,
    descriptor: TypedPropertyDescriptor<(...params: any[]) => Promise<any>>
  ) {
    const origFunc = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const metricFunc = metricScope((metrics) => async () => {
        const t0 = new Date();
        let t1: Date;

        try {
          const result = await origFunc.apply(this, args);
          t1 = new Date();
          return result;
        } catch (error) {
          t1 = new Date();
          throw error;
        } finally {
          const tDelta = Math.abs(t0.valueOf() - t1.valueOf());

          metrics.setNamespace(nameSpace);
          metrics.putDimensions({
            ...dimensions,
            host: os.hostname(),
          });
          metrics.putMetric(`ExecutionTime`, tDelta, unit);
        }
      });

      await metricFunc();
    };
  };
}
