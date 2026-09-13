import { QrWorkspace } from "@/components/crm/qr-workspace";

/**
 * QR codes — for the site, and for each form a visitor can fill in.
 *
 * Its own section rather than a menu in the board: it is used when a flyer is
 * being made, not while leads are being worked, and it has nothing to do with
 * any one of them.
 */
export default function QrCodesPage() {
  return <QrWorkspace />;
}
