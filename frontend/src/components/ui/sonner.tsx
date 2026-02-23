// COMPONENTE DESATIVADO - A pedido do usuário, todos os toasts/balões foram removidos
// Qualquer chamada a toast() será ignorada silenciosamente

// Mock do toast que não faz nada
const noopToast = (..._args: any[]) => ({ id: '', dismiss: () => {}, update: () => {} });
noopToast.success = noopToast;
noopToast.error = noopToast;
noopToast.info = noopToast;
noopToast.warning = noopToast;
noopToast.loading = noopToast;
noopToast.custom = noopToast;
noopToast.message = noopToast;
noopToast.dismiss = () => {};
noopToast.promise = () => Promise.resolve();

const toast = noopToast as any;

// Toaster que não renderiza nada
const Toaster = () => null;

export { Toaster, toast };
