declare module '@capacitor/app' {
  export interface AppState {
    isActive: boolean;
  }
  export const App: {
    addListener(event: string, listener: (state: AppState) => void): Promise<any>;
    exitApp(): Promise<void>;
  };
}

declare module '@capacitor/haptics' {
  export enum ImpactStyle {
    Heavy = 'HEAVY',
    Medium = 'MEDIUM',
    Light = 'LIGHT',
  }
  export enum NotificationType {
    Success = 'SUCCESS',
    Warning = 'WARNING',
    Error = 'ERROR',
  }
  export const Haptics: {
    impact(options: { style: ImpactStyle }): Promise<void>;
    notification(options: { type: NotificationType }): Promise<void>;
    vibrate(): Promise<void>;
  };
}
