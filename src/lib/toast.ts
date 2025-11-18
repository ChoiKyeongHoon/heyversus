type ToastInstance = (typeof import("sonner"))["toast"];

let toastPromise: Promise<ToastInstance> | null = null;

export async function getToast(): Promise<ToastInstance> {
  if (!toastPromise) {
    toastPromise = import("sonner").then((mod) => mod.toast);
  }

  return toastPromise;
}
