import { Resend } from "resend";

let _resend: Resend | null = null;

export const resend: Resend = new Proxy({} as Resend, {
  get(_target, prop, receiver) {
    if (!_resend) {
      _resend = new Resend(process.env.RESEND_API_KEY!);
    }
    return Reflect.get(_resend, prop, receiver);
  },
});

export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "noreply@senro.co";
