import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { PlatformDialogModal, PlatformDialogConfig, DialogVariant } from '../components/common/PlatformDialogModal';

export interface AlertOptions {
  title?: string;
  message: string;
  variant?: DialogVariant;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
}

interface DialogContextType {
  showAlert: (options: AlertOptions | string) => Promise<void>;
  showConfirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

// Global event handlers so window.alert and window.confirm can trigger platform dialogs
let globalShowAlertHandler: ((options: AlertOptions | string) => Promise<void>) | null = null;
let globalShowConfirmHandler: ((options: ConfirmOptions | string) => Promise<boolean>) | null = null;

export const platformAlert = (options: AlertOptions | string): Promise<void> => {
  if (globalShowAlertHandler) {
    return globalShowAlertHandler(options);
  }
  // Fallback if context not mounted yet
  return new Promise((resolve) => {
    window.alert(typeof options === 'string' ? options : options.message);
    resolve();
  });
};

export const platformConfirm = (options: ConfirmOptions | string): Promise<boolean> => {
  if (globalShowConfirmHandler) {
    return globalShowConfirmHandler(options);
  }
  // Fallback if context not mounted yet
  return Promise.resolve(window.confirm(typeof options === 'string' ? options : options.message));
};

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dialogState, setDialogState] = useState<{
    config: PlatformDialogConfig;
    resolveFn: (value: any) => void;
  } | null>(null);

  const showAlert = (options: AlertOptions | string): Promise<void> => {
    return new Promise((resolve) => {
      const opts = typeof options === 'string' ? { message: options } : options;
      const variant: DialogVariant = opts.variant || (
        opts.message.includes('نجاح') || opts.message.includes('تم') ? 'success' :
        opts.message.includes('فشل') || opts.message.includes('خطأ') ? 'error' : 'info'
      );

      const title = opts.title || (
        variant === 'success' ? 'تمت العملية بنجاح ✨' :
        variant === 'error' ? 'تنبيه من المنصة ⚠️' : 'تنبيه النظام'
      );

      setDialogState({
        config: {
          isOpen: true,
          type: 'ALERT',
          title,
          message: opts.message,
          variant,
          confirmText: 'حسناً، موافق ✨'
        },
        resolveFn: () => resolve()
      });
    });
  };

  const showConfirm = (options: ConfirmOptions | string): Promise<boolean> => {
    return new Promise((resolve) => {
      const opts = typeof options === 'string' ? { message: options } : options;
      setDialogState({
        config: {
          isOpen: true,
          type: 'CONFIRM',
          title: opts.title || 'تأكيد الإجراء من المنصة',
          message: opts.message,
          variant: opts.variant || 'warning',
          confirmText: opts.confirmText || 'تأكيد الإجراء',
          cancelText: opts.cancelText || 'إلغاء'
        },
        resolveFn: (result: boolean) => resolve(result)
      });
    });
  };

  useEffect(() => {
    globalShowAlertHandler = showAlert;
    globalShowConfirmHandler = showConfirm;

    // Intercept native browser alert and confirm so ALL dialogs pop up inside the platform
    const originalAlert = window.alert;
    const originalConfirm = window.confirm;

    window.alert = (msg?: any) => {
      showAlert(String(msg ?? ''));
    };

    window.confirm = (msg?: string) => {
      // Synchronous confirm fallback trigger
      showConfirm(msg || 'هل أنت متأكد؟');
      return false; // Prevent blocking browser thread
    };

    return () => {
      window.alert = originalAlert;
      window.confirm = originalConfirm;
      globalShowAlertHandler = null;
      globalShowConfirmHandler = null;
    };
  }, []);

  const handleConfirm = () => {
    if (dialogState) {
      dialogState.resolveFn(true);
      setDialogState(null);
    }
  };

  const handleCancel = () => {
    if (dialogState) {
      dialogState.resolveFn(false);
      setDialogState(null);
    }
  };

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {dialogState && (
        <PlatformDialogModal
          config={dialogState.config}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </DialogContext.Provider>
  );
};

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};
