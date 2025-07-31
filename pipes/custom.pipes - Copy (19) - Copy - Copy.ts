import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml, SafeUrl } from '@angular/platform-browser';

@Pipe({
  name: 'truncate',
  pure: true
})
export class TruncatePipe implements PipeTransform {
  transform(value: string, limit = 100, completeWords = false, ellipsis = '...'): string {
    if (!value) return '';
    
    if (value.length <= limit) return value;
    
    if (completeWords) {
      const truncated = value.substr(0, limit);
      const lastSpace = truncated.lastIndexOf(' ');
      return lastSpace > 0 ? truncated.substr(0, lastSpace) + ellipsis : truncated + ellipsis;
    }
    
    return value.substr(0, limit) + ellipsis;
  }
}

@Pipe({
  name: 'highlight',
  pure: true
})
export class HighlightPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}
  
  transform(text: string, search: string, className = 'highlight'): SafeHtml {
    if (!text || !search) {
      return this.sanitizer.bypassSecurityTrustHtml(text || '');
    }
    
    const regex = new RegExp(`(${this.escapeRegExp(search)})`, 'gi');
    const highlighted = text.replace(regex, `<span class="${className}">$1</span>`);
    
    return this.sanitizer.bypassSecurityTrustHtml(highlighted);
  }
  
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

@Pipe({
  name: 'safeHtml',
  pure: true
})
export class SafeHtmlPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}
  
  transform(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}

@Pipe({
  name: 'safeUrl',
  pure: true
})
export class SafeUrlPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}
  
  transform(url: string): SafeUrl {
    return this.sanitizer.bypassSecurityTrustUrl(url);
  }
}

@Pipe({
  name: 'fileSize',
  pure: true
})
export class FileSizePipe implements PipeTransform {
  transform(bytes: number, decimals = 2): string {
    if (!bytes || bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

@Pipe({
  name: 'timeAgo',
  pure: false
})
export class TimeAgoPipe implements PipeTransform {
  transform(value: Date | string | number): string {
    if (!value) return '';
    
    const date = new Date(value);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    const intervals = [
      { label: 'year', seconds: 31536000 },
      { label: 'month', seconds: 2592000 },
      { label: 'week', seconds: 604800 },
      { label: 'day', seconds: 86400 },
      { label: 'hour', seconds: 3600 },
      { label: 'minute', seconds: 60 },
      { label: 'second', seconds: 1 }
    ];
    
    for (const interval of intervals) {
      const count = Math.floor(seconds / interval.seconds);
      if (count >= 1) {
        return count === 1 
          ? `1 ${interval.label} ago`
          : `${count} ${interval.label}s ago`;
      }
    }
    
    return 'just now';
  }
}

@Pipe({
  name: 'orderBy',
  pure: false
})
export class OrderByPipe implements PipeTransform {
  transform<T>(array: T[], field: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] {
    if (!array || !field) return array;
    
    return [...array].sort((a, b) => {
      const aValue = a[field];
      const bValue = b[field];
      
      let comparison = 0;
      
      if (aValue > bValue) {
        comparison = 1;
      } else if (aValue < bValue) {
        comparison = -1;
      }
      
      return direction === 'desc' ? comparison * -1 : comparison;
    });
  }
}

@Pipe({
  name: 'filter',
  pure: false
})
export class FilterPipe implements PipeTransform {
  transform<T>(array: T[], searchText: string, fields?: (keyof T)[]): T[] {
    if (!array || !searchText) return array;
    
    const search = searchText.toLowerCase();
    
    return array.filter(item => {
      if (fields && fields.length > 0) {
        return fields.some(field => {
          const value = item[field];
          return value && String(value).toLowerCase().includes(search);
        });
      } else {
        return Object.values(item).some(value => 
          value && String(value).toLowerCase().includes(search)
        );
      }
    });
  }
}

@Pipe({
  name: 'unique',
  pure: false
})
export class UniquePipe implements PipeTransform {
  transform<T>(array: T[], field?: keyof T): T[] {
    if (!array) return array;
    
    if (field) {
      const seen = new Set();
      return array.filter(item => {
        const value = item[field];
        if (seen.has(value)) {
          return false;
        }
        seen.add(value);
        return true;
      });
    } else {
      return [...new Set(array)];
    }
  }
}

@Pipe({
  name: 'groupBy',
  pure: false
})
export class GroupByPipe implements PipeTransform {
  transform<T>(array: T[], field: keyof T): { [key: string]: T[] } {
    if (!array || !field) return {};
    
    return array.reduce((groups, item) => {
      const key = String(item[field]);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {} as { [key: string]: T[] });
  }
}

@Pipe({
  name: 'capitalize',
  pure: true
})
export class CapitalizePipe implements PipeTransform {
  transform(value: string, type: 'first' | 'words' | 'all' = 'first'): string {
    if (!value) return '';
    
    switch (type) {
      case 'first':
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
      case 'words':
        return value.replace(/\b\w/g, char => char.toUpperCase());
      case 'all':
        return value.toUpperCase();
      default:
        return value;
    }
  }
}

@Pipe({
  name: 'mask',
  pure: true
})
export class MaskPipe implements PipeTransform {
  transform(value: string, pattern: string, maskChar = '*'): string {
    if (!value || !pattern) return value;
    
    let result = '';
    let valueIndex = 0;
    
    for (let i = 0; i < pattern.length && valueIndex < value.length; i++) {
      const patternChar = pattern[i];
      
      if (patternChar === '0') {
        // Digit placeholder
        if (/\d/.test(value[valueIndex])) {
          result += value[valueIndex];
          valueIndex++;
        } else {
          break;
        }
      } else if (patternChar === 'A') {
        // Letter placeholder
        if (/[a-zA-Z]/.test(value[valueIndex])) {
          result += value[valueIndex];
          valueIndex++;
        } else {
          break;
        }
      } else if (patternChar === '*') {
        // Any character placeholder
        result += value[valueIndex];
        valueIndex++;
      } else if (patternChar === 'X') {
        // Mask character
        result += maskChar;
        valueIndex++;
      } else {
        // Literal character
        result += patternChar;
      }
    }
    
    return result;
  }
}

@Pipe({
  name: 'phoneNumber',
  pure: true
})
export class PhoneNumberPipe implements PipeTransform {
  transform(value: string, format: 'us' | 'international' = 'us'): string {
    if (!value) return '';
    
    const cleaned = value.replace(/\D/g, '');
    
    if (format === 'us' && cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (format === 'international' && cleaned.length >= 10) {
      const countryCode = cleaned.slice(0, -10);
      const areaCode = cleaned.slice(-10, -7);
      const firstPart = cleaned.slice(-7, -4);
      const secondPart = cleaned.slice(-4);
      
      return countryCode 
        ? `+${countryCode} (${areaCode}) ${firstPart}-${secondPart}`
        : `(${areaCode}) ${firstPart}-${secondPart}`;
    }
    
    return value;
  }
}

@Pipe({
  name: 'creditCard',
  pure: true
})
export class CreditCardPipe implements PipeTransform {
  transform(value: string, maskDigits = true): string {
    if (!value) return '';
    
    const cleaned = value.replace(/\D/g, '');
    
    if (cleaned.length < 13 || cleaned.length > 19) {
      return value;
    }
    
    let formatted = '';
    for (let i = 0; i < cleaned.length; i++) {
      if (i > 0 && i % 4 === 0) {
        formatted += ' ';
      }
      
      if (maskDigits && i >= 4 && i < cleaned.length - 4) {
        formatted += '*';
      } else {
        formatted += cleaned[i];
      }
    }
    
    return formatted;
  }
}

@Pipe({
  name: 'currency',
  pure: true
})
export class CustomCurrencyPipe implements PipeTransform {
  transform(
    value: number,
    currencyCode = 'USD',
    display: 'code' | 'symbol' | 'symbol-narrow' = 'symbol',
    locale = 'en-US'
  ): string {
    if (value === null || value === undefined) return '';
    
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        currencyDisplay: display
      }).format(value);
    } catch (error) {
      console.error('Currency formatting error:', error);
      return `${currencyCode} ${value.toFixed(2)}`;
    }
  }
}

@Pipe({
  name: 'percentage',
  pure: true
})
export class PercentagePipe implements PipeTransform {
  transform(value: number, decimals = 2, suffix = '%'): string {
    if (value === null || value === undefined) return '';
    
    const percentage = (value * 100).toFixed(decimals);
    return `${percentage}${suffix}`;
  }
}

@Pipe({
  name: 'pluralize',
  pure: true
})
export class PluralizePipe implements PipeTransform {
  transform(count: number, singular: string, plural?: string): string {
    if (count === 1) {
      return `${count} ${singular}`;
    } else {
      const pluralForm = plural || `${singular}s`;
      return `${count} ${pluralForm}`;
    }
  }
}

@Pipe({
  name: 'join',
  pure: true
})
export class JoinPipe implements PipeTransform {
  transform<T>(array: T[], separator = ', ', field?: keyof T): string {
    if (!array || !Array.isArray(array)) return '';
    
    if (field) {
      return array.map(item => item[field]).join(separator);
    } else {
      return array.join(separator);
    }
  }
}

@Pipe({
  name: 'reverse',
  pure: false
})
export class ReversePipe implements PipeTransform {
  transform<T>(array: T[]): T[] {
    if (!array || !Array.isArray(array)) return array;
    return [...array].reverse();
  }
}

@Pipe({
  name: 'slice',
  pure: false
})
export class CustomSlicePipe implements PipeTransform {
  transform<T>(array: T[], start: number, end?: number): T[] {
    if (!array || !Array.isArray(array)) return array;
    return array.slice(start, end);
  }
}

@Pipe({
  name: 'default',
  pure: true
})
export class DefaultPipe implements PipeTransform {
  transform<T>(value: T, defaultValue: T): T {
    return value !== null && value !== undefined && value !== '' ? value : defaultValue;
  }
}

@Pipe({
  name: 'keys',
  pure: false
})
export class KeysPipe implements PipeTransform {
  transform(obj: Record<string, any>): string[] {
    if (!obj || typeof obj !== 'object') return [];
    return Object.keys(obj);
  }
}

@Pipe({
  name: 'values',
  pure: false
})
export class ValuesPipe implements PipeTransform {
  transform<T>(obj: Record<string, T>): T[] {
    if (!obj || typeof obj !== 'object') return [];
    return Object.values(obj);
  }
}

@Pipe({
  name: 'entries',
  pure: false
})
export class EntriesPipe implements PipeTransform {
  transform<T>(obj: Record<string, T>): [string, T][] {
    if (!obj || typeof obj !== 'object') return [];
    return Object.entries(obj);
  }
}