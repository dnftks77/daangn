/**
 * 프론트엔드 로깅 유틸리티
 * 환경 변수에 따라 로그 출력을 제어합니다.
 */

// 환경 설정 확인
const isDevelopment = import.meta.env.MODE === 'development';

class Logger {
  private readonly name: string;

  constructor(name = 'App') {
    this.name = name;
  }

  // 디버그 로그: 개발 환경에서만 출력
  debug(...args: any[]): void {
    if (isDevelopment) {
      console.debug(`[${this.name}]`, ...args);
    }
  }

  // 정보 로그: 개발 환경에서만 출력
  info(...args: any[]): void {
    if (isDevelopment) {
      console.info(`[${this.name}]`, ...args);
    }
  }

  // 경고 로그: 항상 출력
  warn(...args: any[]): void {
    console.warn(`[${this.name}]`, ...args);
  }

  // 에러 로그: 항상 출력
  error(...args: any[]): void {
    console.error(`[${this.name}]`, ...args);
  }
}

export function createLogger(name?: string): Logger {
  return new Logger(name);
}

// 기본 로거 인스턴스
export const logger = createLogger();

export default Logger; 