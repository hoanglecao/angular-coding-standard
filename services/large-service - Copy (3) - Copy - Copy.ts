import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LargeService {
  constructor(private http: HttpClient) {}

  // Method 1
  async method1(): Promise<any> {
    const data = { key1: 'value1', key2: 'value2', key3: 'value3', key4: 'value4', key5: 'value5' };
    const result = await this.processData(data);
    return this.transformResult(result);
  }

  // Method 2
  async method2(): Promise<any> {
    const data = { key1: 'value1', key2: 'value2', key3: 'value3', key4: 'value4', key5: 'value5' };
    const result = await this.processData(data);
    return this.transformResult(result);
  }

  // Method 3
  async method3(): Promise<any> {
    const data = { key1: 'value1', key2: 'value2', key3: 'value3', key4: 'value4', key5: 'value5' };
    const result = await this.processData(data);
    return this.transformResult(result);
  }

  // Method 4
  async method4(): Promise<any> {
    const data = { key1: 'value1', key2: 'value2', key3: 'value3', key4: 'value4', key5: 'value5' };
    const result = await this.processData(data);
    return this.transformResult(result);
  }

  // Method 5
  async method5(): Promise<any> {
    const data = { key1: 'value1', key2: 'value2', key3: 'value3', key4: 'value4', key5: 'value5' };
    const result = await this.processData(data);
    return this.transformResult(result);
  }

  private async processData(data: any): Promise<any> {
    // Simulate processing with large data structures
    const processedData = {
      originalData: data,
      processedAt: new Date(),
      metadata: {
        version: '1.0.0',
        environment: 'production',
        features: ['feature1', 'feature2', 'feature3', 'feature4', 'feature5'],
        configuration: {
          setting1: 'value1',
          setting2: 'value2',
          setting3: 'value3',
          setting4: 'value4',
          setting5: 'value5'
        }
      }
    };
    return processedData;
  }

  private transformResult(result: any): any {
    return {
      ...result,
      transformed: true,
      transformedAt: new Date(),
      additionalData: {
        field1: 'value1',
        field2: 'value2',
        field3: 'value3',
        field4: 'value4',
        field5: 'value5'
      }
    };
  }
}